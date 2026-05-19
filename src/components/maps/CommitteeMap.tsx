import { divIcon } from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

const DEFAULT_CENTER: [number, number] = [48.0989, -77.7974];

export type MapLegendItem = { label: string; color: string };
export type MapMarker = {
  lat: number;
  lng: number;
  color?: string;
  title: string;
  label?: string;
  subjectId?: string;
  committee?: string;
  year?: string;
  sessionNumber?: string;
  resolutionOrComment?: string;
};

function FitToMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (!markers.length) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
      return;
    }

    map.fitBounds(markers.map((marker) => [marker.lat, marker.lng] as [number, number]), { padding: [24, 24] });
  }, [map, markers]);

  return null;
}

const getPinIcon = (color: string) =>
  divIcon({
    className: 'leaflet-custom-pin-wrapper',
    html: `<span class="leaflet-custom-pin" style="background:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });

export default function CommitteeMap({ markers, accent, title, onSelectSujet, onPickLocation, legendItems }: { markers: MapMarker[]; accent: string; title?: string; onSelectSujet?: (sujetId: string) => void; onPickLocation?: (coords: { lat: number; lng: number }) => void; legendItems?: MapLegendItem[] }) {
  return (
    <div className="map-shell" style={{ borderColor: accent }}>
      <MapContainer
        className="map-canvas"
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom
        whenReady={(event) => {
          if (onPickLocation) {
            event.target.on('click', (leafletEvent: { latlng: { lat: number; lng: number } }) => {
              onPickLocation({ lat: leafletEvent.latlng.lat, lng: leafletEvent.latlng.lng });
            });
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToMarkers markers={markers} />
        {markers.map((marker, index) => (
          <Marker key={`${marker.subjectId ?? marker.title}-${index}`} position={[marker.lat, marker.lng]} icon={getPinIcon(marker.color ?? accent)}>
            <Popup>
              <div className="map-infowindow">
                <h4>{marker.title}</h4>
                <p className="map-hint">{[marker.committee, marker.year].filter(Boolean).join(' · ')}</p>
                {marker.sessionNumber ? <p className="map-hint">Séance: {marker.sessionNumber}</p> : null}
                {marker.resolutionOrComment ? <p className="map-hint">No: {marker.resolutionOrComment}</p> : null}
                {marker.subjectId ? (
                  <button type="button" className="map-infowindow-btn" onClick={() => onSelectSujet?.(marker.subjectId!)}>
                    Voir la fiche
                  </button>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-overlay">
        {title && <p className="map-hint">{title}</p>}
        {markers.length === 0 && <p className="map-hint">Aucun sujet géolocalisé pour ce filtre.</p>}
      </div>
      {legendItems?.length ? <div className="map-legend" aria-label="Légende de la carte">{legendItems.map((item) => <div key={`${item.label}-${item.color}`} className="map-legend-item"><span className="map-legend-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" /><span>{item.label}</span></div>)}</div> : null}
    </div>
  );
}
