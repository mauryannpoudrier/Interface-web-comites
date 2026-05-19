import { useEffect, useMemo, useRef, useState } from 'react';
import { googleMapsApiKey, googleMapsLibraries, isGoogleMapsConfigured } from '../config';

const DEFAULT_CENTER = { lat: 48.109, lng: -77.796 };
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-javascript-api';
const GOOGLE_MAPS_CALLBACK_NAME = '__initGoogleMaps';

declare global {
  interface Window {
    google?: typeof google;
    gm_authFailure?: () => void;
    [GOOGLE_MAPS_CALLBACK_NAME]?: () => void;
  }
}

type GoogleMapsNamespace = typeof google.maps;

let googleMapsPromise: Promise<GoogleMapsNamespace> | null = null;

function getGoogleMapsHelpMessage(reason: string) {
  return `Google Maps indisponible (${reason}). Vérifiez la clé API, la facturation Google Cloud, les APIs Maps JavaScript / Places / Geocoding et les restrictions de domaine.`;
}

function loadGoogleMaps(): Promise<GoogleMapsNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps ne peut pas être chargé côté serveur.'));
  }

  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  if (!isGoogleMapsConfigured) {
    return Promise.reject(new Error('Clé Google Maps absente. Ajoutez VITE_GOOGLE_MAPS_API_KEY dans votre environnement (.env.local).'));
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise<GoogleMapsNamespace>((resolve, reject) => {
      const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
      let timeoutId = 0;

      const cleanup = () => {
        window.clearTimeout(timeoutId);
      };

      const onReady = () => {
        cleanup();
        if (window.google?.maps?.Map) {
          resolve(window.google.maps);
          return;
        }
        googleMapsPromise = null;
        reject(new Error(getGoogleMapsHelpMessage('constructeur Map indisponible')));
      };

      const onFailure = (reason: string) => {
        cleanup();
        googleMapsPromise = null;
        reject(new Error(getGoogleMapsHelpMessage(reason)));
      };

      timeoutId = window.setTimeout(() => onFailure('délai dépassé'), 15000);
      window.gm_authFailure = () => onFailure("échec d'authentification");
      window[GOOGLE_MAPS_CALLBACK_NAME] = onReady;

      if (existingScript) {
        existingScript.addEventListener('load', onReady, { once: true });
        existingScript.addEventListener('error', () => onFailure('échec réseau'), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.async = true;
      script.defer = true;

      const params = new URLSearchParams({
        key: googleMapsApiKey,
        v: 'weekly',
        loading: 'async',
        callback: GOOGLE_MAPS_CALLBACK_NAME,
      });

      if (googleMapsLibraries.length > 0) {
        params.set('libraries', googleMapsLibraries.join(','));
      }

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.onerror = () => onFailure('échec réseau');
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

type LegendItem = {
  label: string;
  color: string;
};

type Marker = {
  lat: number;
  lng: number;
  color?: string;
  title: string;
  label?: string;
  description?: string;
  subjectId?: string;
};

function buildPin(color: string): google.maps.Icon {
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

export function MapView({ markers, accent, title, onSelectSujet, onPickLocation, legendItems }: { markers: Marker[]; accent: string; title?: string; onSelectSujet?: (sujetId: string) => void; onPickLocation?: (coords: { lat: number; lng: number }) => void; legendItems?: LegendItem[]; }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const mapsRef = useRef<GoogleMapsNamespace | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const renderedMarkersRef = useRef<google.maps.Marker[]>([]);
  const pickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const center = useMemo(() => DEFAULT_CENTER, []);

  useEffect(() => {
    if (!mapRef.current) return;

    let canceled = false;
    setError(null);

    loadGoogleMaps()
      .then((maps) => {
        if (!mapRef.current || canceled) return;

        mapsRef.current = maps;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center,
            zoom: markers.length > 1 ? 12 : 14,
            mapTypeId: 'satellite',
            disableDefaultUI: true,
            fullscreenControl: false,
          });
        }

        if (!infoWindowRef.current) {
          infoWindowRef.current = new maps.InfoWindow();
        }

        setIsMapReady(true);
      })
      .catch((err) => {
        if (!canceled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger la carte.');
          setIsMapReady(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [center, markers.length]);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapInstanceRef.current;
    if (!maps || !map || !isMapReady) return;

    renderedMarkersRef.current.forEach((marker) => {
      maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    });

    renderedMarkersRef.current = markers.map((marker) => {
      const googleMarker = new maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map,
        title: marker.label ? `Sujet ${marker.label}` : marker.title,
        icon: buildPin(marker.color ?? accent),
      });

      if (onSelectSujet && marker.subjectId) {
        googleMarker.addListener('click', () => {
          if (!infoWindowRef.current) {
            onSelectSujet(marker.subjectId as string);
            return;
          }

          const labelText = marker.label ?? '—';
          const safeTitle = marker.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const content = `<div class="map-infowindow"><p class="map-pin-label">Sujet ${labelText}</p><h4>${safeTitle}</h4><button id="voir-demande" class="map-infowindow-btn">Voir la demande</button></div>`;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open({ anchor: googleMarker, map });

          maps.event.addListenerOnce(infoWindowRef.current as google.maps.MVCObject, 'domready', () => {
            const btn = document.getElementById('voir-demande');
            btn?.addEventListener('click', () => onSelectSujet(marker.subjectId as string), { once: true });
          });
        });
      }

      return googleMarker;
    });

    if (markers.length > 1) {
      const bounds = new maps.LatLngBounds();
      markers.forEach((marker) => bounds.extend({ lat: marker.lat, lng: marker.lng }));
      map.fitBounds(bounds, 32);
    } else if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(14);
    } else {
      map.setCenter(center);
      map.setZoom(12);
    }

    return () => {
      renderedMarkersRef.current.forEach((marker) => marker.setMap(null));
      renderedMarkersRef.current = [];
    };
  }, [accent, center, isMapReady, markers, onSelectSujet]);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapInstanceRef.current;
    if (!maps || !map || !isMapReady) return;

    if (pickListenerRef.current) {
      maps.event.removeListener(pickListenerRef.current);
      pickListenerRef.current = null;
    }

    if (onPickLocation) {
      pickListenerRef.current = map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        onPickLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });
    }

    return () => {
      if (pickListenerRef.current) {
        maps.event.removeListener(pickListenerRef.current);
        pickListenerRef.current = null;
      }
    };
  }, [isMapReady, onPickLocation]);

  return (
    <div className="map-shell" style={{ borderColor: accent }}>
      <div ref={mapRef} className="map-canvas" />
      <div className="map-overlay">
        {title && <span className="sr-only">{title}</span>}
        {markers.length === 0 && <p className="map-hint">Aucun sujet géolocalisé pour ce filtre.</p>}
        {error && <p className="map-error">{error}</p>}
      </div>
      {legendItems && legendItems.length > 0 && (
        <div className="map-legend" aria-label="Légende de la carte">
          {legendItems.map((item) => (
            <div key={`${item.label}-${item.color}`} className="map-legend-item">
              <span className="map-legend-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type MapMarker = Marker;
export type MapLegendItem = LegendItem;

export default MapView;
