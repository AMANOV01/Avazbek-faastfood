<script setup>
import { computed } from 'vue';
import { money } from '../api';
import { formatDate, loc } from '../i18n';
import AppIcon from './AppIcon.vue';

const props = defineProps({ order: { type: Object, required: true } });

const ICONS = { new: 'clock', cooking: 'fire', delivering: 'delivery', done: 'check', cancelled: 'close' };
// Olib ketishda "yo'lda" bosqichi yo'q
const steps = computed(() => (props.order.type === 'delivery' ? ['new', 'cooking', 'delivering', 'done'] : ['new', 'cooking', 'done']));
const current = computed(() => steps.value.indexOf(props.order.status));
const discount = computed(() => props.order.items.reduce((s, l) => s + ((l.basePrice ?? l.price) - l.price) * l.qty, 0));
</script>

<template>
  <article class="card order" :class="order.status">
    <header>
      <div>
        <h2 class="display">#{{ order.id }}</h2>
        <small class="muted">{{ formatDate(order.createdAt) }} · {{ $t(order.type === 'delivery' ? 'order.delivery' : 'order.pickup') }}</small>
      </div>
      <span class="chip" :class="order.status"><AppIcon :name="ICONS[order.status]" :size="16" />{{ $t(`status.${order.status}`) }}</span>
    </header>

    <ol v-if="order.status !== 'cancelled'" class="steps" :style="{ '--n': steps.length }">
      <li v-for="(s, i) in steps" :key="s" :class="{ done: i < current, now: i === current }">
        <span class="mark"><AppIcon v-if="i <= current" :name="i < current || s === 'done' ? 'check' : ICONS[s]" :size="14" /></span>
        <span class="lbl">{{ $t(`status.${s}`) }}</span>
      </li>
    </ol>

    <ul class="items">
      <li v-for="l in order.items" :key="l.productId">
        <span>{{ l.qty }} × {{ loc(l.names, l.name) }}</span>
        <span class="price">{{ money(l.price * l.qty) }}</span>
      </li>
    </ul>
    <div class="sum" v-if="discount > 0"><span>{{ $t('cart.discount') }}</span><span class="price">−{{ money(discount) }}</span></div>
    <div class="sum" v-if="order.deliveryFee"><span>{{ $t('cart.delivery') }}</span><span class="price">{{ money(order.deliveryFee) }}</span></div>
    <div class="sum total"><span>{{ $t('cart.total') }}</span><span class="price">{{ money(order.total) }} {{ $t('som') }}</span></div>
  </article>
</template>

<style scoped lang="scss">
.order header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; h2 { font-size: 1.5rem; color: var(--green-bright); } }
.chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; font-size: 0.85rem; font-weight: 600;
  background: var(--glow); color: var(--green-bright); border: 1px solid var(--green); white-space: nowrap;
  &.cancelled { color: var(--danger); border-color: var(--danger); background: transparent; }
}
.order.cancelled { opacity: 0.85; }

.steps { list-style: none; display: grid; grid-template-columns: repeat(var(--n), 1fr); margin-bottom: 16px; }
.steps li {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; font-size: 0.78rem; color: var(--muted);
  &:not(:first-child)::before { content: ''; position: absolute; top: 13px; right: 50%; width: 100%; height: 2px; background: var(--line); }
  &.done::before, &.now::before { background: var(--green); }
  &.done, &.now { color: var(--text); }
  &.now .lbl { color: var(--green-bright); font-weight: 700; }
}
.mark { position: relative; z-index: 1; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--panel); border: 2px solid var(--line); color: var(--on-green); }
.done .mark, .now .mark { background: var(--green); border-color: var(--green); }
.now .mark { box-shadow: 0 0 0 5px var(--glow); }

.items { list-style: none; border-top: 1px solid var(--line); padding-top: 10px; li { display: flex; justify-content: space-between; gap: 12px; padding-block: 3px; } }
.sum { display: flex; justify-content: space-between; padding-block: 3px; color: var(--muted); &.total { color: var(--text); font-size: 1.15rem; font-weight: 600; margin-top: 6px; } }
@media (max-width: 400px) { .steps li { font-size: 0.7rem; } }
</style>
