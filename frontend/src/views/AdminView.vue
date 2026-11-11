<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { api, money } from '../api';
import { t, loc, formatDate, formatDay } from '../i18n';
import { useThemeStore } from '../stores/theme';
import { useNotifyStore } from '../stores/notify';
import { beep, getSubscription, isIosBrowser, permission, pushSupported } from '../utils/push';
import { promoText, unitPrice } from '../utils/promo';
import AppLogo from '../components/AppLogo.vue';
import AppIcon from '../components/AppIcon.vue';
import LangSwitch from '../components/LangSwitch.vue';

const theme = useThemeStore();
const notify = useNotifyStore();
const KEY = 'avz_admin';
const STATUSES = ['awaiting_payment', 'new', 'cooking', 'delivering', 'done', 'cancelled'];

const password = ref('');
const authed = ref(false);
const error = ref('');
const busy = ref(false);
const tab = ref('orders');
const orders = ref([]);
const products = ref([]);
const promos = ref([]);
const codes = ref([]);
const categories = ref([]);
const filter = ref('active');
const notifState = ref('ask');
let timer;
let knownIds = null; // yangi buyurtmani aniqlash uchun

const label = (s) => (s === 'new' ? t('status.newAdmin') : t(`status.${s}`));
const flash = (title, kind = 'info') => notify.push({ title, kind, ms: 4000 });
const fail = (e) => flash(e.message, 'error');
const name = (p) => loc(p.names, p.name);
const catName = (id) => {
  const c = categories.value.find((x) => x.id === id);
  return c ? loc(c.names, c.name) : id;
};

// ---------- Yuklash ----------
async function loadOrders() {
  const list = await api.adminOrders(password.value);
  if (knownIds) {
    const fresh = list.filter((o) => !knownIds.has(o.id));
    if (fresh.length) {
      beep();
      fresh.forEach((o) => notify.push({ kind: 'order', key: `new-${o.id}`, title: t('admin.newOrder', { id: o.id, sum: money(o.total) }), body: o.name, ms: 12000 }));
    }
  }
  knownIds = new Set(list.map((o) => o.id));
  orders.value = list;
}
async function loadProducts() {
  products.value = await api.adminProducts(password.value);
}
async function loadCodes() {
  codes.value = await api.adminCodes(password.value);
}
async function loadPromos() {
  promos.value = await api.adminPromos(password.value);
}
const poll = () => loadOrders().catch(() => {});

async function login() {
  error.value = '';
  busy.value = true;
  try {
    await api.adminLogin(password.value);
    sessionStorage.setItem(KEY, password.value);
    authed.value = true;
    categories.value = await api.categories();
    await Promise.all([loadOrders(), loadProducts(), loadPromos(), loadCodes(), loadSettings()]);
    clearInterval(timer);
    timer = setInterval(poll, 8000);
    initNotifications();
  } catch (e) {
    error.value = e.message;
    sessionStorage.removeItem(KEY);
  } finally {
    busy.value = false;
  }
}

function logout() {
  clearInterval(timer);
  sessionStorage.removeItem(KEY);
  authed.value = false;
  password.value = '';
  orders.value = [];
  products.value = [];
  promos.value = [];
  codes.value = [];
  knownIds = null;
}

// ---------- Bildirishnoma ----------
function readNotifState() {
  if (!pushSupported()) notifState.value = 'unsupported';
  else notifState.value = { granted: 'on', denied: 'denied' }[permission()] || 'ask';
}
async function subscribeAdmin(ask) {
  const sub = await getSubscription({ ask });
  if (sub) await api.adminPushSubscribe(password.value, sub).catch(() => {});
  readNotifState();
}
function initNotifications() {
  readNotifState();
  if (notifState.value === 'on') subscribeAdmin(false); // ruxsat avval berilgan — jimgina qayta ulanadi
}
const onNotifClick = () => {
  if (notifState.value === 'ask') subscribeAdmin(true);
  else if (notifState.value === 'denied') flash(t('admin.notif.denied'), 'error');
  else if (notifState.value === 'unsupported') flash(isIosBrowser() ? t('notif.ios') : t('admin.notif.unsupported'), 'error');
};

// ---------- Buyurtmalar ----------
async function setStatus(o, status) {
  if (o.status === status) return;
  try {
    Object.assign(o, await api.adminSetStatus(password.value, o.id, status));
  } catch (e) {
    fail(e);
  }
}
const newCount = computed(() => orders.value.filter((o) => o.status === 'new' || o.status === 'awaiting_payment').length);
const shownOrders = computed(() =>
  filter.value === 'all' ? orders.value : orders.value.filter((o) => !['done', 'cancelled'].includes(o.status))
);
watch(newCount, (n) => (document.title = n ? `(${n}) ${t('admin.title')}` : t('admin.title')), { immediate: true });

