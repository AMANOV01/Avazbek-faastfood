<script setup>
import { nextTick, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useMenuStore } from '../stores/menu';
import { useCartStore } from '../stores/cart';
import { money } from '../api';
import { loc } from '../i18n';
import ProductRow from '../components/ProductRow.vue';

const menu = useMenuStore();
const cart = useCartStore();
const route = useRoute();

async function scrollToHash() {
  await nextTick();
  if (route.hash) document.querySelector(route.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
watch(() => [menu.loaded, route.hash], scrollToHash, { immediate: true });
</script>

<template>
  <div class="container">
    <h1 class="section-title">{{ $t('menu.title') }}</h1>
    <p v-if="menu.error" class="error">{{ $t('home.loadError', { e: menu.error }) }}</p>

    <div class="grid">
      <section v-for="c in menu.categories" :id="c.id" :key="c.id" class="cat">
        <template v-if="menu.byCategory(c.id).length">
          <h2 class="section-title">
            <img :src="`/images/${c.image}.jpg`" :alt="loc(c.names, c.name)" class="thumb" loading="lazy" />
            {{ loc(c.names, c.name) }}
          </h2>
          <ProductRow v-for="p in menu.byCategory(c.id)" :key="p.id" :product="p" />
        </template>
      </section>
    </div>

    <RouterLink v-if="cart.count" to="/cart" class="btn floating">
      {{ $t('menu.cartBar', { n: cart.count, sum: money(cart.subtotal) }) }}
    </RouterLink>
  </div>
</template>

<style scoped lang="scss">
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 0 48px; }
.cat { scroll-margin-top: 90px; .section-title { font-size: 1.6rem; margin-top: 28px; } }
.thumb { height: 54px; width: 72px; object-fit: contain; border-radius: 8px; background: #000; flex: none; }
.floating {
  position: fixed; bottom: calc(18px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); z-index: 20;
  box-shadow: 0 8px 30px var(--shadow); max-width: calc(100vw - 24px); text-align: center; white-space: nowrap; font-size: 0.95rem;
}
@media (max-width: 900px) {
  .floating { bottom: calc(70px + env(safe-area-inset-bottom)); }   // pastki navigatsiya ustida
  .cat .section-title { font-size: 1.35rem; }
  .thumb { height: 44px; width: 58px; }
}
</style>
