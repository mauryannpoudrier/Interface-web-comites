import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';

const DEFAULT_CENTER = { lat: 48.0989, lng: -77.7974 };

export type MapLegendItem = { label: string; color: string };
export type MapMarker = { lat: number; lng: number; color?: string; title: string; label?: string; subjectId?: string; committee?: string; year?: string };

const markerIcon = (color: string) =>
  L.divIcon({ className: 'leaflet-custom-marker', html: `<span class="leaflet-custom-pin" style="background:${color}"></span>`, iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -20] });

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [32, 32] });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
    } else {
      map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);
    }
  }, [map, markers]);
  return null;
}

function PickLocation({ onPickLocation }: { onPickLocation?: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({ click: (event) => onPickLocation?.({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

export default function CommitteeMap({ markers, accent, title, onSelectSujet, onPickLocation, legendItems }: { markers: MapMarker[]; accent: string; title?: string; onSelectSujet?: (sujetId: string) => void; onPickLocation?: (coords: { lat: number; lng: number }) => void; legendItems?: MapLegendItem[] }) {
  return <div className="map-shell" style={{ borderColor: accent }}><MapContainer center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]} zoom={12} className="map-canvas" scrollWheelZoom><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><FitBounds markers={markers} /><PickLocation onPickLocation={onPickLocation} />{markers.map((marker, idx) => <Marker key={`${marker.subjectId ?? marker.title}-${idx}`} position={[marker.lat, marker.lng]} icon={markerIcon(marker.color ?? accent)}><Popup><div className="map-infowindow"><p className="map-pin-label">Sujet {marker.label ?? '—'}</p><h4>{marker.title}</h4>{(marker.committee || marker.year) && <p className="map-hint">{[marker.committee, marker.year].filter(Boolean).join(' · ')}</p>}{marker.subjectId && <button className="map-infowindow-btn" onClick={() => onSelectSujet?.(marker.subjectId as string)}>Voir la demande</button>}</div></Popup></Marker>)}</MapContainer><div className="map-overlay">{title && <p className="map-hint">{title}</p>}{markers.length === 0 && <p className="map-hint">Aucun sujet géolocalisé pour ce filtre.</p>}</div>{legendItems?.length ? <div className="map-legend" aria-label="Légende de la carte">{legendItems.map((item) => <div key={`${item.label}-${item.color}`} className="map-legend-item"><span className="map-legend-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" /><span>{item.label}</span></div>)}</div> : null}</div>;
}
