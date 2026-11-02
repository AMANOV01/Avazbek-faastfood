<script setup>
import { onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useMenuStore } from './stores/menu';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';

const menu = useMenuStore();
const route = useRoute();
onMounted(() => menu.load());
</script>

<template>
  <!-- Admin sahifa alohida: oddiy sayt sarlavhasi va pastki qismisiz -->
  <RouterView v-if="route.meta.admin" />
  <template v-else>
    <AppHeader />
    <main>
      <RouterView />
    </main>
    <AppFooter />
  </template>
</template>

<style lang="scss">
main { min-height: 70vh; padding-bottom: 60px; }
</style>
