<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api, money } from '../api';
import AppIcon from '../components/AppIcon.vue';

const props = defineProps({ id: { type: String, required: true } });
const order = ref(null);
const error = ref('');
let timer;

const LABELS = {
  new: ['Qabul qilindi', 'clock'],
  cooking: ['Tayyorlanmoqda', 'fire'],
  delivering: ['Yo\'lda', 'delivery'],
  done: ['Yakunlandi', 'check'],
  cancelled: ['Bekor qilindi', 'close'],
};

async function refresh() {
  try {
    order.value = await api.orderStatus(props.id);
    error.value = '';
    if (['done', 'cancelled'].includes(order.value.status)) clearInterval(timer);
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(() => {
  refresh();
  timer = setInterval(refresh, 10000);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="container narrow">
    <h1 class="section-title">Buyurtma #{{ id }}</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="order" class="card center">
      <div class="big" :class="order.status"><AppIcon :name="LABELS[order.status][1]" :size="64" /></div>
      <h2>{{ LABELS[order.status][0] }}</h2>
      <p class="price">{{ money(order.total) }} so'm</p>
      <p class="muted">Holat har 10 soniyada yangilanadi. Savollar bo'lsa: 97 212 03 93</p>
      <br />
      <RouterLink to="/menu" class="btn ghost">Yana buyurtma</RouterLink>
    </div>
  </div>
</template>

<style scoped lang="scss">
.narrow { max-width: 520px; }
.big { color: var(--green-bright); margin-bottom: 8px; &.cancelled { color: var(--danger); } }
</style>
