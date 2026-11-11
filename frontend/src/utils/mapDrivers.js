// Xarita "drayverlari": Yandex Maps (kalit bo'lsa) yoki OpenStreetMap/Leaflet (zaxira).
// Ikkalasi ham bir xil interfeys beradi, shuning uchun LocationPicker qaysi xarita ishlayotganini bilmaydi.
//
//   init(el, center, zoom, onClick)   xaritani yaratadi
//   setMarker(lat, lng, onDrag)       pin qo'yadi/suradi (surilganda onDrag(lat, lng))
//   view(lat, lng, zoom) / pan(lat, lng)
//   circle(lat, lng, meters | null)   GPS aniqlik doirasi
//   geocode(lat, lng, lang)           → manzil matni ('' bo'lsa topilmadi)
//   destroy()

const PIN_SVG =
  '<svg viewBox="0 0 34 44" width="34" height="44"><path d="M17 43C17 43 2 28 2 16a15 15 0 0 1 30 0c0 12-15 27-15 27z" fill="#d9263a" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>';

// ---------- Yandex Maps ----------
let yandexLoading;
function loadYandex(key, lang) {
  if (window.ymaps) return new Promise((res) => window.ymaps.ready(() => res(window.ymaps)));
  if (!yandexLoading) {
    yandexLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=${lang === 'en' ? 'en_US' : 'ru_RU'}`;
      s.async = true;
      s.onload = () => window.ymaps.ready(() => resolve(window.ymaps));
      s.onerror = () => reject(new Error('yandex-load'));
      document.head.appendChild(s);
    });
    yandexLoading.catch(() => { yandexLoading = null; });
  }
  return yandexLoading;
}

async function yandexDriver(key, lang) {
  const ymaps = await loadYandex(key, lang);
  let map;
  let pin;
  let ring;
  return {
    name: 'yandex',
    init(el, center, zoom, onClick) {
      map = new ymaps.Map(el, { center, zoom, controls: ['zoomControl'] }, { suppressMapOpenBlock: true });
      map.events.add('click', (e) => {
        const [lat, lng] = e.get('coords');
        onClick(lat, lng);
      });
    },
    setMarker(lat, lng, onDrag) {
      if (!pin) {
        pin = new ymaps.Placemark([lat, lng], {}, { draggable: true, preset: 'islands#redIcon' });
        pin.events.add('dragend', () => {
          const [a, b] = pin.geometry.getCoordinates();
          onDrag(a, b);
        });
        map.geoObjects.add(pin);
      } else {
        pin.geometry.setCoordinates([lat, lng]);
      }
    },
    view: (lat, lng, zoom) => map.setCenter([lat, lng], zoom),
    pan: (lat, lng) => map.panTo([lat, lng]),
    circle(lat, lng, m) {
      if (ring) { map.geoObjects.remove(ring); ring = null; }
      if (m) {
        ring = new ymaps.Circle([[lat, lng], m], {}, { fillColor: '#1d6fd1', fillOpacity: 0.12, strokeColor: '#1d6fd1', strokeWidth: 1, interactivityModel: 'default#transparent' });
        map.geoObjects.add(ring);
      }
    },
    async geocode(lat, lng) {
      try {
        const res = await ymaps.geocode([lat, lng], { results: 1, kind: 'house' });
        const first = res.geoObjects.get(0);
        return first ? String(first.getAddressLine() || '') : '';
      } catch {
        return ''; // kalitda Geocoder yoqilmagan bo'lsa koordinata ko'rsatiladi
      }
    },
    destroy() { map?.destroy(); },
  };
}

// ---------- OpenStreetMap (Leaflet) ----------
async function leafletDriver() {
  const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
  const icon = L.divIcon({ className: 'avz-pin', html: PIN_SVG, iconSize: [34, 44], iconAnchor: [17, 43] });
  let map;
  let marker;
  let ring;
  let abort;
  return {
    name: 'osm',
    init(el, center, zoom, onClick) {
      map = L.map(el, { center, zoom });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(map);
      map.on('click', (e) => onClick(e.latlng.lat, e.latlng.lng));
    },
    setMarker(lat, lng, onDrag) {
      if (!marker) {
        marker = L.marker([lat, lng], { icon, draggable: true, keyboard: false }).addTo(map);
        marker.on('dragend', () => { const p = marker.getLatLng(); onDrag(p.lat, p.lng); });
      } else {
        marker.setLatLng([lat, lng]);
      }
    },
    view: (lat, lng, zoom) => map.setView([lat, lng], zoom),
    pan: (lat, lng) => map.panTo([lat, lng]),
    circle(lat, lng, m) {
      if (ring) { ring.remove(); ring = null; }
      if (m) ring = L.circle([lat, lng], { radius: m, weight: 1, color: '#1d6fd1', fillOpacity: 0.12, interactive: false }).addTo(map);
    },
    async geocode(lat, lng, lang) {
      abort?.abort();
      abort = new AbortController();
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}&accept-language=${lang}`, { signal: abort.signal });
        if (!r.ok) return '';
        const d = await r.json();
        return String(d.display_name || '').split(',').slice(0, 4).join(',').trim();
      } catch (e) {
        return e.name === 'AbortError' ? null : ''; // null: yangi so'rov bilan almashtirildi
      }
    },
    destroy() { abort?.abort(); map?.remove(); },
  };
}

// Kalit berilsa Yandex, bo'lmasa (yoki yuklanmasa) OpenStreetMap
export async function createMapDriver(yandexKey, lang) {
  if (yandexKey) {
    try {
      return await yandexDriver(yandexKey, lang);
    } catch {
      /* Yandex yuklanmadi — zaxira xaritaga o'tamiz */
    }
  }
  return leafletDriver();
}
