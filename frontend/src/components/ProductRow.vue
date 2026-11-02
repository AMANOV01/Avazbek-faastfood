<script setup>
import { computed } from 'vue';
import { useCartStore } from '../stores/cart';
import { money } from '../api';

const props = defineProps({ product: { type: Object, required: true } });
const cart = useCartStore();
const qty = computed(() => cart.qtyOf(props.product.id));
</script>

<template>
  <div class="row">
    <span class="name">{{ product.name }}</span>
    <span class="dots" aria-hidden="true"></span>
    <span class="price">{{ money(product.price) }}</span>
    <div class="ctl">
      <template v-if="qty">
        <button class="btn small ghost" @click="cart.remove(product.id)" aria-label="Kamaytirish">−</button>
        <b>{{ qty }}</b>
        <button class="btn small" @click="cart.add(product)" aria-label="Ko'paytirish">+</button>
      </template>
      <button v-else class="btn small" @click="cart.add(product)">Qo'shish</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.row { display: flex; align-items: center; gap: 10px; padding-block: 9px; }
.name { white-space: nowrap; }
.dots { flex: 1; border-bottom: 2px dotted var(--dots); transform: translateY(4px); min-width: 12px; }
.ctl { display: flex; align-items: center; gap: 8px; min-width: 112px; justify-content: flex-end; b { min-width: 18px; text-align: center; } }
@media (max-width: 520px) { .name { white-space: normal; } }
</style>
