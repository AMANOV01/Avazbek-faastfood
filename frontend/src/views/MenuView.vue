<script setup>
import { nextTick, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useMenuStore } from '../stores/menu';
import { useCartStore } from '../stores/cart';
import { money } from '../api';
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
    <h1 class="section-title">Menyu</h1>
    <p v-if="menu.error" class="error">Menyuni yuklab bo'lmadi: {{ menu.error }}</p>

    <div class="grid">
      <section v-for="c in menu.categories" :id="c.id" :key="c.id" class="cat">
        <h2 class="section-title">
          <img :src="`/images/${c.image}.jpg`" :alt="c.name" class="thumb" loading="lazy" />
          {{ c.name }}
        </h2>
        <ProductRow v-for="p in menu.byCategory(c.id)" :key="p.id" :product="p" />
      </section>
    </div>

    <RouterLink v-if="cart.count" to="/cart" class="btn floating">
      Savat · {{ cart.count }} ta · {{ money(cart.subtotal) }} so'm
    </RouterLink>
  </div>
</template>

<style scoped lang="scss">
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 0 48px; }
.cat { scroll-margin-top: 80px; .section-title { font-size: 1.6rem; margin-top: 28px; } }
.thumb { height: 54px; width: 72px; object-fit: contain; border-radius: 8px; background: #000; flex: none; }
.floating { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); z-index: 20; box-shadow: 0 8px 30px var(--shadow); }
@media (max-width: 420px) { .grid { grid-template-columns: 1fr; } }
</style>
