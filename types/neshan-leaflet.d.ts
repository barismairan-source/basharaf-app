// تعریف نوع برای @neshan-maps-platform/leaflet که types رسمی ندارد.
// SDK نشان یک نسخه‌ی تغییریافته‌ی Leaflet است که options اضافه (key, maptype, poi, traffic) را
// در L.map() می‌پذیرد. بقیه‌ی API‌ها با Leaflet استاندارد یکسان است.
declare module '@neshan-maps-platform/leaflet' {
  import type * as L from 'leaflet';
  const nmp: typeof L;
  export = nmp;
}
