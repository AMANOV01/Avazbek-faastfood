<script setup>
// Buyurtma berishdan oldin to'lov usuli: naxd yoki karta (karta bo'lsa — O'zbekiston kartalari)
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { money } from '../api';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'confirm']);

const CARDS = [
  { id: 'uzcard', name: 'Uzcard' },
  { id: 'humo', name: 'Humo' },
];
const method = ref('');
const card = ref('');
const dialog = ref(null);
let opener = null;

const ready = () => method.value === 'cash' || (method.value === 'card' && card.value);
const pick = (m) => {
  method.value = m;
  if (m === 'cash') card.value = '';
};
const confirm = () => ready() && emit('confirm', { payMethod: method.value, payCard: card.value });
const onKey = (e) => {
  if (e.key === 'Escape' && !props.busy) emit('close');
  // Fokus oyna ichida qolsin (Tab)
  if (e.key === 'Tab' && dialog.value) {
    const f = [...dialog.value.querySelectorAll('button:not([disabled]), input:not([disabled])')];
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
};

watch(
  () => props.open,
  async (v) => {
    if (v) {
      opener = document.activeElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
      await nextTick();
      dialog.value?.querySelector('input')?.focus();
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    }
  }
);
onBeforeUnmount(() => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="backdrop" @mousedown.self="!busy && $emit('close')">
      <div ref="dialog" class="sheet" role="dialog" aria-modal="true" aria-labelledby="pay-title">
        <header>
          <h2 id="pay-title" class="display">{{ $t('pay.title') }}</h2>
          <button class="btn small ghost icon" type="button" :aria-label="$t('common.close')" :disabled="busy" @click="$emit('close')">
            <AppIcon name="close" :size="18" />
          </button>
        </header>

        <fieldset class="opts">
          <legend class="sr">{{ $t('pay.title') }}</legend>
          <label class="opt" :class="{ on: method === 'cash' }">
            <input type="radio" name="pay" value="cash" :checked="method === 'cash'" @change="pick('cash')" />
            <AppIcon name="cash" :size="26" />
            <span><b>{{ $t('pay.cash') }}</b><small class="muted">{{ $t('pay.cashHint') }}</small></span>
          </label>
          <label class="opt" :class="{ on: method === 'card' }">
            <input type="radio" name="pay" value="card" :checked="method === 'card'" @change="pick('card')" />
            <AppIcon name="card" :size="26" />
            <span><b>{{ $t('pay.card') }}</b><small class="muted">{{ $t('pay.cardHint') }}</small></span>
          </label>
        </fieldset>

        <fieldset v-if="method === 'card'" class="cards">
          <legend>{{ $t('pay.chooseCard') }}</legend>
          <label v-for="c in CARDS" :key="c.id" class="cardopt" :class="[c.id, { on: card === c.id }]">
            <input v-model="card" type="radio" name="card" :value="c.id" />
            <span class="badge">{{ c.name }}</span>
            <AppIcon v-if="card === c.id" name="check" :size="18" />
          </label>
        </fieldset>

        <div class="foot">
          <div class="sum"><span>{{ $t('cart.total') }}</span><span class="price">{{ money(total) }} {{ $t('som') }}</span></div>
          <button class="btn" type="button" :disabled="!ready() || busy" style="width: 100%" @click="confirm">
            {{ busy ? $t('cart.submitting') : $t('pay.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(5, 10, 20, 0.6); display: grid; place-items: center; padding: 16px; backdrop-filter: blur(3px); }
.sheet {
  width: min(440px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto; background: var(--panel); color: var(--text);
  border: 1px solid var(--line); border-radius: 18px; padding: 18px; box-shadow: 0 20px 60px var(--shadow);
  animation: pop 0.18s ease-out;
}
@keyframes pop { from { opacity: 0; transform: translateY(14px) scale(0.98); } }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; h2 { font-size: 1.35rem; color: var(--green-bright); } }
fieldset { border: 0; min-width: 0; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.opts { display: grid; gap: 10px; }
.opt {
  display: flex; align-items: center; gap: 14px; padding: 14px; border: 2px solid var(--line); border-radius: 14px; cursor: pointer; background: var(--input-bg);
  transition: border-color 0.15s, box-shadow 0.15s;
  input { position: absolute; opacity: 0; pointer-events: none; }
  span { display: flex; flex-direction: column; gap: 2px; }
  small { font-size: 0.82rem; line-height: 1.3; }
  svg { color: var(--green-bright); }
  &.on { border-color: var(--green-bright); box-shadow: 0 0 0 4px var(--glow); }
  &:has(input:focus-visible) { outline: 2px solid var(--green-bright); outline-offset: 2px; }
}
.cards { margin-top: 14px; legend { color: var(--muted); font-size: 0.9rem; margin-bottom: 8px; } display: grid; grid-template-columns: 1fr 1fr; gap: 10px; legend { grid-column: 1 / -1; } }
.cardopt {
  position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px; border: 2px solid var(--line); border-radius: 14px; cursor: pointer; background: var(--input-bg);
  input { position: absolute; opacity: 0; pointer-events: none; }
  .badge { font-family: 'Oswald', sans-serif; font-size: 1.25rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
  &.uzcard .badge { color: #1d6fd1; }
  &.humo .badge { color: #0a9aa8; }
  svg { color: var(--green-bright); }
  &.on { border-color: var(--green-bright); box-shadow: 0 0 0 4px var(--glow); }
  &:has(input:focus-visible) { outline: 2px solid var(--green-bright); outline-offset: 2px; }
}
.foot { margin-top: 18px; display: grid; gap: 12px; }
.sum { display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 600; }
</style>
