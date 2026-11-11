<script setup>
import { RouterLink } from 'vue-router';
import { useMenuStore } from '../stores/menu';
import { useThemeStore } from '../stores/theme';
import { money } from '../api';
import { loc } from '../i18n';
import AppIcon from '../components/AppIcon.vue';

const menu = useMenuStore();
const theme = useThemeStore();

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
      <p class="lead">{{ $t('home.lead') }}</p>
      <div class="actions">
        <RouterLink to="/menu" class="btn">{{ $t('home.viewMenu') }}</RouterLink>
        <a href="tel:+998888770810" class="btn ghost"><AppIcon name="delivery" /> {{ $t('home.delivery') }}</a>
      </div>
      <div class="showcase">
        <img :src="theme.img('hotdog')" alt="Hot dog" @error="theme.fallback" />
        <img :src="theme.img('lavash')" alt="Lavash" class="mid" @error="theme.fallback" />
        <img :src="theme.img('donar')" alt="Donar" @error="theme.fallback" />
      </div>
    </div>
  </section>

  <section class="container">
    <h2 class="section-title">{{ $t('home.categories') }}</h2>
    <div class="cats">
      <RouterLink v-for="c in menu.categories" :key="c.id" :to="{ path: '/menu', hash: '#' + c.id }" class="card cat">
        <div class="photo"><img :src="theme.img(c.image)" :alt="loc(c.names, c.name)" loading="lazy" @error="theme.fallback" /></div>
        <span class="display">{{ loc(c.names, c.name) }}</span>
        <small class="muted">{{ $t('home.kinds', { n: menu.byCategory(c.id).length, price: fromPrice(c.id) }) }}</small>
      </RouterLink>
    </div>
    <p v-if="menu.error" class="error">{{ $t('home.loadError', { e: menu.error }) }}</p>
  </section>

  <section class="container info">
    <div class="card">
      <h3><AppIcon name="instagram" /> Instagram</h3>
      <a href="https://instagram.com/avazbek_fastfood" target="_blank" rel="noopener" class="price">@avazbek_fastfood</a>
    </div>
    <div class="card">
      <h3><AppIcon name="phone" /> {{ $t('home.orderPhone') }}</h3>
      <a href="tel:+998972120393" class="price">97 212 03 93</a>
    </div>
    <div class="card">
      <h3><AppIcon name="delivery" /> {{ $t('home.delivery') }}</h3>
      <a href="tel:+998888770810" class="price">88 877 08 10</a>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  padding-block: clamp(36px, 8vw, 72px) 40px; text-align: center;
  h1 { font-size: clamp(2.8rem, 9vw, 5.5rem); line-height: 1; span { color: var(--green-bright); display: block; font-size: 0.55em; letter-spacing: 0.5em; margin-top: 6px; } }
  .tag { color: var(--green); letter-spacing: 0.3em; margin-bottom: 12px; }
  .lead { max-width: 560px; margin: 20px auto 28px; color: var(--muted); font-size: 1.1rem; }
  .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
}
.showcase {
  // Rasmlarning foni qora, shuning uchun ikkala mavzuda ham qora yumaloq panelda turadi
  display: flex; justify-content: center; align-items: center; gap: 8px; margin: clamp(26px, 5vw, 44px) auto 0;
  max-width: 880px; padding: clamp(8px, 2vw, 18px); border-radius: 22px; background: var(--img-bg);
  box-shadow: 0 18px 50px var(--shadow);
  img { width: min(31%, 300px); }
  .mid { width: min(38%, 380px); }
}
.cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(230px, 100%), 1fr)); gap: 14px; }
@media (max-width: 520px) { .cats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .cat { padding: 12px; .photo { height: 110px; } .display { font-size: 1.1rem; } } }
.cat {
  display: flex; flex-direction: column; gap: 4px; transition: border-color 0.2s, transform 0.2s;
  min-width: 0; overflow-wrap: anywhere;
  .photo { height: 150px; display: grid; place-items: center; margin-bottom: 6px; overflow: hidden; border-radius: 10px; background: var(--img-bg); }
  .photo img { max-height: 100%; max-width: 100%; object-fit: contain; transition: transform 0.3s; }
  .display { font-size: 1.4rem; color: var(--green); }
  &:hover { border-color: var(--green); transform: translateY(-3px); .photo img { transform: scale(1.06); } }
}
.info { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 14px; margin-top: 40px; h3 { font-size: 1rem; color: var(--muted); margin-bottom: 6px; svg { color: var(--green); } } .price { font-size: 1.5rem; } }
</style>