// ---------- Mahsulotlar ----------
const blank = () => ({ id: null, uz: '', ru: '', en: '', category: categories.value[0]?.id || 'lavash', price: '', available: true, image: '', uploading: false });
const form = reactive(blank());
const formRef = ref(null);
const search = ref('');
const catFilter = ref('');

const shownProducts = computed(() => {
  const q = search.value.trim().toLowerCase();
  return products.value.filter(
    (p) =>
      (!catFilter.value || p.category === catFilter.value) &&
      (!q || Object.values(p.names || {}).some((n) => n.toLowerCase().includes(q)) || p.name.toLowerCase().includes(q))
  );
});

// Katta rasmni brauzerning o'zida kichraytiramiz (tez yuklanishi uchun)
async function shrink(file, max = 900) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
async function onFile(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  form.uploading = true;
  try {
    const { url } = await api.adminUpload(password.value, await shrink(file));
    form.image = url;
  } catch (err) {
    fail(err.name === 'InvalidStateError' || err.name === 'TypeError' ? new Error(t('err.bad_image')) : err);
  } finally {
    form.uploading = false;
  }
}

function startEdit(p) {
  Object.assign(form, { id: p.id, uz: p.names?.uz || p.name, ru: p.names?.ru || '', en: p.names?.en || '', category: p.category, price: p.price, available: p.available, image: p.image || '', uploading: false });
  formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const resetForm = () => Object.assign(form, blank());

async function submitProduct() {
  const body = {
    names: { uz: form.uz, ru: form.ru, en: form.en },
    category: form.category,
    price: Number(form.price),
    available: form.available,
    image: form.image,
  };
  busy.value = true;
  try {
    if (form.id) await api.adminPatchProduct(password.value, form.id, body);
    else await api.adminAddProduct(password.value, body);
    flash(t(form.id ? 'admin.p.saved' : 'admin.p.added'));
    resetForm();
    await Promise.all([loadProducts(), loadPromos()]);
  } catch (e) {
    fail(e);
  } finally {
    busy.value = false;
  }
}
async function savePrice(p) {
  try {
    Object.assign(p, await api.adminPatchProduct(password.value, p.id, { price: Number(p.price) }));
  } catch (e) {
    fail(e);
    loadProducts();
  }
}
async function toggle(p) {
  try {
    Object.assign(p, await api.adminPatchProduct(password.value, p.id, { available: !p.available }));
  } catch (e) {
    fail(e);
  }
}
async function removeProduct(p) {
  if (!window.confirm(t('admin.p.confirmDelete', { name: name(p) }))) return;
  try {
    await api.adminDeleteProduct(password.value, p.id);
    if (form.id === p.id) resetForm();
    await Promise.all([loadProducts(), loadPromos()]);
  } catch (e) {
    fail(e);
  }
}

// ---------- Aksiyalar ----------
const pform = reactive({ productId: '', minQty: 3, type: 'percent', value: 10, endsAt: '' });
const pProduct = computed(() => products.value.find((p) => p.id === Number(pform.productId)));
const preview = computed(() => {
  const p = pProduct.value;
  if (!p || !(pform.minQty >= 1) || !(pform.value >= 1)) return '';
  const pr = { productId: p.id, minQty: Number(pform.minQty), type: pform.type, value: Number(pform.value) };
  return `${name(p)}: ${promoText(pr)} (${money(p.price)} → ${money(unitPrice(p, pr.minQty, [pr]))} ${t('som')})`;
});
watch(
  () => products.value.length,
  () => { if (!pform.productId && products.value.length) pform.productId = products.value[0].id; },
  { immediate: true }
);

async function addPromo() {
  busy.value = true;
  try {
    await api.adminAddPromo(password.value, { ...pform, productId: Number(pform.productId), minQty: Number(pform.minQty), value: Number(pform.value) });
    flash(t('admin.pr.added'));
    pform.endsAt = '';
    await loadPromos();
  } catch (e) {
    fail(e);
  } finally {
    busy.value = false;
  }
}
async function togglePromo(pr) {
  try {
    Object.assign(pr, await api.adminPatchPromo(password.value, pr.id, { active: !pr.active }));
  } catch (e) {
    fail(e);
  }
}
async function removePromo(pr) {
  if (!window.confirm(t('admin.pr.confirmDelete'))) return;
  try {
    await api.adminDeletePromo(password.value, pr.id);
    await loadPromos();
  } catch (e) {
    fail(e);
  }
}
const promoState = (pr) => (!pr.active ? 'off' : pr.live ? 'on' : 'expired');
const promoProduct = (pr) => products.value.find((p) => p.id === pr.productId);

// ---------- Promokodlar ----------
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => ALPHABET[b % ALPHABET.length]).join('');
const cform = reactive({ code: randomCode(), type: 'percent', value: 10, minTotal: '', maxUses: '', endsAt: '' });
const codeState = (c) => (!c.active ? 'off' : c.live ? 'on' : 'expired');
const codeValue = (c) => (c.type === 'percent' ? `−${c.value}%` : `−${money(c.value)} ${t('som')}`);

