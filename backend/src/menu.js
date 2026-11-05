// AVAZBEK LAVASH menyusi (narxlar so'mda)
// image — frontend/public/images/ ichidagi fayl nomi (kengaytmasiz).
// O'z rasmlaringizni shu nom bilan almashtirsangiz bo'ldi.
// names — har bir til uchun nom (yangi til qo'shsangiz shu yerga ham kalit qo'shing)
const cat = (id, uz, ru, en, image) => ({ id, name: uz, names: { uz, ru, en }, image });
export const categories = [
  cat('lavash', 'Lavash', 'Лаваш', 'Lavash', 'lavash'),
  cat('donar', 'Donar', 'Донер', 'Doner', 'donar'),
  cat('hotdog', 'Hot Dog', 'Хот-дог', 'Hot Dog', 'hotdog'),
  cat('bighotdog', 'Big Hot Dog', 'Большой хот-дог', 'Big Hot Dog', 'hotdog'),
  cat('haggi', 'Haggi', 'Хагги', 'Haggi', 'haggi'),
  cat('choy', 'Choy', 'Чай', 'Tea', 'choy'),
  cat('kofe', 'Kofe', 'Кофе', 'Coffee', 'kofe'),
  cat('muzqaymoq', 'Muzqaymoq', 'Мороженое', 'Ice cream', 'muzqaymoq'),
];

// Mavjud mahsulotlarning rus va ingliz tilidagi nomlari (o'zbekcha nom bo'yicha)
export const translations = {
  'Mini Lavash': ['Мини лаваш', 'Mini Lavash'],
  "O'rta Lavash": ['Средний лаваш', 'Medium Lavash'],
  'Katta Lavash': ['Большой лаваш', 'Large Lavash'],
  "Sir qo'shish": ['Добавить сыр', 'Extra cheese'],
  'Mini Donar': ['Мини донер', 'Mini Doner'],
  "O'rta Donar": ['Средний донер', 'Medium Doner'],
  'Katta Donar': ['Большой донер', 'Large Doner'],
  'Mini hot dog': ['Мини хот-дог', 'Mini hot dog'],
  'Salatli hot dog': ['Хот-дог с салатом', 'Hot dog with salad'],
  'Kolbasali hot dog': ['Хот-дог с колбасой', 'Sausage hot dog'],
  'Ajoyib hot dog': ['Великолепный хот-дог', 'Wonderful hot dog'],
  'Kotletli hot dog': ['Хот-дог с котлетой', 'Cutlet hot dog'],
  'Myasnoy hot dog': ['Мясной хот-дог', 'Meat hot dog'],
  'Salatli big hot dog': ['Большой хот-дог с салатом', 'Big hot dog with salad'],
  'Myasnoy big hot dog': ['Большой мясной хот-дог', 'Big meat hot dog'],
  'Kotletli big hot dog': ['Большой хот-дог с котлетой', 'Big cutlet hot dog'],
  'Haggi (kichik)': ['Хагги (малый)', 'Haggi (small)'],
  'Haggi (katta)': ['Хагги (большой)', 'Haggi (large)'],
  'Oddiy choy': ['Обычный чай', 'Plain tea'],
  'Limonli choy': ['Чай с лимоном', 'Tea with lemon'],
  'MacCoffee': ['MacCoffee', 'MacCoffee'],
  'Cappuccino': ['Капучино', 'Cappuccino'],
  'Nescafe gold': ['Nescafe gold', 'Nescafe gold'],
  'Jacobs': ['Jacobs', 'Jacobs'],
  'Quyma kichik': ['Мягкое мороженое (малое)', 'Soft serve (small)'],
  "Quyma o'rta": ['Мягкое мороженое (среднее)', 'Soft serve (medium)'],
  'Quyma katta': ['Мягкое мороженое (большое)', 'Soft serve (large)'],
  'Soboy': ['С собой', 'Take-away'],
};

export function namesFor(uz) {
  const [ru, en] = translations[uz] || [uz, uz];
  return { uz, ru, en };
}

const items = [
  ['lavash', 'Mini Lavash', 30000],
  ['lavash', "O'rta Lavash", 35000],
  ['lavash', 'Katta Lavash', 45000],
  ['lavash', "Sir qo'shish", 4000],

  ['donar', 'Mini Donar', 30000],
  ['donar', "O'rta Donar", 35000],
  ['donar', 'Katta Donar', 45000],
  ['donar', "Sir qo'shish", 4000],

  ['hotdog', 'Mini hot dog', 15000],
  ['hotdog', 'Salatli hot dog', 20000],
  ['hotdog', 'Kolbasali hot dog', 20000],
  ['hotdog', 'Ajoyib hot dog', 25000],
  ['hotdog', 'Kotletli hot dog', 30000],
  ['hotdog', 'Myasnoy hot dog', 28000],

  ['bighotdog', 'Salatli big hot dog', 35000],
  ['bighotdog', 'Myasnoy big hot dog', 50000],
  ['bighotdog', 'Kotletli big hot dog', 55000],

  ['haggi', 'Haggi (kichik)', 35000],
  ['haggi', 'Haggi (katta)', 45000],
  ['haggi', "Sir qo'shish", 4000],

  ['choy', 'Oddiy choy', 2000],
  ['choy', 'Limonli choy', 6000],

  ['kofe', 'MacCoffee', 5000],
  ['kofe', 'Cappuccino', 5000],
  ['kofe', 'Nescafe gold', 8000],
  ['kofe', 'Jacobs', 8000],

  ['muzqaymoq', 'Quyma kichik', 7000],
  ['muzqaymoq', "Quyma o'rta", 10000],
  ['muzqaymoq', 'Quyma katta', 15000],
  ['muzqaymoq', 'Soboy', 25000],
];

export const products = items.map(([category, name, price], i) => ({
  id: i + 1,
  category,
  name,
  names: namesFor(name),
  price,
  available: true,
  image: '',
}));

export const brand = {
  name: 'AVAZBEK LAVASH',
  tagline: 'Hot Doglari',
  instagram: 'avazbek_fastfood',
  phones: ['+998 97 212 03 93', '+998 88 877 08 10'],
  deliveryFee: 8000,
};
