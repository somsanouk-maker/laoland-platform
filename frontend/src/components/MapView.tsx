'use client';
import { useEffect, useRef, useState } from 'react';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  price?: string;
  greenBadge?: boolean;
  onClick?: () => void;
}

interface MapViewProps {
  pins?: MapPin[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  cluster?: boolean;
}

const VIENTIANE = { lat: 17.9757, lng: 102.6331 };

declare global {
  interface Window {
    google: any;
    initLaoMap: () => void;
    MarkerClusterer: any;
  }
}

// Module-level singletons so scripts load only once
let gmapsState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
let gmapsCallbacks: Array<(err?: string) => void> = [];

let clustererState: 'idle' | 'loading' | 'ready' = 'idle';
let clustererCallbacks: Array<() => void> = [];

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { resolve(); return; }
    if (gmapsState === 'ready') { resolve(); return; }
    if (gmapsState === 'error') { reject(new Error('Google Maps failed to load')); return; }

    gmapsCallbacks.push((err) => err ? reject(new Error(err)) : resolve());

    if (gmapsState === 'loading') return;
    gmapsState = 'loading';

    if (!apiKey) {
      gmapsState = 'error';
      gmapsCallbacks.forEach((cb) => cb('No API key'));
      gmapsCallbacks = [];
      return;
    }

    window.initLaoMap = () => {
      gmapsState = 'ready';
      gmapsCallbacks.forEach((cb) => cb());
      gmapsCallbacks = [];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initLaoMap&libraries=visualization`;
    script.async = true;
    script.onerror = () => {
      gmapsState = 'error';
      gmapsCallbacks.forEach((cb) => cb('Google Maps script failed'));
      gmapsCallbacks = [];
    };
    document.head.appendChild(script);
  });
}

function loadMarkerClusterer(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return; }
    if (clustererState === 'ready') { resolve(); return; }

    clustererCallbacks.push(resolve);
    if (clustererState === 'loading') return;
    clustererState = 'loading';

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js';
    script.onload = () => {
      clustererState = 'ready';
      clustererCallbacks.forEach((cb) => cb());
      clustererCallbacks = [];
    };
    script.onerror = () => {
      // Graceful fallback — no clustering
      clustererState = 'ready';
      clustererCallbacks.forEach((cb) => cb());
      clustererCallbacks = [];
    };
    document.head.appendChild(script);
  });
}

function makePriceMarker(price: string | undefined, greenBadge: boolean) {
  const color = greenBadge ? '#0F7B6C' : '#F59E0B';
  const label = price ? price.slice(0, 12) : '—';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="36">
    <rect x="1" y="1" rx="8" ry="8" width="108" height="28" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="54" y="18" font-family="sans-serif" font-size="11" font-weight="bold"
          fill="#fff" text-anchor="middle" dominant-baseline="middle">${label}</text>
    <polygon points="50,30 60,30 55,36" fill="${color}"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    // Use proper Google Maps Size/Point — called inside useEffect after Maps loaded
    scaledSize: new window.google.maps.Size(110, 36),
    anchor: new window.google.maps.Point(55, 36),
  };
}

export default function MapView({
  pins = [],
  center = VIENTIANE,
  zoom = 13,
  height = '400px',
  onMapClick,
  cluster = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const onMapClickRef = useRef(onMapClick);
  const [mapError, setMapError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  onMapClickRef.current = onMapClick;

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    Promise.all([loadGoogleMaps(apiKey), loadMarkerClusterer()])
      .then(() => {
        if (cancelled || !window.google?.maps || !containerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(containerRef.current, {
            center,
            zoom,
            mapTypeId: 'roadmap',
            streetViewControl: false,
            fullscreenControl: true,
            mapTypeControl: false,
            zoomControl: true,
            styles: [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            ],
          });

          // Delegate to ref to avoid stale closure + re-initialization
          mapRef.current.addListener('click', (e: any) => {
            onMapClickRef.current?.(e.latLng.lat(), e.latLng.lng());
          });
        }

        // Clear old markers / clusterer
        if (clustererRef.current) {
          clustererRef.current.clearMarkers?.();
          clustererRef.current = null;
        }
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        const useCluster = cluster && !!window.MarkerClusterer;

        const newMarkers = pins.map((pin) => {
          const icon = pin.price
            ? makePriceMarker(pin.price, !!pin.greenBadge)
            : {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: pin.greenBadge ? '#0F7B6C' : '#F59E0B',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
              };

          const marker = new window.google.maps.Marker({
            position: { lat: pin.lat, lng: pin.lng },
            map: useCluster ? null : mapRef.current,
            title: pin.label,
            icon,
          });

          if (pin.price || pin.label) {
            const infoWindow = new window.google.maps.InfoWindow({
              content: `<div style="font-family:sans-serif;padding:6px 8px;min-width:140px;max-width:220px">
                <div style="font-size:11px;color:#888;margin-bottom:2px">${pin.label ?? ''}</div>
                ${pin.price ? `<div style="font-size:15px;font-weight:700;color:#0F7B6C">${pin.price}</div>` : ''}
                ${pin.greenBadge ? '<div style="font-size:11px;color:#0F7B6C;margin-top:2px">✓ Exclusive · Verified</div>' : ''}
              </div>`,
            });
            marker.addListener('click', () => {
              infoWindow.open(mapRef.current, marker);
              pin.onClick?.();
            });
          }
          return marker;
        });

        markersRef.current = newMarkers;

        if (useCluster && newMarkers.length > 0) {
          try {
            clustererRef.current = new window.MarkerClusterer({
              map: mapRef.current,
              markers: newMarkers,
            });
          } catch {
            newMarkers.forEach((m) => m.setMap(mapRef.current));
          }
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setMapError(err.message);
      });

    return () => { cancelled = true; };
  }, [pins, center, zoom, apiKey, cluster]);

  // OSM fallback — no API key or Maps failed to load
  const showOsm = !apiKey || mapError;
  if (showOsm) {
    const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.05},${center.lat - 0.04},${center.lng + 0.05},${center.lat + 0.04}&layer=mapnik${pins.length > 0 ? `&marker=${pins[0].lat},${pins[0].lng}` : `&marker=${center.lat},${center.lng}`}`;
    return (
      <div style={{ height }} className="rounded-xl overflow-hidden border bg-gray-100 relative">
        <iframe src={osmUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Map" />
        {mapError && (
          <div className="absolute top-2 left-2 right-2 bg-amber-50 border border-amber-300 text-amber-800 text-xs px-3 py-1.5 rounded-lg shadow">
            ⚠ Google Maps unavailable — showing OpenStreetMap
          </div>
        )}
      </div>
    );
  }

  return <div ref={containerRef} style={{ height }} className="w-full rounded-xl overflow-hidden border" />;
}