async function addCode() {
  busy.value = true;
  try {
    const c = await api.adminAddCode(password.value, {
      ...cform,
      value: Number(cform.value),
      minTotal: cform.minTotal === '' ? 0 : Number(cform.minTotal),
      maxUses: cform.maxUses === '' ? null : Number(cform.maxUses),
    });
    flash(t('admin.code.added', { code: c.code }));
    Object.assign(cform, { code: randomCode(), endsAt: '' });
    await loadCodes();
  } catch (e) {
    fail(e);
  } finally {
    busy.value = false;
  }
}
async function toggleCode(c) {
  try {
    Object.assign(c, await api.adminPatchCode(password.value, c.id, { active: !c.active }));
  } catch (e) {
    fail(e);
  }
}
async function removeCode(c) {
  if (!window.confirm(t('admin.code.confirmDelete', { code: c.code }))) return;
  try {
    await api.adminDeleteCode(password.value, c.id);
    await loadCodes();
  } catch (e) {
    fail(e);
  }
}
async function copyCode(c) {
  try {
    await navigator.clipboard.writeText(c.code);
    flash(t('common.copied'));
  } catch {
    /* nusxalab bo'lmasa ham mayli */
  }
}
const mapLink = (o) => `https://www.google.com/maps?q=${o.lat},${o.lng}`;
const payText = (o) => (o.payMethod === 'card' ? `${t('pay.card')} · ${o.payCard === 'humo' ? 'Humo' : 'Uzcard'}${o.payLast4 ? ' · •••• ' + o.payLast4 : ''}` : t('pay.cash'));

// ---------- To'lov kartalari ----------
const cards = ref([]);
const activeCard = ref('');
const fmtCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const newId = () => 'c' + Math.random().toString(36).slice(2, 8);
async function loadSettings() {
  const r = await api.adminCards(password.value);
  cards.value = r.cards.map((c) => ({ ...c, number: fmtCard(c.number) }));
  activeCard.value = r.activeId;
}
function addCard() {
  const c = { id: newId(), number: '', holder: '', type: 'uzcard' };
  cards.value.push(c);
  if (!activeCard.value) activeCard.value = c.id;
}
function removeCard(i) {
  const [gone] = cards.value.splice(i, 1);
  if (gone.id === activeCard.value) activeCard.value = cards.value[0]?.id || '';
}
async function saveCards() {
  busy.value = true;
  try {
    const r = await api.adminSaveCards(password.value, { cards: cards.value, activeId: activeCard.value });
    cards.value = r.cards.map((c) => ({ ...c, number: fmtCard(c.number) }));
    activeCard.value = r.activeId;
    flash(t('admin.set.saved'));
  } catch (e) {
    fail(e);
  } finally {
    busy.value = false;
  }
}

const onPush = () => poll();
onMounted(() => {
  window.addEventListener('avz:push', onPush);
  // Shu oynada avval kirgan bo'lsangiz, qayta parol so'ramaydi
  const saved = sessionStorage.getItem(KEY);
  if (saved) {
    password.value = saved;
    login();
  }
});
onUnmounted(() => {
  clearInterval(timer);
  window.removeEventListener('avz:push', onPush);
});
</script>

