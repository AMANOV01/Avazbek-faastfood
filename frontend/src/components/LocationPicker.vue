<script setup>
// Manzilni qo'lda yozish o'rniga xaritadan belgilash.
// Xaritani bosing yoki pinni suring; "Men turgan joy" tugmasi qurilma joylashuvini ko'rsatadi.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { lang, t } from '../i18n';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  modelValue: { type: Object, default: null }, // { lat, lng, address }
  center: { type: Array, default: () => [41.3111, 69.2797] },
});
const emit = defineEmits(['update:modelValue']);

const el = ref(null);
const locating = ref(false);
const note = ref('');
const address = ref(props.modelValue?.address || '');
const resolving = ref(false);
let map;
let marker;
let geoAbort;

// Rasm fayllarisiz chiziladigan pin (bundler bilan Leaflet standart ikonkalari muammo qiladi)
const pinIcon = L.divIcon({
  className: 'avz-pin',
  html: '<svg viewBox="0 0 34 44" width="34" height="44"><path d="M17 43C17 43 2 28 2 16a15 15 0 0 1 30 0c0 12-15 27-15 27z" fill="#d9263a" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>',
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

const fmt = (n) => Number(n).toFixed(5);

// Koordinatadan odam o'qiy oladigan manzil (OpenStreetMap Nominatim). Ishlamasa koordinatalarning o'zi ko'rsatiladi.
async function resolve(lat, lng) {
  geoAbort?.abort();
  geoAbort = new AbortController();
  resolving.value = true;
  let text = '';
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}&accept-language=${lang.value}`;
    const r = await fetch(url, { signal: geoAbort.signal });
    if (r.ok) {
      const d = await r.json();
      text = String(d.display_name || '').split(',').slice(0, 4).join(',').trim();
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  resolving.value = false;
  address.value = text || `${fmt(lat)}, ${fmt(lng)}`;
  emit('update:modelValue', { lat, lng, address: address.value });
}

function place(lat, lng, { zoom } = {}) {
  note.value = '';
  if (!marker) {
    marker = L.marker([lat, lng], { icon: pinIcon, draggable: true, keyboard: false }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      place(p.lat, p.lng);
    });
  } else {
    marker.setLatLng([lat, lng]);
  }
  if (zoom) map.setView([lat, lng], zoom);
  else map.panTo([lat, lng]);
  // Manzil topilguncha koordinatalarni darhol yuboramiz: tugma bosilgach "manzil yo'q" bo'lib qolmasin
  emit('update:modelValue', { lat, lng, address: `${fmt(lat)}, ${fmt(lng)}` });
  resolve(lat, lng);
}

function locate() {
  if (!('geolocation' in navigator)) {
    note.value = t('map.unsupported');
    return;
  }
  locating.value = true;
  note.value = '';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false;
      place(pos.coords.latitude, pos.coords.longitude, { zoom: 17 });
    },
    (err) => {
      locating.value = false;
      note.value = t(err.code === 1 ? 'map.denied' : 'map.unavailable');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  );
}

onMounted(() => {
  const start = props.modelValue ? [props.modelValue.lat, props.modelValue.lng] : props.center;
  map = L.map(el.value, { center: start, zoom: props.modelValue ? 17 : 13, zoomControl: true, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);
  map.on('click', (e) => place(e.latlng.lat, e.latlng.lng));
  if (props.modelValue) place(props.modelValue.lat, props.modelValue.lng, { zoom: 17 });
});
onBeforeUnmount(() => {
  geoAbort?.abort();
  map?.remove();
});
</script>

<template>
  <div class="picker">
    <div class="bar">
      <button type="button" class="btn small" :disabled="locating" @click="locate">
        <AppIcon name="locate" :size="18" />{{ locating ? $t('map.locating') : $t('map.myLocation') }}
      </button>
      <span class="muted help">{{ $t('map.help') }}</span>
    </div>
    <div ref="el" class="map" role="application" :aria-label="$t('map.label')"></div>
    <p v-if="note" class="error">{{ note }}</p>
    <p v-if="modelValue" class="chosen">
      <AppIcon name="pin" :size="18" />
      <span>{{ resolving ? $t('map.resolving') : address }}</span>
    </p>
    <p v-else class="muted chosen none">{{ $t('map.notChosen') }}</p>
  </div>
</template>

<style scoped lang="scss">
.picker { display: flex; flex-direction: column; gap: 8px; }
.bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.help { font-size: 0.82rem; flex: 1; min-width: 160px; }
.map { height: 300px; border-radius: 12px; border: 1px solid var(--line); overflow: hidden; z-index: 0; touch-action: pan-x pan-y; }
.chosen { display: flex; gap: 8px; align-items: flex-start; font-size: 0.92rem; color: var(--text); svg { color: var(--green-bright); margin-top: 2px; } &.none { font-style: italic; } }
@media (max-width: 480px) { .map { height: 260px; } }
</style>

<style lang="scss">
// Tun rejimida xarita ham qorong'ilashadi
:root[data-theme='dark'] .picker .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.9); }
.avz-pin { background: none; border: 0; }
.picker .leaflet-container { font: inherit; }
</style>
