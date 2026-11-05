<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useOrdersStore } from '../stores/orders';
import OrderCard from '../components/OrderCard.vue';
import NotifyPrompt from '../components/NotifyPrompt.vue';

const props = defineProps({ id: { type: String, required: true } });
const orders = useOrdersStore();

const mine = computed(() => orders.mine.some((m) => m.id === Number(props.id)));
const order = computed(() => orders.data[Number(props.id)]);
onMounted(() => orders.refresh());
</script>

<template>
  <div class="container narrow">
    <h1 class="section-title">{{ $t('order.title', { id }) }}</h1>

    <template v-if="order && mine">
      <NotifyPrompt />
      <OrderCard :order="order" />
      <p class="muted center help">{{ $t('orders.auto') }} · {{ $t('order.help', { phone: '97 212 03 93' }) }}</p>
    </template>
    <div v-else-if="!orders.ready && mine" class="card center muted">{{ $t('common.loading') }}</div>
    <div v-else class="card center"><p class="muted">{{ $t('order.notFound') }}</p></div>

    <div class="actions">
      <RouterLink to="/orders" class="btn ghost">{{ $t('order.all') }}</RouterLink>
      <RouterLink to="/menu" class="btn">{{ $t('order.more') }}</RouterLink>
    </div>
  </div>
</template>

<style scoped lang="scss">
.narrow { max-width: 560px; }
.help { margin-top: 14px; font-size: 0.9rem; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 20px; }
</style>