<template>
  <div class="admin">
    <header class="top">
      <div class="container bar">
        <div class="brand">
          <AppLogo />
          <span class="display tag">{{ $t('admin.title') }}</span>
        </div>
        <div class="right">
          <LangSwitch />
          <button class="btn small ghost icon" :title="theme.mode === 'dark' ? $t('theme.toLight') : $t('theme.toDark')" :aria-label="theme.mode === 'dark' ? $t('theme.toLight') : $t('theme.toDark')" @click="theme.toggle()">
            <AppIcon :name="theme.mode === 'dark' ? 'sun' : 'moon'" :size="20" />
          </button>
          <button
            v-if="authed"
            class="btn small icon bell"
            :class="{ ghost: notifState === 'on' }"
            :title="notifState === 'on' ? $t('admin.notif.on') : $t('admin.notif.enable')"
            :aria-label="notifState === 'on' ? $t('admin.notif.on') : $t('admin.notif.enable')"
            @click="onNotifClick"
          >
            <AppIcon name="bell" :size="20" />
            <span v-if="notifState !== 'on'" class="lbl">{{ $t('admin.notif.enable') }}</span>
          </button>
          <a href="/" class="btn small ghost"><AppIcon name="home" :size="18" /><span class="lbl">{{ $t('admin.toSite') }}</span></a>
          <button v-if="authed" class="btn small" @click="logout"><AppIcon name="logout" :size="18" /><span class="lbl">{{ $t('admin.logout') }}</span></button>
        </div>
      </div>
    </header>

    <div class="container body">
      <!-- Kirish oynasi -->
      <form v-if="!authed" class="card login" @submit.prevent="login">
        <div class="lock"><AppIcon name="lock" :size="40" /></div>
        <h1>{{ $t('admin.login') }}</h1>
        <p class="muted">{{ $t('admin.staffOnly') }}</p>
        <div class="field">
          <label>{{ $t('admin.password') }}</label>
          <input v-model="password" type="password" required autofocus autocomplete="current-password" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn" :disabled="busy" style="width: 100%">{{ busy ? $t('admin.checking') : $t('admin.signIn') }}</button>
      </form>

      <!-- Panel -->
      <template v-else>
        <div class="tabs" role="tablist">
          <button class="btn small" :class="{ ghost: tab !== 'orders' }" role="tab" @click="tab = 'orders'">
            <AppIcon name="receipt" :size="18" />{{ $t('admin.tab.orders') }}
            <span v-if="newCount" class="pill">{{ newCount }}</span>
          </button>
          <button class="btn small" :class="{ ghost: tab !== 'products' }" role="tab" @click="tab = 'products'">
            <AppIcon name="menu" :size="18" />{{ $t('admin.tab.products') }}
          </button>
          <button class="btn small" :class="{ ghost: tab !== 'promos' }" role="tab" @click="tab = 'promos'">
            <AppIcon name="tag" :size="18" />{{ $t('admin.tab.promos') }}
          </button>
          <button class="btn small" :class="{ ghost: tab !== 'codes' }" role="tab" @click="tab = 'codes'">
            <AppIcon name="ticket" :size="18" />{{ $t('admin.tab.codes') }}
          </button>
          <button class="btn small" :class="{ ghost: tab !== 'settings' }" role="tab" @click="tab = 'settings'">
            <AppIcon name="card" :size="18" />{{ $t('admin.tab.settings') }}
          </button>
        </div>

        <!-- ===== Buyurtmalar ===== -->
        <section v-if="tab === 'orders'">
          <div class="filters">
            <button class="btn small" :class="{ ghost: filter !== 'active' }" @click="filter = 'active'">{{ $t('admin.filter.active') }}</button>
            <button class="btn small" :class="{ ghost: filter !== 'all' }" @click="filter = 'all'">{{ $t('admin.filter.all') }}</button>
          </div>
          <div class="list">
            <p v-if="!shownOrders.length" class="muted">{{ $t('admin.noOrders') }}</p>
            <article v-for="o in shownOrders" :key="o.id" class="card" :class="{ fresh: o.status === 'new' || o.status === 'awaiting_payment' }">
              <header>
                <b>#{{ o.id }} · {{ o.name }}</b>
                <span class="price">{{ money(o.total) }} {{ $t('som') }}</span>
              </header>
              <p class="muted meta">
                <a :href="`tel:${o.phone}`">{{ o.phone }}</a> ·
                {{ o.type === 'delivery' ? $t('admin.delivery', { addr: o.address }) : $t('admin.pickup') }} ·
                {{ formatDate(o.createdAt) }}
                <AppIcon v-if="o.hasPush" name="bell" :size="14" class="bellmark" :title="$t('admin.customerNotif')" />
              </p>
              <p v-if="o.type === 'delivery' && o.lat != null" class="meta">
                <a :href="mapLink(o)" target="_blank" rel="noopener" class="maplink"><AppIcon name="pin" :size="16" />{{ $t('admin.openMap') }}</a>
              </p>
              <p class="meta paymeta">
                <AppIcon :name="o.payMethod === 'card' ? 'card' : 'cash'" :size="16" />{{ payText(o) }}
                <span v-if="o.promoCode" class="codetag"><AppIcon name="ticket" :size="14" />{{ o.promoCode }} · −{{ money(o.codeDiscount) }}</span>
              </p>
              <ul><li v-for="l in o.items" :key="l.productId">{{ l.qty }} × {{ loc(l.names, l.name) }}<small v-if="l.basePrice && l.basePrice > l.price" class="muted"> · {{ $t('promo.applied') }}</small></li></ul>
              <p v-if="o.comment" class="muted">{{ $t('admin.comment', { c: o.comment }) }}</p>
              <div v-if="o.status === 'awaiting_payment'" class="payalert">
                <span><AppIcon name="card" :size="18" />{{ $t('admin.payCheck', { sum: money(o.total) }) }}</span>
                <button class="btn small" @click="setStatus(o, 'cooking')"><AppIcon name="check" :size="16" />{{ $t('admin.payConfirm') }}</button>
              </div>
              <div class="statuses" role="group" :aria-label="$t('admin.setStatus')">
                <template v-for="s in STATUSES" :key="s">
                  <button v-if="(s !== 'delivering' || o.type === 'delivery') && (s !== 'awaiting_payment' || o.payMethod === 'card')" class="btn small" :class="[{ ghost: o.status !== s }, 'st-' + s]" @click="setStatus(o, s)">{{ label(s) }}</button>
                </template>
              </div>
            </article>
          </div>
        </section>

        <!-- ===== Mahsulotlar ===== -->
        <section v-else-if="tab === 'products'">
          <form ref="formRef" class="card pform" @submit.prevent="submitProduct">
            <h2 class="display">{{ $t(form.id ? 'admin.p.edit' : 'admin.p.add') }}</h2>
            <div class="grid2">
              <div class="field"><label>{{ $t('admin.p.nameUz') }}</label><input v-model.trim="form.uz" required maxlength="80" /></div>
              <div class="field">
                <label>{{ $t('admin.p.category') }}</label>
                <select v-model="form.category"><option v-for="c in categories" :key="c.id" :value="c.id">{{ loc(c.names, c.name) }}</option></select>
              </div>
              <div class="field"><label>{{ $t('admin.p.nameRu') }}</label><input v-model.trim="form.ru" maxlength="80" /></div>
              <div class="field"><label>{{ $t('admin.p.nameEn') }}</label><input v-model.trim="form.en" maxlength="80" /></div>
              <div class="field"><label>{{ $t('admin.p.price') }}</label><input v-model="form.price" type="number" min="0" step="500" required inputmode="numeric" /></div>
              <label class="check"><input v-model="form.available" type="checkbox" /> {{ $t('admin.p.available') }}</label>
            </div>
            <p class="muted small-note">{{ $t('admin.p.nameHint') }}</p>

            <div class="imgbox">
              <div class="preview" :class="{ empty: !form.image }">
                <img v-if="form.image" :src="form.image" alt="" />
                <AppIcon v-else name="image" :size="34" />
              </div>
              <div class="imgctl">
                <label class="btn small ghost filebtn" :class="{ disabled: form.uploading }">
                  <AppIcon name="image" :size="18" />
                  {{ form.uploading ? $t('admin.p.uploading') : $t(form.image ? 'admin.p.changeImage' : 'admin.p.chooseImage') }}
                  <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="form.uploading" @change="onFile" />
                </label>
                <button v-if="form.image" type="button" class="btn small ghost" @click="form.image = ''"><AppIcon name="trash" :size="16" />{{ $t('admin.p.removeImage') }}</button>
                <p class="muted small-note">{{ $t('admin.p.imageHint') }}</p>
              </div>
            </div>

            <div class="actions">
              <button class="btn" :disabled="busy || form.uploading"><AppIcon :name="form.id ? 'check' : 'plus'" :size="18" />{{ $t(form.id ? 'admin.p.save' : 'admin.p.create') }}</button>
              <button v-if="form.id" type="button" class="btn ghost" @click="resetForm">{{ $t('admin.p.cancel') }}</button>
            </div>
          </form>

          <div class="filters search">
            <input v-model="search" type="search" :placeholder="$t('admin.p.search')" />
            <select v-model="catFilter">
              <option value="">{{ $t('admin.p.all') }}</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ loc(c.names, c.name) }}</option>
            </select>
          </div>

          <div class="card plist">
            <p v-if="!shownProducts.length" class="muted">{{ $t('admin.p.empty') }}</p>
            <div v-for="p in shownProducts" :key="p.id" class="prow" :class="{ off: !p.available }">
              <img :src="p.image || `/images/${categories.find((c) => c.id === p.category)?.image || 'lavash'}.jpg`" alt="" class="pthumb" :class="{ ph: !p.image }" loading="lazy" />
              <span class="pname">{{ name(p) }} <small class="muted">{{ catName(p.category) }}</small></span>
              <input v-model.number="p.price" class="pprice" type="number" min="0" step="500" inputmode="numeric" :aria-label="$t('admin.p.price')" @change="savePrice(p)" />
              <div class="pbtns">
                <button class="btn small" :class="{ ghost: !p.available }" @click="toggle(p)">{{ p.available ? $t('admin.p.yes') : $t('admin.p.no') }}</button>
                <button class="btn small ghost icon" :aria-label="$t('admin.p.edit')" @click="startEdit(p)"><AppIcon name="edit" :size="18" /></button>
                <button class="btn small ghost icon danger" :title="$t('admin.p.delete')" :aria-label="$t('admin.p.delete')" @click="removeProduct(p)"><AppIcon name="trash" :size="18" /></button>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== Aksiyalar ===== -->
        <section v-else-if="tab === 'promos'">
          <p class="muted hint">{{ $t('admin.pr.hint') }}</p>
          <form class="card pform" @submit.prevent="addPromo">
            <h2 class="display">{{ $t('admin.pr.new') }}</h2>
            <div class="grid2">
              <div class="field">
                <label>{{ $t('admin.pr.product') }}</label>
                <select v-model="pform.productId" required>
                  <option v-for="p in products" :key="p.id" :value="p.id">{{ name(p) }} — {{ money(p.price) }}</option>
                </select>
              </div>
              <div class="field"><label>{{ $t('admin.pr.minQty') }}</label><input v-model.number="pform.minQty" type="number" min="1" max="50" required inputmode="numeric" /></div>
              <div class="field">
                <label>{{ $t('admin.pr.type') }}</label>
                <select v-model="pform.type"><option value="percent">{{ $t('admin.pr.percent') }}</option><option value="amount">{{ $t('admin.pr.amount') }}</option></select>
              </div>
              <div class="field"><label>{{ $t('admin.pr.value') }}</label><input v-model.number="pform.value" type="number" min="1" :max="pform.type === 'percent' ? 90 : undefined" required inputmode="numeric" /></div>
              <div class="field"><label>{{ $t('admin.pr.endsAt') }}</label><input v-model="pform.endsAt" type="date" /></div>
            </div>
            <p v-if="preview" class="preview-line"><AppIcon name="tag" :size="18" /><span><small class="muted">{{ $t('admin.pr.preview') }}</small><br />{{ preview }}</span></p>
            <div class="actions"><button class="btn" :disabled="busy || !products.length"><AppIcon name="plus" :size="18" />{{ $t('admin.pr.create') }}</button></div>
          </form>

          <div class="list">
            <p v-if="!promos.length" class="muted">{{ $t('admin.pr.empty') }}</p>
            <article v-for="pr in promos.slice().reverse()" :key="pr.id" class="card promo-card" :class="promoState(pr)">
              <div class="pinfo">
                <b>{{ promoProduct(pr) ? name(promoProduct(pr)) : '#' + pr.productId }}</b>
                <span>{{ promoText(pr) }}<small v-if="pr.endsAt" class="muted"> · {{ $t('promo.until', { date: formatDay(pr.endsAt) }) }}</small></span>
              </div>
              <span class="chip" :class="promoState(pr)">{{ $t(`admin.pr.${promoState(pr)}`) }}</span>
              <div class="pbtns">
                <button class="btn small ghost" @click="togglePromo(pr)"><AppIcon :name="pr.active ? 'pause' : 'play'" :size="16" />{{ $t(pr.active ? 'admin.pr.pause' : 'admin.pr.resume') }}</button>
                <button class="btn small ghost icon danger" :aria-label="$t('admin.p.delete')" @click="removePromo(pr)"><AppIcon name="trash" :size="18" /></button>
              </div>
            </article>
          </div>
        </section>

        <!-- ===== Promokodlar ===== -->
        <section v-else-if="tab === 'codes'">
          <p class="muted hint">{{ $t('admin.code.hint') }}</p>
          <form class="card pform" @submit.prevent="addCode">
            <h2 class="display">{{ $t('admin.code.new') }}</h2>
            <div class="grid2">
              <div class="field">
                <label>{{ $t('admin.code.code') }}</label>
                <div class="codeinput">
                  <input v-model.trim="cform.code" maxlength="20" required pattern="[A-Za-z0-9_\-]{3,20}" autocapitalize="characters" spellcheck="false" />
                  <button type="button" class="btn small ghost" @click="cform.code = randomCode()">{{ $t('admin.code.random') }}</button>
                </div>
              </div>
              <div class="field">
                <label>{{ $t('admin.pr.type') }}</label>
                <select v-model="cform.type"><option value="percent">{{ $t('admin.pr.percent') }}</option><option value="amount">{{ $t('admin.pr.amount') }}</option></select>
              </div>
              <div class="field"><label>{{ $t('admin.pr.value') }}</label><input v-model.number="cform.value" type="number" min="1" :max="cform.type === 'percent' ? 90 : undefined" required inputmode="numeric" /></div>
              <div class="field"><label>{{ $t('admin.code.minTotal') }}</label><input v-model="cform.minTotal" type="number" min="0" step="1000" inputmode="numeric" placeholder="0" /></div>
              <div class="field"><label>{{ $t('admin.code.maxUses') }}</label><input v-model="cform.maxUses" type="number" min="1" inputmode="numeric" :placeholder="$t('admin.code.unlimited')" /></div>
              <div class="field"><label>{{ $t('admin.pr.endsAt') }}</label><input v-model="cform.endsAt" type="date" /></div>
            </div>
            <p class="muted small-note">{{ $t('admin.code.rule') }}</p>
            <div class="actions"><button class="btn" :disabled="busy"><AppIcon name="plus" :size="18" />{{ $t('admin.code.create') }}</button></div>
          </form>

          <div class="list">
            <p v-if="!codes.length" class="muted">{{ $t('admin.code.empty') }}</p>
            <article v-for="c in codes" :key="c.id" class="card promo-card" :class="codeState(c)">
              <div class="pinfo">
                <b class="codetext">{{ c.code }} <small class="muted">{{ codeValue(c) }}</small></b>
                <small class="muted">
                  {{ $t('admin.code.used', { n: c.usedCount, max: c.maxUses ?? '∞' }) }}
                  <template v-if="c.minTotal"> · {{ $t('admin.code.minShort', { sum: money(c.minTotal) }) }}</template>
                  <template v-if="c.endsAt"> · {{ $t('promo.until', { date: formatDay(c.endsAt) }) }}</template>
                </small>
              </div>
              <span class="chip" :class="codeState(c)">{{ $t(`admin.code.${codeState(c)}`) }}</span>
              <div class="pbtns">
                <button class="btn small ghost" @click="copyCode(c)">{{ $t('common.copy') }}</button>
                <button class="btn small ghost" @click="toggleCode(c)"><AppIcon :name="c.active ? 'pause' : 'play'" :size="16" />{{ $t(c.active ? 'admin.pr.pause' : 'admin.pr.resume') }}</button>
                <button class="btn small ghost icon danger" :aria-label="$t('admin.p.delete')" @click="removeCode(c)"><AppIcon name="trash" :size="18" /></button>
              </div>
            </article>
          </div>
        </section>

        <!-- ===== Sozlamalar: to'lov kartalari ===== -->
        <section v-else>
          <p class="muted hint">{{ $t('admin.set.hint') }}</p>
          <form class="cardlist" @submit.prevent="saveCards">
            <article v-for="(c, i) in cards" :key="c.id" class="card cardedit" :class="{ active: c.id === activeCard }">
              <label class="activepick">
                <input v-model="activeCard" type="radio" name="activecard" :value="c.id" />
                <span>{{ c.id === activeCard ? $t('admin.set.active') : $t('admin.set.makeActive') }}</span>
              </label>
              <div class="grid2">
                <div class="field"><label>{{ $t('admin.set.number') }}</label><input v-model="c.number" inputmode="numeric" autocomplete="off" maxlength="19" placeholder="8600 0000 0000 0000" required @input="c.number = fmtCard(c.number)" /></div>
                <div class="field">
                  <label>{{ $t('admin.set.type') }}</label>
                  <select v-model="c.type"><option value="uzcard">Uzcard</option><option value="humo">Humo</option></select>
                </div>
                <div class="field"><label>{{ $t('admin.set.holder') }}</label><input v-model.trim="c.holder" maxlength="60" autocomplete="off" /></div>
              </div>
              <button type="button" class="btn small ghost danger" @click="removeCard(i)"><AppIcon name="trash" :size="16" />{{ $t('admin.set.remove') }}</button>
            </article>
            <p v-if="!cards.length" class="muted">{{ $t('admin.set.none') }}</p>
            <div class="actions">
              <button type="button" class="btn ghost" :disabled="cards.length >= 10" @click="addCard"><AppIcon name="plus" :size="18" />{{ $t('admin.set.add') }}</button>
              <button class="btn" :disabled="busy"><AppIcon name="check" :size="18" />{{ $t('admin.p.save') }}</button>
            </div>
            <p class="muted small-note">{{ $t('admin.set.note') }}</p>
          </form>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin { min-height: 100vh; }
