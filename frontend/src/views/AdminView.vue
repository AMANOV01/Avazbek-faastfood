<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api, money } from '../api';
import { useThemeStore } from '../stores/theme';
import AppLogo from '../components/AppLogo.vue';
import AppIcon from '../components/AppIcon.vue';

const theme = useThemeStore();
const KEY = 'avz_admin';

const password = ref('');
const authed = ref(false);
const error = ref('');
const busy = ref(false);
const tab = ref('orders');
const orders = ref([]);
const products = ref([]);
let timer;

const STATUSES = [
  ['new', 'Yangi'],
  ['cooking', 'Tayyorlanmoqda'],
  ['delivering', 'Yo\'lda'],
  ['done', 'Yakunlandi'],
  ['cancelled', 'Bekor'],
];

async function load() {
  [orders.value, products.value] = await Promise.all([
    api.adminOrders(password.value),
    api.adminProducts(password.value),
  ]);
}

async function login() {
  error.value = '';
  busy.value = true;
  try {
    await api.adminLogin(password.value);
    sessionStorage.setItem(KEY, password.value);
    authed.value = true;
    await load();
    clearInterval(timer);
    timer = setInterval(() => load().catch(() => {}), 15000);
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
}

async function setStatus(o, status) {
  Object.assign(o, await api.adminSetStatus(password.value, o.id, status));
}
async function savePrice(p) {
  Object.assign(p, await api.adminPatchProduct(password.value, p.id, { price: Number(p.price) }));
}
async function toggle(p) {
  Object.assign(p, await api.adminPatchProduct(password.value, p.id, { available: !p.available }));
}

const newCount = computed(() => orders.value.filter((o) => o.status === 'new').length);

onMounted(() => {
  // Shu oynada avval kirgan bo'lsangiz, qayta parol so'ramaydi
  const saved = sessionStorage.getItem(KEY);
  if (saved) {
    password.value = saved;
    login();
  }
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div class="admin">
    <header class="top">
      <div class="container bar">
        <div class="brand">
          <AppLogo />
          <span class="display tag">Admin panel</span>
        </div>
        <div class="right">
          <button class="btn small ghost icon" :title="theme.mode === 'dark' ? 'Kunduzgi mavzu' : 'Tungi mavzu'" @click="theme.toggle()">
            <AppIcon :name="theme.mode === 'dark' ? 'sun' : 'moon'" :size="20" />
          </button>
          <a href="/" class="btn small ghost"><AppIcon name="home" :size="18" /> Saytga</a>
          <button v-if="authed" class="btn small" @click="logout"><AppIcon name="logout" :size="18" /> Chiqish</button>
        </div>
      </div>
    </header>

    <div class="container body">
      <!-- Kirish oynasi -->
      <form v-if="!authed" class="card login" @submit.prevent="login">
        <div class="lock"><AppIcon name="lock" :size="40" /></div>
        <h1>Admin kirish</h1>
        <p class="muted">Faqat xodimlar uchun.</p>
        <div class="field">
          <label>Parol</label>
          <input v-model="password" type="password" required autofocus autocomplete="current-password" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn" :disabled="busy" style="width: 100%">{{ busy ? 'Tekshirilmoqda…' : 'Kirish' }}</button>
      </form>

      <!-- Panel -->
      <template v-else>
        <div class="tabs">
          <button class="btn small" :class="{ ghost: tab !== 'orders' }" @click="tab = 'orders'">
            Buyurtmalar <span v-if="newCount">({{ newCount }} yangi)</span>
          </button>
          <button class="btn small" :class="{ ghost: tab !== 'products' }" @click="tab = 'products'">Mahsulotlar</button>
        </div>

        <div v-if="tab === 'orders'" class="list">
          <p v-if="!orders.length" class="muted">Buyurtmalar yo'q.</p>
          <article v-for="o in orders" :key="o.id" class="card" :class="{ fresh: o.status === 'new' }">
            <header>
              <b>#{{ o.id }} · {{ o.name }}</b>
              <span class="price">{{ money(o.total) }} so'm</span>
            </header>
            <p class="muted">
              {{ o.phone }} · {{ o.type === 'delivery' ? 'Yetkazib berish: ' + o.address : 'Olib ketish' }}
              · {{ new Date(o.createdAt).toLocaleString('uz-UZ') }}
            </p>
            <ul><li v-for="l in o.items" :key="l.productId">{{ l.qty }} × {{ l.name }}</li></ul>
            <p v-if="o.comment" class="muted">Izoh: {{ o.comment }}</p>
            <div class="field"><select :value="o.status" @change="setStatus(o, $event.target.value)">
              <option v-for="[v, t] in STATUSES" :key="v" :value="v">{{ t }}</option>
            </select></div>
          </article>
        </div>

        <div v-else class="card">
          <div v-for="p in products" :key="p.id" class="prow">
            <span>{{ p.name }} <small class="muted">({{ p.category }})</small></span>
            <input v-model.number="p.price" type="number" min="0" step="500" @change="savePrice(p)" />
            <button class="btn small" :class="{ ghost: !p.available }" @click="toggle(p)">{{ p.available ? 'Bor' : 'Yo\'q' }}</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin { min-height: 100vh; }
.top {
  position: sticky; top: 0; z-index: 10;
  background: var(--header-bg); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line);
}
.bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-block: 10px; }
.brand { display: flex; align-items: center; gap: 16px; }
.tag { color: var(--green-bright); letter-spacing: 0.2em; font-size: 0.95rem; }
.right { display: flex; align-items: center; gap: 8px; }
.body { padding-block: 28px 60px; }

.login { max-width: 380px; margin: 40px auto 0; text-align: center; h1 { font-size: 1.6rem; color: var(--green-bright); margin-block: 6px; } .field { text-align: left; margin-top: 16px; } }
.lock { color: var(--green-bright); display: grid; place-items: center; }

.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.list { display: grid; gap: 12px; }
article header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.fresh { border-color: var(--green); }
ul { margin: 8px 0 8px 20px; }
.prow {
  display: grid; grid-template-columns: 1fr 120px 70px; gap: 10px; align-items: center; padding-block: 6px;
  input { background: var(--input-bg); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; }
}
@media (max-width: 560px) { .tag { display: none; } }
</style>
