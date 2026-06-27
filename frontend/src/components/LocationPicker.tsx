'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface LocationPickerProps {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const [pinned, setPinned] = useState(!!lat && !!lng);

  function handleMapClick(newLat: number, newLng: number) {
    onChange(newLat.toFixed(6), newLng.toFixed(6));
    setPinned(true);
  }

  const pins = pinned && lat && lng ? [{
    id: 'pick',
    lat: Number(lat),
    lng: Number(lng),
    label: 'ທີ່ຕັ້ງທີ່ດິນ',
    greenBadge: true,
  }] : [];

  const center = lat && lng ? { lat: Number(lat), lng: Number(lng) } : { lat: 17.9757, lng: 102.6331 };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          Latitude
          <input
            className="border rounded-lg px-3 py-2 w-full mt-1 font-mono text-sm"
            value={lat}
            onChange={(e) => onChange(e.target.value, lng)}
            placeholder="17.9757"
          />
        </label>
        <label className="block text-sm">
          Longitude
          <input
            className="border rounded-lg px-3 py-2 w-full mt-1 font-mono text-sm"
            value={lng}
            onChange={(e) => onChange(lat, e.target.value)}
            placeholder="102.6331"
          />
        </label>
      </div>

      <div className="relative">
        <MapView
          pins={pins}
          center={center}
          zoom={15}
          height="280px"
          onMapClick={handleMapClick}
          cluster={false}
        />
        {!pinned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 border rounded-xl px-4 py-3 text-sm text-center shadow-sm">
              <MapPin size={20} className="mx-auto text-brand mb-1" />
              <p className="font-semibold">ກົດໃສ່ແຜນທີ່ເພື່ອປັກໝຸດ</p>
              <p className="text-xs text-gray-400">Click map to pin location</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
