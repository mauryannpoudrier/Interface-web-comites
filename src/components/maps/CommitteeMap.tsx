import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useMemo, useState } from 'react';

const DEFAULT_CENTER = { lat: 48.1002, lng: -77.7828 };

export type MapLegendItem = {
  label: string;
  color: string;
};

export type MapMarker = {
  lat: number;
  lng: number;
  color?: string;
  title: string;
  label?: string;
  description?: string;
  subjectId?: string;
};

function buildPin(color: string) {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#111827',
    strokeWeight: 1,
    scale: 1.5,
    anchor: new google.maps.Point(12, 24),
  };
}

export default function CommitteeMap({
  markers,
  accent,
  title,
  onSelectSujet,
  onPickLocation,
  legendItems,
}: {
  markers: MapMarker[];
  accent: string;
  title?: string;
  onSelectSujet?: (sujetId: string) => void;
  onPickLocation?: (coords: { lat: number; lng: number }) => void;
  legendItems?: MapLegendItem[];
}) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').toString().trim();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'committee-map-loader',
    googleMapsApiKey: apiKey,
  });

  const center = useMemo(() => DEFAULT_CENTER, []);

  if (!apiKey) {
    return <p className="map-error">Google Maps indisponible : clé API manquante (VITE_GOOGLE_MAPS_API_KEY).</p>;
  }

  if (loadError) {
    return <p className="map-error">Impossible de charger Google Maps pour le moment.</p>;
  }

  if (!isLoaded) {
    return <p className="map-error">Chargement de la carte…</p>;
  }

  return (
    <div className="map-shell" role="region" aria-label={title || 'Carte des sujets'}>
      <GoogleMap
        mapContainerClassName="map-canvas"
        center={center}
        zoom={markers.length > 1 ? 12 : 14}
        options={{
          mapTypeId: 'satellite',
          disableDefaultUI: true,
          fullscreenControl: false,
        }}
        onClick={(event) => {
          if (!onPickLocation || !event.latLng) return;
          onPickLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() });
        }}
      >
        {markers.map((marker, index) => (
          <Marker
            key={`${marker.subjectId ?? marker.title}-${marker.lat}-${marker.lng}-${index}`}
            position={{ lat: marker.lat, lng: marker.lng }}
            title={marker.label ? `Sujet ${marker.label}` : marker.title}
            icon={buildPin(marker.color ?? accent)}
            onClick={() => {
              if (marker.subjectId && onSelectSujet) {
                setSelectedMarker(marker);
                return;
              }
              setSelectedMarker(marker);
            }}
          />
        ))}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="map-infowindow">
              <p className="map-pin-label">Sujet {selectedMarker.label ?? '—'}</p>
              <h4>{selectedMarker.title}</h4>
              {selectedMarker.subjectId && onSelectSujet && (
                <button
                  type="button"
                  className="map-infowindow-btn"
                  onClick={() => onSelectSujet(selectedMarker.subjectId as string)}
                >
                  Voir la demande
                </button>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {legendItems?.length ? (
        <div className="map-legend" aria-label="Légende de la carte">
          {legendItems.map((item) => (
            <div className="map-legend-item" key={item.label}>
              <span className="map-legend-dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
