// AVAZBEK LAVASH menyusi (narxlar so'mda)
// image — frontend/public/images/ ichidagi fayl nomi (kengaytmasiz).
// O'z rasmlaringizni shu nom bilan almashtirsangiz bo'ldi.
export const categories = [
  { id: 'lavash', name: 'Lavash', image: 'lavash' },
  { id: 'donar', name: 'Donar', image: 'donar' },
  { id: 'hotdog', name: 'Hot Dog', image: 'hotdog' },
  { id: 'bighotdog', name: 'Big Hot Dog', image: 'hotdog' },
  { id: 'haggi', name: 'Haggi', image: 'haggi' },
  { id: 'choy', name: 'Choy', image: 'choy' },
  { id: 'kofe', name: 'Kofe', image: 'kofe' },
  { id: 'muzqaymoq', name: 'Muzqaymoq', image: 'muzqaymoq' },
];

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
  price,
  available: true,
}));

export const brand = {
  name: 'AVAZBEK LAVASH',
  tagline: 'Hot Doglari',
  instagram: 'avazbek_fastfood',
  phones: ['+998 97 212 03 93', '+998 88 877 08 10'],
};
