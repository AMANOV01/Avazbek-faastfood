<script setup>
import { onMounted, ref } from 'vue';
import { useOrdersStore } from '../stores/orders';
import { isIosBrowser, permission, pushSupported } from '../utils/push';
import AppIcon from './AppIcon.vue';

const orders = useOrdersStore();
const state = ref('hidden'); // hidden | ask | on | denied | ios | unsupported
const busy = ref(false);

function evaluate() {
  if (!pushSupported()) state.value = isIosBrowser() ? 'ios' : 'unsupported';
  else if (permission() === 'granted') state.value = 'on';
  else if (permission() === 'denied') state.value = 'denied';
  else state.value = 'ask';
}
async function enable() {
  busy.value = true;
  await orders.enablePush();
  busy.value = false;
  evaluate();
}
onMounted(evaluate);
</script>

<template>
  <div v-if="state !== 'hidden'" class="notify card" :class="state">
    <AppIcon name="bell" :size="22" />
    <template v-if="state === 'ask'">
      <span>{{ $t('notif.prompt') }}</span>
      <button class="btn small" :disabled="busy" @click="enable">{{ $t('notif.enable') }}</button>
    </template>
    <span v-else-if="state === 'on'">{{ $t('notif.on') }}</span>
    <span v-else-if="state === 'denied'">{{ $t('notif.denied') }}</span>
    <span v-else-if="state === 'ios'">{{ $t('notif.ios') }}</span>
    <span v-else>{{ $t('notif.unsupported') }}</span>
  </div>
</template>

<style scoped lang="scss">
.notify { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 12px 14px; > svg { color: var(--green-bright); flex: none; } span { flex: 1; font-size: 0.95rem; } &.on span { color: var(--muted); } }
@media (max-width: 480px) { .notify { flex-wrap: wrap; button { width: 100%; } } }
</style>
