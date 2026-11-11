import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { t, loc } from './i18n';
import { useThemeStore } from './stores/theme';
import { useOrdersStore } from './stores/orders';
import { permission, registerWorker } from './utils/push';
import './styles/main.scss';

const app = createApp(App).use(createPinia()).use(router);
app.config.globalProperties.$t = t; // shablonlarda {{ $t('kalit') }}
app.config.globalProperties.$loc = loc;
const theme = useThemeStore();
theme.apply();
theme.probeDayImages();
app.mount('#app');

// Bildirishnoma ruxsati berilgan bo'lsa, service worker yangilanib turadi.
// Sahifa ochiq paytda push kelsa, service worker bizga xabar beradi — ma'lumotni darhol yangilaymiz.
if ('serviceWorker' in navigator) {
  if (permission() === 'granted') registerWorker();
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type !== 'push') return;
    window.dispatchEvent(new Event('avz:push'));
    useOrdersStore().refresh();
  });
}
