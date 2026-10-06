import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, LocateFixed, RefreshCw, MapPin } from 'lucide-react';
import { Language } from '../../types';
import { isTH } from './shared';

export type LatLng = { lat: number; lng: number };

interface Props {
  value: LatLng | null;
  onChange?: (v: LatLng) => void;
  /** Called with a readable address after the pin moves (OpenStreetMap reverse lookup) */
  onAddress?: (address: string) => void;
  radius?: number;           // draws the allowed area around the pin
  extra?: (LatLng & { color?: string; label?: string })[];  // read-only dots (e.g. clock-in points)
  readOnly?: boolean;
  height?: number;
  lang: Language;
}

const pinIcon = (color = '#630330') => L.divIcon({
  className: '',
  iconSize: [30, 40],
  iconAnchor: [15, 38],
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 39s13-13.2 13-23.5C28 7.5 22.2 2 15 2S2 7.5 2 15.5C2 25.8 15 39 15 39z" fill="${color}" stroke="#fff" stroke-width="2.5"/><circle cx="15" cy="15.5" r="5" fill="#D4AF37"/></svg>`,
});

const THAILAND: LatLng = { lat: 6.87, lng: 101.25 }; // Pattani area, the faculty's home

const MapPicker: React.FC<Props> = ({ value, onChange, onAddress, radius, extra = [], readOnly, height = 280, lang }) => {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const extraLayer = useRef<L.LayerGroup | null>(null);
  const cb = useRef({ onChange, onAddress });
  cb.current = { onChange, onAddress };
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [busy, setBusy] = useState<'search' | 'gps' | null>(null);
  const [err, setErr] = useState('');
  const th = isTH(lang);

  const reverse = async (p: LatLng) => {
    if (!cb.current.onAddress) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}&accept-language=${th ? 'th' : 'en'}`);
      const j = await r.json();
      if (j?.display_name) cb.current.onAddress?.(j.display_name);
    } catch { /* address lookup is optional */ }
  };

  const place = (p: LatLng, fromUser: boolean) => {
    if (!map.current) return;
    if (!marker.current) {
      marker.current = L.marker([p.lat, p.lng], { icon: pinIcon(), draggable: !readOnly }).addTo(map.current);
      marker.current.on('dragend', () => {
        const ll = marker.current!.getLatLng();
        const np = { lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) };
        cb.current.onChange?.(np);
        reverse(np);
      });
    } else marker.current.setLatLng([p.lat, p.lng]);
    if (fromUser) { cb.current.onChange?.(p); reverse(p); }
  };

  // Create the map once
  useEffect(() => {
    if (!el.current || map.current) return;
    const start = value || THAILAND;
    const m = L.map(el.current, { center: [start.lat, start.lng], zoom: value ? 16 : 9, scrollWheelZoom: false, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
    extraLayer.current = L.layerGroup().addTo(m);
    if (!readOnly) m.on('click', (e: L.LeafletMouseEvent) => place({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }, true));
    map.current = m;
    // The map may mount inside a container that is still sizing itself
    setTimeout(() => m.invalidateSize(), 150);
    return () => { m.remove(); map.current = null; marker.current = null; circle.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the value from outside
  useEffect(() => {
    if (!map.current) return;
    if (value) {
      place(value, false);
      const cur = map.current.getCenter();
      if (Math.abs(cur.lat - value.lat) > 0.002 || Math.abs(cur.lng - value.lng) > 0.002) map.current.setView([value.lat, value.lng], Math.max(map.current.getZoom(), 16));
    }
    if (value && radius) {
      if (!circle.current) circle.current = L.circle([value.lat, value.lng], { radius, color: '#630330', weight: 2, fillColor: '#D4AF37', fillOpacity: 0.15 }).addTo(map.current);
      else { circle.current.setLatLng([value.lat, value.lng]); circle.current.setRadius(radius); }
    } else if (circle.current) { circle.current.remove(); circle.current = null; }
  }, [value?.lat, value?.lng, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const g = extraLayer.current;
    if (!g) return;
    g.clearLayers();
    extra.forEach(p => {
      if (p.lat == null || p.lng == null) return;
      L.circleMarker([p.lat, p.lng], { radius: 6, color: '#fff', weight: 2, fillColor: p.color || '#0ea5e9', fillOpacity: 1 })
        .bindTooltip(p.label || '', { direction: 'top' }).addTo(g);
    });
  }, [JSON.stringify(extra)]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy('search'); setErr(''); setResults([]);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=th,my&accept-language=${th ? 'th' : 'en'}&q=${encodeURIComponent(q.trim())}`);
      const j = await r.json();
      const list = (Array.isArray(j) ? j : []).map((x: any) => ({ name: x.display_name, lat: +(+x.lat).toFixed(6), lng: +(+x.lon).toFixed(6) }));
      if (!list.length) setErr(th ? 'ไม่พบสถานที่ ลองพิมพ์ชื่ออื่น หรือแตะบนแผนที่เพื่อปักหมุดเอง' : 'No match. Try another name, or tap the map to drop a pin.');
      setResults(list);
    } catch { setErr(th ? 'ค้นหาไม่สำเร็จ' : 'Search failed'); } finally { setBusy(null); }
  };

  const gps = () => {
    if (!navigator.geolocation) { setErr(th ? 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง' : 'Location is not available on this device'); return; }
    setBusy('gps'); setErr('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setBusy(null);
        const p = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
        place(p, true);
        map.current?.setView([p.lat, p.lng], 17);
      },
      () => { setBusy(null); setErr(th ? 'อ่านตำแหน่งไม่ได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์' : 'Could not read your location. Please allow location access.'); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-2">
          <form onSubmit={search} className="flex-1 flex items-center gap-1 h-11 pl-3 pr-1 rounded-xl border border-[#e6d9c4] dark:border-white/10 bg-white dark:bg-white/[0.03]">
            <Search size={16} className="text-[#b3a0a8] shrink-0" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={th ? 'ค้นหาชื่อหน่วยงานหรือที่อยู่' : 'Search a place or address'} className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-[#2a0a17] dark:text-white placeholder:text-[#b3a0a8]" />
            <button type="submit" disabled={busy === 'search'} className="h-9 px-3 rounded-lg text-[13px] text-[#630330] dark:text-[#e8cf7a] hover:bg-[#630330]/[0.06]">{busy === 'search' ? <RefreshCw size={15} className="animate-spin" /> : (th ? 'ค้นหา' : 'Search')}</button>
          </form>
          <button type="button" onClick={gps} disabled={busy === 'gps'} className="h-11 px-4 rounded-xl border border-[#e6d9c4] dark:border-white/10 bg-white dark:bg-white/[0.03] text-[13.5px] text-[#630330] dark:text-[#e8cf7a] inline-flex items-center justify-center gap-2 hover:border-[#630330] transition">
            {busy === 'gps' ? <RefreshCw size={15} className="animate-spin" /> : <LocateFixed size={16} />}{th ? 'ใช้ตำแหน่งปัจจุบัน' : 'Use my location'}
          </button>
        </div>
      )}
      {results.length > 0 && (
        <ul className="rounded-xl border border-[#efe4d2] dark:border-white/10 bg-white dark:bg-[#1c0c14] divide-y divide-[#f3ebdf] dark:divide-white/5 overflow-hidden">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => { place({ lat: r.lat, lng: r.lng }, true); map.current?.setView([r.lat, r.lng], 17); setResults([]); }}
                className="w-full text-left px-3.5 py-2.5 text-[13px] text-[#4a2a37] dark:text-slate-200 hover:bg-[#faf6ef] dark:hover:bg-white/5 flex items-start gap-2">
                <MapPin size={14} className="shrink-0 mt-0.5 text-[#630330] dark:text-[#e8cf7a]" /><span className="line-clamp-2">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {err && <p className="text-[12px] text-rose-600 dark:text-rose-300">{err}</p>}
      <div ref={el} style={{ height }} className="w-full rounded-2xl overflow-hidden border border-[#efe4d2] dark:border-white/10 z-0 isolate" />
      {!readOnly && <p className="text-[11.5px] font-light text-[#8d7480] dark:text-slate-400">{th ? 'แตะบนแผนที่เพื่อปักหมุด หรือลากหมุดเพื่อปรับตำแหน่ง' : 'Tap the map to drop a pin, or drag the pin to adjust it.'}</p>}
    </div>
  );
};

export default MapPicker;