.top { position: sticky; top: 0; z-index: 30; background: var(--header-bg); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); padding-top: env(safe-area-inset-top); }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-block: 10px; }
.brand { display: flex; align-items: center; gap: 16px; }
.tag { color: var(--green-bright); letter-spacing: 0.2em; font-size: 0.95rem; }
.right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.body { padding-block: 24px 60px; }
.danger { color: var(--danger); border-color: var(--danger); &:hover { background: transparent; color: var(--danger); } }

.login { max-width: 380px; margin: 40px auto 0; text-align: center; h1 { font-size: 1.6rem; color: var(--green-bright); margin-block: 6px; } .field { text-align: left; margin-top: 16px; } }
.lock { color: var(--green-bright); display: grid; place-items: center; }

.tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; .btn { white-space: nowrap; } }
.pill { background: #0b0c0b; color: var(--green-bright); border-radius: 999px; min-width: 20px; height: 20px; display: inline-grid; place-items: center; font-size: 0.75rem; padding-inline: 5px; }
.filters { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; &.search { margin-top: 22px; input, select { flex: 1; min-width: 160px; } } }
input[type='search'], .filters select, .plist input, .pform input[type='date'] { background: var(--input-bg); color: var(--text); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font: inherit; }

.list { display: grid; gap: 12px; }
article > header { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.fresh { border-color: var(--green); box-shadow: 0 0 0 3px var(--glow); }
.meta a { color: var(--green-bright); }
.bellmark { color: var(--green-bright); vertical-align: -2px; margin-left: 4px; }
ul { margin: 8px 0 8px 20px; }
.statuses { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }

.pform { margin-bottom: 16px; h2 { font-size: 1.2rem; color: var(--green-bright); margin-bottom: 14px; } }
.grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 16px; align-items: start; }
.check { display: flex; align-items: center; gap: 10px; margin-top: 28px; min-height: 48px; input { width: 20px; height: 20px; accent-color: var(--green); } }
.small-note { font-size: 0.82rem; margin-bottom: 10px; }
.imgbox { display: flex; gap: 16px; align-items: center; margin-block: 8px 14px; }
.preview { width: 110px; height: 110px; flex: none; border-radius: 14px; background: var(--img-bg); display: grid; place-items: center; overflow: hidden; border: 1px solid var(--line); color: var(--muted); img { width: 100%; height: 100%; object-fit: cover; } }
.imgctl { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.filebtn { cursor: pointer; position: relative; input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; } &.disabled { opacity: 0.6; } }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.preview-line { display: flex; gap: 10px; align-items: flex-start; background: var(--glow); border: 1px dashed var(--green); border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; svg { color: var(--green-bright); margin-top: 3px; } }
.hint { margin-bottom: 12px; }
.cardlist { display: grid; gap: 14px; }
.cardedit { display: grid; gap: 8px; > .btn { justify-self: start; } &.active { border-color: var(--green-bright); box-shadow: 0 0 0 4px var(--glow); } }
.activepick { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; color: var(--green-bright); input { accent-color: var(--green-bright); width: 18px; height: 18px; } }
.payalert { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: var(--glow); border: 1px dashed var(--green-bright); span { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; } }
.maplink { display: inline-flex; align-items: center; gap: 6px; color: var(--green-bright); font-weight: 600; text-decoration: underline; }
.paymeta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.codetag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 999px; border: 1px dashed var(--green-bright); color: var(--green-bright); font-weight: 600; font-size: 0.85rem; }
.codeinput { display: flex; gap: 8px; input { flex: 1; text-transform: uppercase; letter-spacing: 0.08em; } }
.codetext { font-family: 'Oswald', sans-serif; letter-spacing: 0.1em; font-size: 1.15rem; small { letter-spacing: 0; font-family: 'Inter', sans-serif; } }

