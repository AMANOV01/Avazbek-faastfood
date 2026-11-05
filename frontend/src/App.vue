<script setup>
import { onMounted, onUnmounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useMenuStore } from './stores/menu';
import { useOrdersStore } from './stores/orders';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import BottomNav from './components/BottomNav.vue';
import PromoBanner from './components/PromoBanner.vue';
import ToastHost from './components/ToastHost.vue';

const menu = useMenuStore();
const orders = useOrdersStore();
const route = useRoute();
let timer;

onMounted(() => {
  menu.load();
  orders.start();
  // Admin yangi mahsulot yoki aksiya qo'shsa, ochiq turgan saytda ham ko'rinadi
  timer = setInterval(() => !document.hidden && menu.reload(), 60000);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <!-- Admin sahifa alohida: oddiy sayt sarlavhasi, banner va pastki qismisiz -->
  <RouterView v-if="route.meta.admin" />
  <template v-else>
    <PromoBanner />
    <AppHeader />
    <main>
      <RouterView />
    </main>
    <AppFooter />
    <BottomNav />
  </template>
  <ToastHost />
</template>

<style lang="scss">
main { min-height: 70vh; padding-bottom: 60px; }
@media (max-width: 900px) {
  // kontent pastki navigatsiya paneli tagida qolib ketmasligi uchun
  #app { padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
}
</style>
