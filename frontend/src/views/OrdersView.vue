<script setup>
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useOrdersStore } from '../stores/orders';
import OrderCard from '../components/OrderCard.vue';
import NotifyPrompt from '../components/NotifyPrompt.vue';

const orders = useOrdersStore();
onMounted(() => orders.refresh());
</script>

<template>
  <div class="container narrow">
    <h1 class="section-title">{{ $t('orders.title') }}</h1>

    <div v-if="!orders.mine.length" class="card center">
      <p>{{ $t('orders.empty') }}</p>
      <p class="muted">{{ $t('orders.emptyHint') }}</p>
      <br />
      <RouterLink to="/menu" class="btn">{{ $t('cart.toMenu') }}</RouterLink>
    </div>
    <div v-else-if="!orders.ready && !orders.list.length" class="card center muted">{{ $t('common.loading') }}</div>
    <template v-else>
      <NotifyPrompt />
      <div class="list">
        <OrderCard v-for="o in orders.list" :key="o.id" :order="o" />
      </div>
      <p class="muted center auto">{{ $t('orders.auto') }}</p>
    </template>
  </div>
</template>

<style scoped lang="scss">
.narrow { max-width: 640px; }
.list { display: grid; gap: 14px; }
.auto { margin-top: 14px; font-size: 0.85rem; }
</style>
