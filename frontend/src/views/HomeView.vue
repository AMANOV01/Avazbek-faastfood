<script setup>
import { RouterLink } from 'vue-router';
import { useMenuStore } from '../stores/menu';
import { useThemeStore } from '../stores/theme';
import { money } from '../api';
import { loc } from '../i18n';
import AppIcon from '../components/AppIcon.vue';

const menu = useMenuStore();
const theme = useThemeStore();
// Kategoriya kartalari uchun menyu rasmidagi ranglar: qizil, to'q sariq, yashil
const tones = ['var(--green-bright)', 'var(--accent2)', 'var(--accent3)'];

function fromPrice(id) {
  const prices = menu.byCategory(id).map((p) => p.price);
  return prices.length ? money(Math.min(...prices)) : '';
}
</script>

<template>
  <section class="hero">
    <div class="container hero-grid">
      <div class="copy rise">
        <p class="display tag"><span class="live"></span>Hot Doglari</p>
        <h1>AVAZBEK <span>LAVASH</span></h1>
        <p class="lead">{{ $t('home.lead') }}</p>
        <div class="actions">
          <RouterLink to="/menu" class="btn big">{{ $t('home.viewMenu') }}</RouterLink>
          <a href="tel:+998888770810" class="btn ghost big"><AppIcon name="delivery" /> {{ $t('home.delivery') }}</a>
        </div>
        <ul class="perks">
          <li><AppIcon name="delivery" :size="18" />{{ $t('home.perk1') }}</li>
          <li><AppIcon name="pin" :size="18" />{{ $t('home.perk2') }}</li>
          <li><AppIcon name="card" :size="18" />{{ $t('home.perk3') }}</li>
        </ul>
      </div>
      <div class="showcase rise" style="animation-delay: 0.12s">
        <img :src="theme.img('lavash')" alt="Lavash" class="a" @error="theme.fallback" />
        <img :src="theme.img('hotdog')" alt="Hot dog" class="b" @error="theme.fallback" />
        <img :src="theme.img('donar')" alt="Donar" class="c" @error="theme.fallback" />
      </div>
    </div>
  </section>

  <section class="container">
    <h2 class="section-title">{{ $t('home.categories') }}</h2>
    <div class="cats">
      <RouterLink v-for="(c, i) in menu.categories" :key="c.id" :to="{ path: '/menu', hash: '#' + c.id }" class="card cat rise" :style="{ '--tone': tones[i % tones.length], animationDelay: i * 0.05 + 's' }">
        <div class="photo"><img :src="theme.img(c.image)" :alt="loc(c.names, c.name)" loading="lazy" @error="theme.fallback" /></div>
        <span class="display">{{ loc(c.names, c.name) }}</span>
        <small class="muted">{{ $t('home.kinds', { n: menu.byCategory(c.id).length, price: fromPrice(c.id) }) }}</small>
      </RouterLink>
    </div>
    <p v-if="menu.error" class="error">{{ $t('home.loadError', { e: menu.error }) }}</p>
  </section>

  <section class="container info">
    <a class="card contact" href="https://instagram.com/avazbek_fastfood" target="_blank" rel="noopener">
      <span class="bubble"><AppIcon name="instagram" :size="22" /></span>
      <span><small class="muted">Instagram</small><b class="price">@avazbek_fastfood</b></span>
    </a>
    <a class="card contact" href="tel:+998972120393">
      <span class="bubble"><AppIcon name="phone" :size="22" /></span>
      <span><small class="muted">{{ $t('home.orderPhone') }}</small><b class="price">97 212 03 93</b></span>
    </a>
    <a class="card contact" href="tel:+998888770810">
      <span class="bubble"><AppIcon name="delivery" :size="22" /></span>
      <span><small class="muted">{{ $t('home.delivery') }}</small><b class="price">88 877 08 10</b></span>
    </a>
  </section>
</template>

<style scoped lang="scss">
.hero { padding-block: clamp(28px, 6vw, 64px) 24px; position: relative; }
.hero-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: clamp(20px, 4vw, 56px); align-items: center; }
.copy {
  h1 { font-size: clamp(2.8rem, 8vw, 5.6rem); line-height: 0.98; span { color: var(--green-bright); display: block; font-size: 0.5em; letter-spacing: 0.42em; margin-top: 8px; } }
  .tag { display: inline-flex; align-items: center; gap: 10px; color: var(--muted); letter-spacing: 0.3em; margin-bottom: 14px; font-size: 0.95rem;
    padding: 6px 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); }
  .live { width: 8px; height: 8px; border-radius: 50%; background: var(--accent3); box-shadow: 0 0 0 4px var(--glow); }
  .lead { max-width: 520px; margin: 20px 0 26px; color: var(--muted); font-size: 1.1rem; }
  .actions { display: flex; gap: 12px; flex-wrap: wrap; }
  .big { padding: 14px 28px; font-size: 1.02rem; }
}
.perks { list-style: none; display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 26px; li { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 0.92rem; svg { color: var(--green-bright); } } }

// Rasmlar yumaloq "likopcha"da ustma-ust turadi
.showcase {
  position: relative; aspect-ratio: 1 / 0.92; width: 100%; max-width: 520px; justify-self: center;
  border-radius: 36px; background: radial-gradient(circle at 50% 40%, var(--panel), transparent 72%); border: 1px solid var(--line); box-shadow: var(--card-shadow);
  img { position: absolute; width: 56%; border-radius: 22px; background: var(--img-bg); box-shadow: 0 16px 40px var(--shadow); object-fit: cover; aspect-ratio: 4 / 3; }
  .a { left: 0; top: 8%; transform: rotate(-5deg); animation: float 7s ease-in-out infinite; }
  .b { right: 0; top: 3%; transform: rotate(4deg); animation: float 8s ease-in-out -2s infinite; }
  .c { left: 22%; bottom: 3%; width: 60%; z-index: 2; animation: float 9s ease-in-out -4s infinite; }
}

.cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr)); gap: 16px; }
.cat {
  position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; overflow: hidden; overflow-wrap: anywhere;
  transition: border-color 0.2s, transform 0.25s, box-shadow 0.25s;
  &::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--tone); }
  .photo { height: 150px; display: grid; place-items: center; margin-bottom: 8px; overflow: hidden; border-radius: 12px; background: var(--img-bg); }
  .photo img { max-height: 100%; max-width: 100%; object-fit: contain; transition: transform 0.35s; }
  .display { font-size: 1.4rem; color: var(--tone); }
  &:hover { border-color: var(--tone); transform: translateY(-4px); box-shadow: 0 16px 36px var(--shadow); .photo img { transform: scale(1.08); } }
}
.info { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr)); gap: 16px; margin-top: 44px; }
.contact { display: flex; align-items: center; gap: 14px; transition: transform 0.2s, border-color 0.2s; &:hover { transform: translateY(-3px); border-color: var(--green); }
  span:last-child { display: flex; flex-direction: column; min-width: 0; } .price { font-size: 1.35rem; }
  .bubble { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; background: var(--glow); color: var(--green-bright); flex: none; } }

@media (max-width: 860px) {
  .hero-grid { grid-template-columns: 1fr; text-align: center; }
  .copy { .lead { margin-inline: auto; } .actions, .perks { justify-content: center; } }
  .showcase { max-width: 420px; }
}
@media (max-width: 520px) {
  .cats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .cat { padding: 12px; .photo { height: 104px; } .display { font-size: 1.1rem; } }
}
</style>
