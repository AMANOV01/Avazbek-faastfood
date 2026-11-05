import { ref, computed } from 'vue';
import uz from './uz';
import ru from './ru';
import en from './en';

// Yangi til qo'shish: 1) shu papkada yangi fayl (masalan tr.js) yarating, uz.js dan nusxa oling va tarjima qiling;
// 2) pastdagi ikki ro'yxatga qo'shing; 3) backend/src/menu.js dagi `names` va push.js dagi matnlarga ham qo'shing.
export const LANGS = [
  { code: 'uz', short: 'UZ', label: "O'zbekcha", locale: 'uz-UZ' },
  { code: 'ru', short: 'RU', label: 'Русский', locale: 'ru-RU' },
  { code: 'en', short: 'EN', label: 'English', locale: 'en-GB' },
];
const messages = { uz, ru, en };
const KEY = 'avz_lang';

function read() {
  try {
    const v = localStorage.getItem(KEY);
    if (messages[v]) return v;
  } catch {
    /* localStorage yopiq bo'lishi mumkin */
  }
  return 'uz';
}

export const lang = ref(read());
export const locale = computed(() => LANGS.find((l) => l.code === lang.value).locale);

export function setLang(code) {
  if (!messages[code]) return;
  lang.value = code;
  document.documentElement.lang = code;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* saqlab bo'lmasa ham ishlayveradi */
  }
}

// t('kalit', { n: 3 }) — tanlangan tilda matn; topilmasa o'zbekcha, u ham bo'lmasa kalitning o'zi
export function t(key, params) {
  const text = messages[lang.value]?.[key] ?? messages.uz[key] ?? key;
  return params ? text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '') : text;
}

// Mahsulot/bo'lim nomi: {uz, ru, en} dan tanlangan til, bo'lmasa o'zbekcha
export function loc(names, fallback = '') {
  return names?.[lang.value] || names?.uz || fallback;
}

// Sana qo'lda formatlanadi: brauzer o'zbekcha sana ma'lumotiga ega bo'lmasa ham to'g'ri chiqadi (05.11.2026 09:17)
const pad = (n) => String(n).padStart(2, '0');
export function formatDate(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
export function formatDay(ymd) {
  const d = new Date(ymd + 'T12:00:00');
  if (lang.value === 'uz') return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
  return d.toLocaleDateString(locale.value, { day: 'numeric', month: 'long' });
}

document.documentElement.lang = lang.value;
