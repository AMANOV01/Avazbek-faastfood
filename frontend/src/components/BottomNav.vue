<script setup>
import { RouterLink } from 'vue-router';
import { useOrdersStore } from '../stores/orders';
import AppIcon from './AppIcon.vue';

const orders = useOrdersStore();
</script>

<!-- Telefon va planshetda pastda: bosh sahifa, menyu, buyurtmalarim -->
<template>
  <nav class="bottom" aria-label="Asosiy">
    <RouterLink to="/"><AppIcon name="home" :size="22" /><span>{{ $t('nav.home') }}</span></RouterLink>
    <RouterLink to="/menu"><AppIcon name="menu" :size="22" /><span>{{ $t('nav.menu') }}</span></RouterLink>
    <RouterLink to="/orders">
      <span class="ico"><AppIcon name="receipt" :size="22" /><i v-if="orders.activeCount" class="dot">{{ orders.activeCount }}</i></span>
      <span>{{ $t('nav.orders') }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped lang="scss">
.bottom {
  display: none; position: fixed; inset: auto 0 0 0; z-index: 30;
  background: var(--header-bg); backdrop-filter: blur(12px); border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom);
  a {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px 7px;
    color: var(--muted); font-size: 0.72rem; min-height: 56px; justify-content: center;
    &.router-link-exact-active { color: var(--green-bright); }
  }
  span { line-height: 1.15; text-align: center; }
}
.ico { position: relative; display: inline-flex; }
.dot {
  position: absolute; top: -6px; right: -10px; background: var(--green); color: var(--on-green); font-style: normal;
  border-radius: 999px; min-width: 17px; height: 17px; display: grid; place-items: center; font-size: 0.68rem; font-weight: 700;
}
@media (max-width: 900px) { .bottom { display: flex; } }
</style>
