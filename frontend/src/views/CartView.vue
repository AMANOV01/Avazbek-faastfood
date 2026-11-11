<script setup>
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useMenuStore } from '../stores/menu';
import { useOrdersStore } from '../stores/orders';
import { api, money } from '../api';
import { lang, loc, t } from '../i18n';
import { getSubscription } from '../utils/push';
import { promosOf, promoShort } from '../utils/promo';
import AppIcon from '../components/AppIcon.vue';
import PayModal from '../components/PayModal.vue';

// Xarita (Leaflet) faqat yetkazib berish tanlanganda yuklanadi
const LocationPicker = defineAsyncComponent(() => import('../components/LocationPicker.vue'));

const cart = useCartStore();
const menu = useMenuStore();
const orders = useOrdersStore();
const router = useRouter();

const form = reactive({ name: '', phone: '+998 ', comment: '', type: 'delivery' });
const place = ref(null); // xaritadan belgilangan joy: { lat, lng, address }
const busy = ref(false);
const error = ref('');
const payOpen = ref(false);

// Promokod
const codeInput = ref('');
const applied = ref(null); // { code, discount }
const codeBusy = ref(false);
const codeError = ref('');

const fee = computed(() => (form.type === 'delivery' ? menu.deliveryFee : 0));
const codeDiscount = computed(() => Math.min(applied.value?.discount || 0, cart.subtotal));
const total = computed(() => cart.subtotal - codeDiscount.value + fee.value);

// Savat yoki telefon o'zgarsa, chegirma qaytadan tekshirilishi kerak (promokod telefon bo'yicha bir martalik)
watch(() => [cart.subtotal, form.phone], () => { applied.value = null; });
watch(place, (p) => { if (p) error.value = ''; });

const cartItems = () => cart.lines.map((l) => ({ productId: l.id, qty: l.qty }));

async function applyCode() {
  codeError.value = '';
  if (!codeInput.value.trim()) return;
  codeBusy.value = true;
  try {
    const r = await api.checkCode({ code: codeInput.value, phone: form.phone, items: cartItems() });
    applied.value = { code: r.code, discount: r.discount };
  } catch (e) {
    applied.value = null;
    codeError.value = e.message;
  } finally {
    codeBusy.value = false;
  }
}
function clearCode() {
  applied.value = null;
  codeInput.value = '';
  codeError.value = '';
}

// "Yana 1 ta qo'shsangiz -10%" — keyingi aksiya bosqichi haqida eslatma
function nextPromo(line) {
  const pr = promosOf(line.id, menu.promos).find((p) => p.minQty > line.qty);
  return pr ? { n: pr.minQty - line.qty, d: promoShort(pr) } : null;
}

// 1-qadam: forma to'g'ri to'ldirilgan bo'lsa to'lov usuli oynasi ochiladi
function review() {
  error.value = '';
  if (form.type === 'delivery' && !place.value) {
    error.value = t('err.location');
    return;
  }
  payOpen.value = true;
}

