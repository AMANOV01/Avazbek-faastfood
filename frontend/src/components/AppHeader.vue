<script setup>
import { RouterLink } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useThemeStore } from '../stores/theme';
import AppLogo from './AppLogo.vue';
import AppIcon from './AppIcon.vue';

const cart = useCartStore();
const theme = useThemeStore();
</script>

<template>
  <header>
    <div class="container bar">
      <nav>
        <RouterLink to="/">Bosh sahifa</RouterLink>
        <RouterLink to="/menu">Menyu</RouterLink>
      </nav>
      <RouterLink to="/" aria-label="AVAZBEK LAVASH"><AppLogo /></RouterLink>
      <div class="right">
        <button
          class="btn small ghost icon"
          :aria-label="theme.mode === 'dark' ? 'Kunduzgi mavzuga o\'tish' : 'Tungi mavzuga o\'tish'"
          :title="theme.mode === 'dark' ? 'Kunduzgi mavzu' : 'Tungi mavzu'"
          @click="theme.toggle()"
        >
          <AppIcon :name="theme.mode === 'dark' ? 'sun' : 'moon'" :size="20" />
        </button>
        <RouterLink to="/cart" class="cart btn small ghost">
          <AppIcon name="cart" :size="18" /> Savat
          <span v-if="cart.count" class="badge">{{ cart.count }}</span>
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
header {
  position: sticky; top: 0; z-index: 10;
  background: var(--header-bg); backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding-block: 10px; }
nav { display: flex; gap: 18px; a { color: var(--muted); &.router-link-exact-active, &:hover { color: var(--green-bright); } } }
.right { justify-self: end; display: flex; gap: 8px; align-items: center; }
.badge {
  background: var(--green); color: var(--on-green); border-radius: 999px;
  min-width: 22px; height: 22px; display: grid; place-items: center; font-size: 0.8rem; font-weight: 700;
}
@media (max-width: 560px) { nav a:first-child { display: none; } .bar { grid-template-columns: auto 1fr auto; gap: 12px; } }
</style>
