<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useMenuStore } from '../stores/menu';
import { loc } from '../i18n';
import { promoText, untilText } from '../utils/promo';
import AppIcon from './AppIcon.vue';

const menu = useMenuStore();
const promos = computed(() =>
  menu.livePromos.map((pr) => {
    const p = menu.productById(pr.productId);
    return { ...pr, name: loc(p.names, p.name), category: p.category };
  })
);

const i = ref(0);
const paused = ref(false);
let timer;
watch(() => promos.value.length, (n) => { if (i.value >= n) i.value = 0; });
onMounted(() => {
  timer = setInterval(() => {
    if (!paused.value && promos.value.length > 1) i.value = (i.value + 1) % promos.value.length;
  }, 5000);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <!-- Admin yoqqan aksiyalar saytning eng tepasida hamma ko'radigan banner bo'lib turadi -->
  <section
    v-if="promos.length"
    class="promo"
    aria-live="polite"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <div class="container inner">
      <span class="tagline"><AppIcon name="tag" :size="18" />{{ $t('promo.label') }}</span>
      <RouterLink
        v-for="(pr, k) in promos"
        v-show="k === i"
        :key="pr.id"
        :to="{ path: '/menu', hash: '#' + pr.category }"
        class="text"
      >
        <b>{{ pr.name }}</b>
        <span>{{ promoText(pr) }}</span>
        <small v-if="pr.endsAt">· {{ untilText(pr) }}</small>
      </RouterLink>
      <span v-if="promos.length > 1" class="dots">
        <button
          v-for="(pr, k) in promos"
          :key="pr.id"
          :class="{ on: k === i }"
          :aria-label="pr.name"
          @click="i = k"
        ></button>
      </span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.promo {
  background: linear-gradient(90deg, var(--green), var(--green-bright));
  color: #0b0c0b;
}
.inner { display: flex; align-items: center; gap: 14px; min-height: 44px; padding-block: 6px; }
.tagline {
  display: inline-flex; align-items: center; gap: 6px; flex: none;
  font-family: 'Oswald', sans-serif; font-weight: 700; letter-spacing: 0.12em;
  background: #0b0c0b; color: var(--green-bright); padding: 4px 10px; border-radius: 999px; font-size: 0.85rem;
}
.text {
  flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px;
  animation: fade 0.4s ease; line-height: 1.3;
  b { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.03em; font-size: 1.05rem; }
  small { opacity: 0.75; }
  &:hover { text-decoration: underline; }
}
.dots { display: flex; gap: 6px; flex: none; button { width: 9px; height: 9px; border-radius: 50%; border: 0; background: rgba(0,0,0,.28); padding: 0; &.on { background: #0b0c0b; } } }
@keyframes fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@media (max-width: 560px) {
  .inner { gap: 10px; }
  .text b { font-size: 0.98rem; }
  .text { font-size: 0.9rem; }
  .tagline { padding: 3px 8px; font-size: 0.78rem; }
}
@media (prefers-reduced-motion: reduce) { .text { animation: none; } }
</style>
