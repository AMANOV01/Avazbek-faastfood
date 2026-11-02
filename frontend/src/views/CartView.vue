<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { api, money } from '../api';

const DELIVERY_FEE = 8000;
const cart = useCartStore();
const router = useRouter();

const form = reactive({ name: '', phone: '+998 ', address: '', comment: '', type: 'delivery' });
const busy = ref(false);
const error = ref('');

const fee = computed(() => (form.type === 'delivery' ? DELIVERY_FEE : 0));
const total = computed(() => cart.subtotal + fee.value);

async function submit() {
  error.value = '';
  busy.value = true;
  try {
    const order = await api.createOrder({
      ...form,
      items: cart.lines.map((l) => ({ productId: l.id, qty: l.qty })),
    });
    cart.clear();
    router.push(`/order/${order.id}`);
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="container">
    <h1 class="section-title">Savat</h1>

    <div v-if="!cart.lines.length" class="card center">
      <p class="muted">Savat hozircha bo'sh.</p>
      <br />
      <RouterLink to="/menu" class="btn">Menyuga o'tish</RouterLink>
    </div>

    <div v-else class="layout">
      <div class="card">
        <div v-for="l in cart.lines" :key="l.id" class="line">
          <span>{{ l.name }}</span>
          <span class="ctl">
            <button class="btn small ghost" @click="cart.remove(l.id)">−</button>
            <b>{{ l.qty }}</b>
            <button class="btn small" @click="cart.add(l)">+</button>
          </span>
          <span class="price">{{ money(l.price * l.qty) }}</span>
        </div>
        <hr />
        <div class="sum"><span>Mahsulotlar</span><span class="price">{{ money(cart.subtotal) }}</span></div>
        <div class="sum"><span>Yetkazib berish</span><span class="price">{{ money(fee) }}</span></div>
        <div class="sum total"><span>Jami</span><span class="price">{{ money(total) }} so'm</span></div>
      </div>

      <form class="card" @submit.prevent="submit">
        <div class="field">
          <label>Buyurtma turi</label>
          <select v-model="form.type">
            <option value="delivery">Yetkazib berish</option>
            <option value="pickup">Olib ketish</option>
          </select>
        </div>
        <div class="field"><label>Ismingiz</label><input v-model.trim="form.name" required maxlength="80" /></div>
        <div class="field"><label>Telefon</label><input v-model.trim="form.phone" required type="tel" /></div>
        <div v-if="form.type === 'delivery'" class="field">
          <label>Manzil</label><input v-model.trim="form.address" required maxlength="200" />
        </div>
        <div class="field"><label>Izoh (ixtiyoriy)</label><textarea v-model.trim="form.comment" rows="2" maxlength="300"></textarea></div>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn" :disabled="busy" style="width: 100%">{{ busy ? 'Yuborilmoqda…' : 'Buyurtma berish' }}</button>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; align-items: start; }
.line { display: grid; grid-template-columns: 1fr auto 100px; gap: 10px; align-items: center; padding-block: 8px; .price { text-align: right; } }
.ctl { display: flex; align-items: center; gap: 8px; }
hr { border: none; border-top: 1px solid var(--line); margin-block: 12px; }
.sum { display: flex; justify-content: space-between; padding-block: 3px; &.total { font-size: 1.2rem; font-weight: 600; margin-top: 6px; } }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
</style>
