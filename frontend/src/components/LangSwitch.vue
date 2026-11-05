<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { LANGS, lang, setLang } from '../i18n';
import AppIcon from './AppIcon.vue';

const open = ref(false);
const root = ref(null);

function pick(code) {
  setLang(code);
  open.value = false;
}
const onDoc = (e) => {
  if (root.value && !root.value.contains(e.target)) open.value = false;
};
const onKey = (e) => e.key === 'Escape' && (open.value = false);
onMounted(() => {
  document.addEventListener('click', onDoc);
  document.addEventListener('keydown', onKey);
});
onUnmounted(() => {
  document.removeEventListener('click', onDoc);
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div ref="root" class="lang">
    <button
      class="btn small ghost cur"
      :aria-label="$t('lang.title')"
      :title="$t('lang.title')"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open = !open"
    >
      <AppIcon name="globe" :size="18" />
      <span class="code">{{ lang.toUpperCase() }}</span>
    </button>
    <ul v-if="open" class="menu" role="listbox">
      <li v-for="l in LANGS" :key="l.code" role="option" :aria-selected="l.code === lang">
        <button :class="{ on: l.code === lang }" @click="pick(l.code)">
          <b>{{ l.short }}</b> {{ l.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.lang { position: relative; }
.cur { gap: 5px; padding-inline: 9px; }
.code { font-weight: 700; font-size: 0.85rem; letter-spacing: 0.04em; }
.menu {
  position: absolute; right: 0; top: calc(100% + 8px); z-index: 50; list-style: none; min-width: 160px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 6px;
  box-shadow: 0 14px 40px var(--shadow);
  button {
    width: 100%; text-align: left; background: none; border: 0; color: var(--text); padding: 10px 12px;
    border-radius: 8px; display: flex; gap: 10px; align-items: baseline; min-height: 40px;
    b { color: var(--green-bright); width: 26px; font-size: 0.8rem; }
    &:hover, &.on { background: var(--glow); }
    &.on { color: var(--green-bright); }
  }
}
</style>
