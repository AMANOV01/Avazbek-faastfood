<script setup>
import { useNotifyStore } from '../stores/notify';
import AppIcon from './AppIcon.vue';

const notify = useNotifyStore();
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <div v-for="t in notify.toasts" :key="t.id" class="toast" :class="t.kind">
      <AppIcon name="bell" :size="20" />
      <div class="msg"><b>{{ t.title }}</b><span v-if="t.body">{{ t.body }}</span></div>
      <button :aria-label="$t('common.close')" @click="notify.dismiss(t.id)"><AppIcon name="close" :size="16" /></button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.toasts {
  position: fixed; z-index: 100; top: calc(12px + env(safe-area-inset-top)); right: 12px;
  width: min(380px, calc(100vw - 24px)); display: grid; gap: 8px; pointer-events: none;
}
.toast {
  pointer-events: auto; display: flex; gap: 12px; align-items: flex-start;
  background: var(--panel); border: 1px solid var(--green); border-radius: 12px; padding: 12px 14px;
  box-shadow: 0 12px 36px var(--shadow); animation: in 0.25s ease;
  > svg { color: var(--green-bright); margin-top: 2px; }
  .msg { flex: 1; display: grid; gap: 2px; word-break: break-word; span { color: var(--muted); font-size: 0.9rem; } }
  button { background: none; border: 0; color: var(--muted); padding: 4px; }
}
@keyframes in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@media (max-width: 560px) { .toasts { right: 12px; left: 12px; width: auto; } }
</style>
