<script setup>
import { RouterLink } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useThemeStore } from '../stores/theme';
import { useOrdersStore } from '../stores/orders';
import AppLogo from './AppLogo.vue';
import AppIcon from './AppIcon.vue';
import LangSwitch from './LangSwitch.vue';

const cart = useCartStore();
const theme = useThemeStore();
const orders = useOrdersStore();
</script>

<template>
  <header>
    <div class="container bar">
      <RouterLink to="/" class="logo-link" aria-label="AVAZBEK LAVASH"><AppLogo /></RouterLink>

      <nav class="main-nav" aria-label="Asosiy">
        <RouterLink to="/">{{ $t('nav.home') }}</RouterLink>
        <RouterLink to="/menu">{{ $t('nav.menu') }}</RouterLink>
        <RouterLink to="/orders" class="with-badge">
          {{ $t('nav.orders') }}
          <span v-if="orders.activeCount" class="dot">{{ orders.activeCount }}</span>
        </RouterLink>
      </nav>

      <div class="right">
        <LangSwitch />
        <button
          class="btn small ghost icon"
          :aria-label="theme.mode === 'dark' ? $t('theme.toLight') : $t('theme.toDark')"
          :title="theme.mode === 'dark' ? $t('theme.toLight') : $t('theme.toDark')"
          @click="theme.toggle()"
        >
          <AppIcon :name="theme.mode === 'dark' ? 'sun' : 'moon'" :size="20" />
        </button>
        <!-- Admin tugmasi savatdan oldin; xodimlar uchun alohida oynada ochiladi -->
        <a href="/admin" target="_blank" rel="noopener" class="btn small ghost admin-link" :title="$t('nav.admin')">
          <AppIcon name="lock" :size="18" /><span class="label">{{ $t('nav.admin') }}</span>
        </a>
        <RouterLink to="/cart" class="cart btn small ghost" :aria-label="$t('nav.cart')">
          <AppIcon name="cart" :size="18" /><span class="label">{{ $t('nav.cart') }}</span>
          <span v-if="cart.count" class="badge">{{ cart.count }}</span>
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
header {
  position: sticky; top: 0; z-index: 30;
  background: var(--header-bg); backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
  padding-top: env(safe-area-inset-top);
}
.bar { display: flex; align-items: center; gap: 24px; padding-block: 10px; }
.logo-link { flex: none; }
.main-nav {
  display: flex; gap: 22px; flex: 1;
  a { color: var(--muted); padding-block: 6px; &.router-link-exact-active, &:hover { color: var(--green-bright); } }
}
.with-badge { display: inline-flex; align-items: center; gap: 6px; }
.dot, .badge {
  background: var(--green); color: var(--on-green); border-radius: 999px; min-width: 20px; height: 20px;
  padding-inline: 5px; display: inline-grid; place-items: center; font-size: 0.75rem; font-weight: 700;
}
.right { margin-left: auto; display: flex; gap: 8px; align-items: center; }

@media (max-width: 900px) {
  .main-nav { display: none; }   // pastki navigatsiya paneli ishlatiladi
  .bar { gap: 10px; }
}
@media (max-width: 560px) {
  .logo-link :deep(.name) { font-size: 1.4rem; }
  .logo-link :deep(.sub) { font-size: 0.68rem; }
  .right { gap: 6px; }
  .label { display: none; }      // faqat ikonka (Admin, Savat)
  .admin-link, .cart { padding-inline: 9px; }
  .cart { position: relative; }
  .cart .badge { position: absolute; top: -7px; right: -7px; }
}
@media (max-width: 400px) {
  .right { gap: 4px; }
  .bar { gap: 6px; }
  .logo-link :deep(.name) { font-size: 1.2rem; }
  .right :deep(.code) { display: none; }   // tor ekranda faqat globus ikonkasi
  .right :deep(.btn.small) { padding-inline: 8px; min-width: 38px; }
}
</style>
