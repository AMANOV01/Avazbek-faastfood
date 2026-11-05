<script setup>
import { computed } from 'vue';
import { useCartStore } from '../stores/cart';
import { useMenuStore } from '../stores/menu';
import { money } from '../api';
import { loc } from '../i18n';
import { promosOf, unitPrice, promoText } from '../utils/promo';

const props = defineProps({ product: { type: Object, required: true } });
const cart = useCartStore();
const menu = useMenuStore();

const qty = computed(() => cart.qtyOf(props.product.id));
const promos = computed(() => promosOf(props.product.id, menu.promos));
// Savatdagi miqdorga qarab joriy narx (aksiya bo'lsa arzonroq)
const unit = computed(() => unitPrice(props.product, qty.value || 1, menu.promos));
</script>

<template>
  <div class="row" :class="{ 'has-thumb': product.image }">
    <img v-if="product.image" :src="product.image" :alt="loc(product.names, product.name)" class="thumb" loading="lazy" />
    <div class="info">
      <span class="name">{{ loc(product.names, product.name) }}</span>
      <small v-for="pr in promos" :key="pr.id" class="hint" :class="{ hit: qty >= pr.minQty }">{{ promoText(pr) }}</small>
    </div>
    <span class="dots" aria-hidden="true"></span>
    <span class="price-box">
      <s v-if="unit < product.price" class="old">{{ money(product.price) }}</s>
      <span class="price">{{ money(unit) }}</span>
    </span>
    <div class="ctl">
      <template v-if="qty">
        <button class="btn small ghost" :aria-label="$t('common.dec')" @click="cart.remove(product.id)">−</button>
        <b>{{ qty }}</b>
        <button class="btn small" :aria-label="$t('common.inc')" @click="cart.add(product)">+</button>
      </template>
      <button v-else class="btn small" @click="cart.add(product)">{{ $t('common.add') }}</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.row { display: flex; align-items: center; gap: 10px; padding-block: 9px; }
.thumb { width: 52px; height: 52px; object-fit: cover; border-radius: 10px; background: #000; flex: none; }
.info { display: flex; flex-direction: column; min-width: 0; }
.name { overflow-wrap: anywhere; }
.hint { color: var(--green-bright); font-size: 0.8rem; line-height: 1.3; opacity: 0.85; &.hit { opacity: 1; font-weight: 600; } }
.dots { flex: 1; border-bottom: 2px dotted var(--dots); transform: translateY(4px); min-width: 12px; }
.price-box { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.15; }
.old { color: var(--muted); font-size: 0.8rem; }
.ctl { display: flex; align-items: center; gap: 8px; min-width: 112px; justify-content: flex-end; b { min-width: 18px; text-align: center; } }

// Telefon: nom va narx yuqorida, tugmalar pastda — hech narsa siqilib qolmaydi
@media (max-width: 520px) {
  .row { display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'info price' 'ctl ctl'; gap: 4px 12px; padding-block: 11px; border-bottom: 1px solid var(--line); }
  .row.has-thumb { grid-template-columns: auto 1fr auto; grid-template-areas: 'thumb info price' 'thumb ctl ctl'; }
  .thumb { grid-area: thumb; width: 64px; height: 64px; align-self: center; }
  .info { grid-area: info; }
  .price-box { grid-area: price; }
  .ctl { grid-area: ctl; justify-content: flex-end; }
  .dots { display: none; }
}
</style>
