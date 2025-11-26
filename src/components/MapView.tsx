import { useEffect, useMemo, useRef, useState } from 'react';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DEFAULT_CENTER = { lat: 48.109, lng: -77.796 };

declare global {
  interface Window {
    google?: any;
  }
}

let googleMapsPromise: Promise<any> | null = null;

function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps ne peut pas être chargé côté serveur.'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!apiKey) {
    return Promise.reject(new Error('Clé Google Maps manquante.'));
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      script.async = true;
      script.onload = () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps non disponible après chargement.'));
        }
      };
      script.onerror = () => reject(new Error('Impossible de charger Google Maps.'));
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

type Marker = {
  lat: number;
  lng: number;
  color?: string;
  title: string;
  description?: string;
};

function buildPin(color: string) {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#111827',
    strokeWeight: 1,
    scale: 1.5,
  };
}

export function MapView({
  markers,
  accent,
  title,
}: {
  markers: Marker[];
  accent: string;
  title: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const center = useMemo(() => DEFAULT_CENTER, []);

  useEffect(() => {
    if (!mapRef.current) return;

    let canceled = false;
    let map: any = null;
    let renderedMarkers: any[] = [];

    setError(null);

    loadGoogleMaps()
      .then((maps) => {
        if (!mapRef.current || canceled) return;

        map = new maps.Map(mapRef.current, {
          center,
          zoom: markers.length > 1 ? 12 : 14,
          mapTypeId: 'satellite',
          disableDefaultUI: true,
          fullscreenControl: false,
        });

        if (markers.length > 1) {
          const bounds = new maps.LatLngBounds();
          markers.forEach((marker) => bounds.extend({ lat: marker.lat, lng: marker.lng }));
          map.fitBounds(bounds, 32);
        }

        renderedMarkers = markers.map((marker) =>
          new maps.Marker({
            position: { lat: marker.lat, lng: marker.lng },
            map,
            title: marker.title,
            icon: buildPin(marker.color ?? accent),
          }),
        );
      })
      .catch((err) => {
        if (!canceled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger la carte.');
        }
      });

    return () => {
      canceled = true;
      renderedMarkers.forEach((marker) => marker.setMap(null));
      if (map) {
        mapRef.current = null;
      }
    };
  }, [accent, center, markers]);

  return (
    <div className="map-shell" style={{ borderColor: accent }}>
      <div ref={mapRef} className="map-canvas" />
      <div className="map-overlay">
        <p className="map-title">{title}</p>
        {markers.length === 0 && <p className="map-hint">Aucun sujet géolocalisé pour ce filtre.</p>}
        {error && <p className="map-error">{error}</p>}
      </div>
    </div>
  );
}

export type MapMarker = Marker;

export default MapView;