// 2-qadam: to'lov usuli tanlandi — buyurtma yuboriladi
async function submit({ payMethod }) {
  error.value = '';
  busy.value = true;
  try {
    // Ruxsat so'rovi buyurtmani kutdirmaydi: u parallel ketadi, javob kelgach buyurtmaga ulanadi
    const subP = getSubscription({ ask: true });
    const delivery = form.type === 'delivery';
    const order = await api.createOrder({
      ...form,
      ...(delivery ? { lat: place.value.lat, lng: place.value.lng, address: place.value.address } : {}),
      payMethod,
      paid: payMethod === 'card', // kartada: mijoz o'tkazganini tasdiqladi (admin pul tushganini tekshiradi)
      promoCode: applied.value?.code || '',
      lang: lang.value,
      items: cartItems(),
    });
    orders.remember(order);
    subP.then((sub) => orders.attachTo(order, sub));
    cart.clear();
    payOpen.value = false;
    router.push(`/order/${order.id}`);
  } catch (e) {
    payOpen.value = false;
    error.value = e.message;
    if (e.code?.startsWith('code_')) { applied.value = null; codeError.value = e.message; }
    if (e.code === 'bad_item') menu.reload();
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="container">
    <h1 class="section-title">{{ $t('cart.title') }}</h1>

    <div v-if="!cart.detail.length" class="card center">
      <p class="muted">{{ $t('cart.empty') }}</p>
      <br />
      <RouterLink to="/menu" class="btn">{{ $t('cart.toMenu') }}</RouterLink>
    </div>

    <div v-else class="layout">
      <div class="card">
        <div v-for="l in cart.detail" :key="l.id" class="line">
          <div class="who">
            <span>{{ loc(l.product.names, l.product.name) }}</span>
            <small v-if="l.unit < l.base" class="promo-on">{{ $t('promo.applied') }}: <s>{{ money(l.base) }}</s> → {{ money(l.unit) }}</small>
            <small v-else-if="nextPromo(l)" class="promo-next">{{ $t('promo.more', nextPromo(l)) }}</small>
          </div>
          <span class="ctl">
            <button class="btn small ghost" :aria-label="$t('common.dec')" @click="cart.remove(l.id)">−</button>
            <b>{{ l.qty }}</b>
            <button class="btn small" :aria-label="$t('common.inc')" @click="cart.add(l.product)">+</button>
          </span>
          <span class="price">{{ money(l.total) }}</span>
        </div>
        <hr />
        <div class="sum"><span>{{ $t('cart.items') }}</span><span class="price">{{ money(cart.subtotal + cart.discount) }}</span></div>
        <div v-if="cart.discount" class="sum"><span>{{ $t('cart.discount') }}</span><span class="price">−{{ money(cart.discount) }}</span></div>
        <div v-if="codeDiscount" class="sum code-on"><span>{{ $t('code.label') }} {{ applied.code }}</span><span class="price">−{{ money(codeDiscount) }}</span></div>
        <div class="sum"><span>{{ $t('cart.delivery') }}</span><span class="price">{{ money(fee) }}</span></div>
        <div class="sum total"><span>{{ $t('cart.total') }}</span><span class="price">{{ money(total) }} {{ $t('som') }}</span></div>
      </div>

      <form class="card" @submit.prevent="review">
        <div class="field">
          <label>{{ $t('cart.type') }}</label>
          <select v-model="form.type">
            <option value="delivery">{{ $t('cart.typeDelivery') }}</option>
            <option value="pickup">{{ $t('cart.typePickup') }}</option>
          </select>
        </div>
        <div class="field"><label>{{ $t('cart.name') }}</label><input v-model.trim="form.name" required maxlength="80" autocomplete="name" /></div>
        <div class="field"><label>{{ $t('cart.phone') }}</label><input v-model.trim="form.phone" required type="tel" autocomplete="tel" inputmode="tel" /></div>
        <div v-if="form.type === 'delivery'" class="field">
          <label>{{ $t('cart.address') }}</label>
          <LocationPicker v-model="place" :center="menu.brand?.mapCenter || undefined" :yandex-key="menu.brand?.yandexKey || ''" :google-key="menu.brand?.googleKey || ''" />
        </div>
        <div class="field"><label>{{ $t('cart.comment') }}</label><textarea v-model.trim="form.comment" rows="2" maxlength="300"></textarea></div>

        <div class="field codebox">
          <label for="promo-code">{{ $t('code.label') }}</label>
          <div v-if="applied" class="applied">
            <AppIcon name="ticket" :size="18" /><b>{{ applied.code }}</b><span class="muted">−{{ money(codeDiscount) }} {{ $t('som') }}</span>
            <button type="button" class="btn small ghost" @click="clearCode">{{ $t('code.remove') }}</button>
          </div>
          <div v-else class="row">
            <input id="promo-code" v-model.trim="codeInput" :placeholder="$t('code.placeholder')" maxlength="20" autocapitalize="characters" autocomplete="off" spellcheck="false" @keydown.enter.prevent="applyCode" />
            <button type="button" class="btn small" :disabled="codeBusy || !codeInput" @click="applyCode">{{ codeBusy ? '…' : $t('code.apply') }}</button>
          </div>
          <p v-if="codeError" class="error">{{ codeError }}</p>
          <small v-else-if="!applied" class="muted">{{ $t('code.hint') }}</small>
        </div>
        <p class="muted hint">{{ $t('cart.notifyHint') }}</p>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn" :disabled="busy" style="width: 100%">{{ $t('cart.submit') }}</button>
      </form>
    </div>

    <PayModal :open="payOpen" :total="total" :busy="busy" :card="menu.brand?.payCard || null" @close="payOpen = false" @confirm="submit" />
  </div>
</template>

<style scoped lang="scss">
.layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; align-items: start; }
.line { display: grid; grid-template-columns: 1fr auto 100px; gap: 10px; align-items: center; padding-block: 8px; .price { text-align: right; } }
.who { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; small { font-size: 0.8rem; line-height: 1.3; } }
.promo-on { color: var(--green-bright); font-weight: 600; s { color: var(--muted); font-weight: 400; } }
.promo-next { color: var(--green-bright); opacity: 0.85; }
.ctl { display: flex; align-items: center; gap: 8px; }
hr { border: none; border-top: 1px solid var(--line); margin-block: 12px; }
.sum { display: flex; justify-content: space-between; gap: 12px; padding-block: 3px; &.total { font-size: 1.2rem; font-weight: 600; margin-top: 6px; } }
.hint { font-size: 0.85rem; margin-bottom: 12px; }
.code-on { color: var(--green-bright); }
.codebox { .row, .applied { display: flex; gap: 8px; align-items: center; } .row input { flex: 1; text-transform: uppercase; letter-spacing: 0.08em; }
  .applied { padding: 8px 12px; border: 1px dashed var(--green-bright); border-radius: 10px; color: var(--green-bright); flex-wrap: wrap; .btn { margin-left: auto; } } small { font-size: 0.8rem; } }
@media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
@media (max-width: 480px) {
  .line { grid-template-columns: 1fr auto; grid-template-areas: 'who price' 'ctl ctl'; .who { grid-area: who; } .price { grid-area: price; } .ctl { grid-area: ctl; justify-self: end; } padding-block: 10px; border-bottom: 1px solid var(--line); }
}
</style>
