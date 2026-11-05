<script setup>
import AppLogo from './AppLogo.vue';
import AppIcon from './AppIcon.vue';
</script>

<template>
  <footer>
    <div class="container inner">
      <AppLogo />
      <div class="links">
        <a href="https://instagram.com/avazbek_fastfood" target="_blank" rel="noopener"><AppIcon name="instagram" /> @avazbek_fastfood</a>
        <a href="tel:+998972120393"><AppIcon name="phone" /> 97 212 03 93</a>
        <a href="tel:+998888770810"><AppIcon name="delivery" /> 88 877 08 10 ({{ $t('footer.delivery') }})</a>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
footer { border-top: 1px solid var(--line); padding-block: 28px; background: var(--footer-bg); }
.inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; }
.links { display: flex; flex-direction: column; gap: 6px; a { color: var(--text); &:hover { color: var(--green-bright); } svg { color: var(--green); margin-right: 4px; } } }
@media (max-width: 520px) { .inner { flex-direction: column; align-items: flex-start; } }
</style>
