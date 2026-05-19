import { useEffect, useRef, useState } from 'react';

const DEFAULT_CENTER = { lat: 48.0989, lng: -77.7974 };
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script';
const GOOGLE_MAPS_LIBRARIES = ['places', 'marker'] as const;

export type MapLegendItem = { label: string; color: string };
export type MapMarker = { lat: number; lng: number; color?: string; title: string; label?: string; subjectId?: string; committee?: string; year?: string };

type MapState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

const getApiKey = () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';
const getMapId = () => import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim() ?? '';

const buildMarkerPin = (color: string) => {
  const pin = document.createElement('div');
  pin.className = 'gmaps-pin';
  pin.style.background = color;
  return pin;
};

const loadGoogleMapsApi = (apiKey: string) => {
  const existingGoogle = (window as Window & { google?: unknown }).google;
  if (existingGoogle) return Promise.resolve();

  const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&libraries=${GOOGLE_MAPS_LIBRARIES.join(',')}`;

  const staleGoogleScripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src*="maps.googleapis.com/maps/api/js"]')).filter(
    (script) => script.id !== GOOGLE_MAPS_SCRIPT_ID,
  );
  staleGoogleScripts.forEach((script) => script.remove());

  const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    if (existingScript.src !== scriptUrl) {
      existingScript.remove();
    } else {
      return new Promise<void>((resolve, reject) => {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('failed to load')), { once: true });
      });
    }
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('failed to load'));
    document.head.appendChild(script);
  });
};

export default function CommitteeMap({ markers, accent, title, onSelectSujet, onPickLocation, legendItems }: { markers: MapMarker[]; accent: string; title?: string; onSelectSujet?: (sujetId: string) => void; onPickLocation?: (coords: { lat: number; lng: number }) => void; legendItems?: MapLegendItem[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [mapState, setMapState] = useState<MapState>({ status: 'loading' });

  const apiKey = getApiKey();
  const mapId = getMapId();

  useEffect(() => {
    // Temporaire pour vérifier l'injection de l'environnement via Vite.
    console.log('[GoogleMaps] VITE_GOOGLE_MAPS_API_KEY chargé :', apiKey ? `${apiKey.slice(0, 6)}***` : apiKey);

    if (!apiKey) {
      setMapState({ status: 'error', message: 'Google Maps non chargé : VITE_GOOGLE_MAPS_API_KEY est undefined, null ou vide.' });
      return;
    }

    let canceled = false;

    loadGoogleMapsApi(apiKey)
      .then(async () => {
        const googleRef = (window as Window & { google?: any }).google;
        if (!googleRef) throw new Error('google missing');
        await googleRef.maps.importLibrary('maps');
        await googleRef.maps.importLibrary('places');
        await googleRef.maps.importLibrary('marker');

        if (canceled || !mapRef.current) return;

        mapInstanceRef.current = new googleRef.maps.Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: 12,
          mapId: mapId || undefined,
          gestureHandling: 'cooperative',
        });

        infoWindowRef.current = new googleRef.maps.InfoWindow();

        if (onPickLocation) {
          mapInstanceRef.current.addListener('click', (event: any) => {
            if (!event.latLng) return;
            onPickLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() });
          });
        }

        setMapState({ status: 'ready' });
      })
      .catch(() => {
        if (!canceled) {
          setMapState({
            status: 'error',
            message: 'Impossible de charger Google Maps. Vérifiez VITE_GOOGLE_MAPS_API_KEY (clé valide, API JavaScript activée, facturation et restrictions de domaine).',
          });
        }
      });

    return () => {
      canceled = true;
      googleMarkersRef.current.forEach((marker) => {
        marker.map = null;
      });
      googleMarkersRef.current = [];
    };
  }, [apiKey, mapId, onPickLocation]);

  useEffect(() => {
    if (mapState.status !== 'ready' || !mapInstanceRef.current || !infoWindowRef.current) return;
    const googleRef = (window as Window & { google?: any }).google;
    if (!googleRef) return;

    googleMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    googleMarkersRef.current = [];

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;

    if (markers.length === 0) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(12);
      return;
    }

    const bounds = new googleRef.maps.LatLngBounds();

    markers.forEach((marker) => {
      const position = { lat: marker.lat, lng: marker.lng };
      bounds.extend(position);

      const markerView = new googleRef.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: marker.title,
        content: buildMarkerPin(marker.color ?? accent),
      });

      markerView.addListener('click', () => {
        const meta = [marker.committee, marker.year].filter(Boolean).join(' · ');
        const action = marker.subjectId ? `<button class="map-infowindow-btn" data-subject-id="${marker.subjectId}">Voir la demande</button>` : '';
        infoWindow.setContent(`<div class="map-infowindow"><p class="map-pin-label">Sujet ${marker.label ?? '—'}</p><h4>${marker.title}</h4>${meta ? `<p class="map-hint">${meta}</p>` : ''}${action}</div>`);
        infoWindow.open({ anchor: markerView, map });
      });

      googleMarkersRef.current.push(markerView);
    });

    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 32);
    }

    const listener = infoWindow.addListener('domready', () => {
      const button = document.querySelector<HTMLButtonElement>('.map-infowindow-btn[data-subject-id]');
      if (button) {
        button.onclick = () => {
          const subjectId = button.getAttribute('data-subject-id');
          if (subjectId) onSelectSujet?.(subjectId);
        };
      }
    });

    return () => listener.remove();
  }, [accent, mapState.status, markers, onSelectSujet]);

  return (
    <div className="map-shell" style={{ borderColor: accent }}>
      <div ref={mapRef} className="map-canvas" />
      <div className="map-overlay">
        {title && <p className="map-hint">{title}</p>}
        {mapState.status === 'loading' && <p className="map-hint">Chargement de la carte…</p>}
        {mapState.status === 'error' && <p className="map-hint">{mapState.message}</p>}
        {mapState.status === 'ready' && markers.length === 0 && <p className="map-hint">Aucun sujet géolocalisé pour ce filtre.</p>}
      </div>
      {legendItems?.length ? <div className="map-legend" aria-label="Légende de la carte">{legendItems.map((item) => <div key={`${item.label}-${item.color}`} className="map-legend-item"><span className="map-legend-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" /><span>{item.label}</span></div>)}</div> : null}
    </div>
  );
}
