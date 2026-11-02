<script setup>
import { RouterLink } from 'vue-router';
import { useMenuStore } from '../stores/menu';
import { money } from '../api';
import AppIcon from '../components/AppIcon.vue';

const menu = useMenuStore();

function fromPrice(id) {
  const prices = menu.byCategory(id).map((p) => p.price);
  return prices.length ? money(Math.min(...prices)) : '';
}
</script>

<template>
  <section class="hero">
    <div class="container">
      <p class="display tag">Hot Doglari</p>
      <h1>AVAZBEK <span>LAVASH</span></h1>
      <p class="lead">Issiq lavash, sersuv donar, hot dog va haggi — tez tayyorlanadi, tez yetkaziladi.</p>
      <div class="actions">
        <RouterLink to="/menu" class="btn">Menyuni ko'rish</RouterLink>
        <a href="tel:+998888770810" class="btn ghost"><AppIcon name="delivery" /> Yetkazib berish</a>
      </div>
      <div class="showcase">
        <img src="/images/hotdog.jpg" alt="Hot dog" />
        <img src="/images/lavash.jpg" alt="Lavash" class="mid" />
        <img src="/images/donar.jpg" alt="Donar" />
      </div>
    </div>
  </section>

  <section class="container">
    <h2 class="section-title">Kategoriyalar</h2>
    <div class="cats">
      <RouterLink v-for="c in menu.categories" :key="c.id" :to="{ path: '/menu', hash: '#' + c.id }" class="card cat">
        <div class="photo"><img :src="`/images/${c.image}.jpg`" :alt="c.name" loading="lazy" /></div>
        <span class="display">{{ c.name }}</span>
        <small class="muted">{{ menu.byCategory(c.id).length }} xil · {{ fromPrice(c.id) }} so'mdan</small>
      </RouterLink>
    </div>
    <p v-if="menu.error" class="error">Menyuni yuklab bo'lmadi: {{ menu.error }}</p>
  </section>

  <section class="container info">
    <div class="card">
      <h3><AppIcon name="instagram" /> Instagram</h3>
      <a href="https://instagram.com/avazbek_fastfood" target="_blank" rel="noopener" class="price">@avazbek_fastfood</a>
    </div>
    <div class="card">
      <h3><AppIcon name="phone" /> Buyurtma uchun</h3>
      <a href="tel:+998972120393" class="price">97 212 03 93</a>
    </div>
    <div class="card">
      <h3><AppIcon name="delivery" /> Yetkazib berish</h3>
      <a href="tel:+998888770810" class="price">88 877 08 10</a>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  padding-block: 72px 40px; text-align: center;
  h1 { font-size: clamp(2.8rem, 9vw, 5.5rem); line-height: 1; span { color: var(--green-bright); display: block; font-size: 0.55em; letter-spacing: 0.5em; margin-top: 6px; } }
  .tag { color: var(--green); letter-spacing: 0.3em; margin-bottom: 12px; }
  .lead { max-width: 560px; margin: 20px auto 28px; color: var(--muted); font-size: 1.1rem; }
  .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
}
.showcase {
  // Rasmlarning foni qora, shuning uchun ikkala mavzuda ham qora yumaloq panelda turadi
  display: flex; justify-content: center; align-items: center; gap: 8px; margin: 44px auto 0;
  max-width: 880px; padding: 18px; border-radius: 22px; background: #000;
  box-shadow: 0 18px 50px var(--shadow);
  img { width: min(31%, 300px); }
  .mid { width: min(38%, 380px); }
}
.cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.cat {
  display: flex; flex-direction: column; gap: 4px; transition: border-color 0.2s, transform 0.2s;
  .photo { height: 150px; display: grid; place-items: center; margin-bottom: 6px; overflow: hidden; border-radius: 10px; background: #000; }
  .photo img { max-height: 100%; max-width: 100%; object-fit: contain; transition: transform 0.3s; }
  .display { font-size: 1.4rem; color: var(--green); }
  &:hover { border-color: var(--green); transform: translateY(-3px); .photo img { transform: scale(1.06); } }
}
.info { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 40px; h3 { font-size: 1rem; color: var(--muted); margin-bottom: 6px; svg { color: var(--green); } } .price { font-size: 1.5rem; } }
</style>
