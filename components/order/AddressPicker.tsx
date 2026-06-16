'use client';

// این فایل فقط با dynamic(() => import(...), { ssr: false }) لود می‌شود —
// پس import های زیر هرگز روی سرور ارزیابی نمی‌شوند (Leaflet به window نیاز دارد).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import nmp from '@neshan-maps-platform/leaflet';
import { MapPin, Search, X, Check, Loader2 } from 'lucide-react';
import '@neshan-maps-platform/leaflet/dist/leaflet.css';

const TEHRAN_LAT = 35.699739;
const TEHRAN_LNG = 51.338097;

interface SearchResult {
  title: string;
  address: string;
  lat: number;
  lng: number;
}

export interface AddressPickerProps {
  apiKey: string;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (lat: number, lng: number, address: string) => void;
  onClose: () => void;
}

export default function AddressPicker({
  apiKey,
  initialLat,
  initialLng,
  onConfirm,
  onClose,
}: AddressPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const [address, setAddress] = useState('');
  const [currentLat, setCurrentLat] = useState(initialLat ?? TEHRAN_LAT);
  const [currentLng, setCurrentLng] = useState(initialLng ?? TEHRAN_LNG);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!apiKey) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`,
        { headers: { 'Api-Key': apiKey } }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { formatted_address?: string };
      if (data.formatted_address) setAddress(data.formatted_address);
    } catch {
      // silent — آدرس خالی باقی می‌ماند
    } finally {
      setGeocoding(false);
    }
  }, []);

  const moveMarker = useCallback(
    (lat: number, lng: number) => {
      if (!mapRef.current || !markerRef.current) return;
      markerRef.current.setLatLng([lat, lng] as Parameters<typeof markerRef.current.setLatLng>[0]);
      mapRef.current.setView([lat, lng] as Parameters<typeof mapRef.current.setView>[0], mapRef.current.getZoom());
      setCurrentLat(lat);
      setCurrentLng(lng);
      void reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  // مقداردهی اولیه نقشه — فقط یک‌بار اجرا می‌شود (window وجود دارد)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const startLat = initialLat ?? TEHRAN_LAT;
    const startLng = initialLng ?? TEHRAN_LNG;

    // nmp = Leaflet extended با Neshan tiles — options اضافه (key, maptype, poi, traffic) را قبول می‌کند
    const map: LeafletMap = (nmp as unknown as {
      map: (el: HTMLElement, opts: Record<string, unknown>) => LeafletMap;
    }).map(mapContainerRef.current, {
      key: apiKey,
      maptype: 'dreamy',
      poi: true,
      traffic: false,
      zoom: 14,
      center: [startLat, startLng],
    });

    const marker: LeafletMarker = (nmp as unknown as {
      marker: (latlng: [number, number], opts?: Record<string, unknown>) => LeafletMarker;
    }).marker([startLat, startLng], { draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCurrentLat(pos.lat);
      setCurrentLng(pos.lng);
      void reverseGeocode(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      const { lat, lng } = (e as unknown as { latlng: { lat: number; lng: number } }).latlng;
      marker.setLatLng([lat, lng] as Parameters<typeof marker.setLatLng>[0]);
      setCurrentLat(lat);
      setCurrentLng(lng);
      void reverseGeocode(lat, lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // اگر مختصات اولیه داریم، reverse geocode کن
    if (initialLat && initialLng) {
      void reverseGeocode(initialLat, initialLng);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // جستجوی نشان (با debounce ساده)
  useEffect(() => {
    if (!searchTerm.trim() || !apiKey) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://api.neshan.org/v1/search?term=${encodeURIComponent(searchTerm.trim())}&lat=${currentLat}&lng=${currentLng}`,
          { headers: { 'Api-Key': apiKey } }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          items?: { title: string; neighbourhood?: string; region?: string; location?: { x: number; y: number } }[];
        };
        const results: SearchResult[] =
          data.items?.map((item) => ({
            title: item.title ?? '',
            address: [item.neighbourhood, item.region].filter(Boolean).join('، '),
            lat: item.location?.y ?? TEHRAN_LAT,
            lng: item.location?.x ?? TEHRAN_LNG,
          })) ?? [];
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, currentLat, currentLng]);

  function handleSelectResult(result: SearchResult) {
    setSearchTerm(result.title);
    setShowDropdown(false);
    moveMarker(result.lat, result.lng);
  }

  function handleConfirm() {
    onConfirm(currentLat, currentLng, address);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" dir="rtl">
      {/* هدر */}
      <div className="flex shrink-0 items-center justify-between border-b border-stone-100 bg-white px-4 py-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[12.5px] text-stone-500 hover:text-stone-700"
        >
          <X size={15} />
          انصراف
        </button>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-stone-700">
          <MapPin size={14} className="text-stone-400" />
          انتخاب موقعیت روی نقشه
        </span>
        <div className="w-14" />
      </div>

      {/* جستجو */}
      <div className="relative shrink-0 border-b border-stone-100 bg-white px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            placeholder="جستجو در نقشه…"
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pr-8 pl-8 text-[12.5px] focus:border-stone-300 focus:outline-none focus:bg-white"
          />
          {searching && (
            <Loader2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
          )}
        </div>

        {showDropdown && searchResults.length > 0 && (
          <ul className="absolute left-3 right-3 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg">
            {searchResults.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="flex w-full flex-col px-4 py-2.5 text-right hover:bg-stone-50"
                >
                  <span className="text-[12.5px] font-medium text-stone-700">{r.title}</span>
                  {r.address && (
                    <span className="text-[11px] text-stone-400">{r.address}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* نقشه — flex-1 تا تمام فضای موجود را پر کند */}
      <div ref={mapContainerRef} className="flex-1" />

      {/* آدرس و تأیید */}
      <div className="shrink-0 border-t border-stone-100 bg-white px-4 py-3">
        <div className="mb-3 min-h-[2.5rem] rounded-lg bg-stone-50 px-3 py-2">
          {geocoding ? (
            <span className="flex items-center gap-1.5 text-[12px] text-stone-400">
              <Loader2 size={12} className="animate-spin" />
              در حال دریافت آدرس…
            </span>
          ) : address ? (
            <p className="text-[12.5px] leading-relaxed text-stone-700">{address}</p>
          ) : (
            <p className="text-[12px] text-stone-400">
              روی نقشه کلیک کنید یا مارکر را بکشید تا آدرس بارگذاری شود
            </p>
          )}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!address || geocoding}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-[13px] text-white disabled:opacity-50"
        >
          <Check size={15} />
          تأیید موقعیت
        </button>
      </div>
    </div>
  );
}