.plist { padding: 6px 14px; }
.prow {
  display: grid; grid-template-columns: 56px 1fr 120px auto; gap: 12px; align-items: center; padding-block: 10px; border-bottom: 1px solid var(--line);
  &:last-child { border-bottom: 0; }
  &.off { opacity: 0.6; }
}
.pthumb { width: 56px; height: 56px; object-fit: cover; border-radius: 10px; background: var(--img-bg); &.ph { opacity: 0.35; object-fit: contain; } }
.pname { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
.pprice { width: 100%; }
.pbtns { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

.promo-card { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; &.expired, &.off { opacity: 0.7; } }
.pinfo { display: flex; flex-direction: column; min-width: 0; }
.chip { padding: 4px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; border: 1px solid var(--green); color: var(--green-bright); background: var(--glow); white-space: nowrap; &.off, &.expired { color: var(--muted); border-color: var(--line); background: transparent; } }

@media (max-width: 820px) {
  .prow { grid-template-columns: 56px 1fr 110px; grid-template-areas: 'thumb name price' 'btns btns btns'; .pthumb { grid-area: thumb; } .pname { grid-area: name; } .pprice { grid-area: price; } .pbtns { grid-area: btns; justify-content: flex-end; } }
  .promo-card { grid-template-columns: 1fr auto; .pbtns { grid-column: 1 / -1; justify-content: flex-end; } }
}
@media (max-width: 640px) {
  .tag, .lbl { display: none; }
  .bell .lbl { display: none; }
  .grid2 { grid-template-columns: 1fr; }
  .check { margin-top: 0; margin-bottom: 8px; }
  .imgbox { flex-direction: column; align-items: stretch; .preview { width: 100%; height: 180px; } }
  .right { gap: 6px; }
  .statuses .btn { flex: 1 1 calc(50% - 8px); }
}
</style>
