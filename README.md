# AVAZBEK LAVASH — Hot Doglari

Fastfood buyurtma tizimi: Vue 3 sayt + Express backend + Flutter ilova.

```
backend/      Express API (ma'lumotlar PostgreSQL'da)
frontend/     Vue 3 + Vite + Pinia + Vue Router + SCSS
flutter_app/  Flutter/Dart mobil ilova
```

## Ishga tushirish

Backend (1-terminal) — avval `DATABASE_URL` kerak (pastdagi "Ma'lumotlar bazasi" bo'limi):
```
cd backend
npm install
DATABASE_URL='postgresql://...' npm start     # http://localhost:4000
```
Admin paroli: `avazbek123` (o'zgartirish: `ADMIN_PASSWORD=yangi npm start`).

Frontend (2-terminal):
```
cd frontend
npm install
npm run dev          # http://localhost:5173  (/api avtomatik backendga yo'naltiriladi)
```

Flutter: `flutter_app/android_manifest_note.md` ga qarang.

## Yangi imkoniyatlar (v4)
- **Til**: UZ / RU / EN (tepada o'ng tomonda). Yangi til qo'shish: `frontend/src/i18n/index.js` dagi izohga qarang.
- **Admin tugmasi** sayt tepasida, savat oldida. Sayt telefon, planshet va kompyuterda moslashadi.
- **Mahsulotlar** (admin): yangi mahsulot qo'shish (nomi UZ/RU/EN, narxi, bo'limi, rasmi), tahrirlash, o'chirish.
- **Aksiyalar** (admin): "kamida N dona olinsa, foiz yoki so'm chegirma". Faol aksiyalar saytning eng tepasida banner bo'lib ko'rinadi, narx server tomonda hisoblanadi.
- **Bildirishnomalar** (Web Push): yangi buyurtma adminga, holat o'zgarsa (tayyorlanmoqda, yo'lda...) mijozga boradi. Admin panelda qo'ng'iroqcha tugmasini bosib ruxsat bering; mijozga buyurtma berganda ruxsat so'raladi.
- **Buyurtmalarim**: mijoz o'z buyurtmalarini va jarayonini ko'radi (brauzerda saqlanadi).

## Imkoniyatlar
- Menyu (8 kategoriya, barcha narxlar rasmdagi menyudan)
- Savat, yetkazib berish (8 000 so'm) yoki olib ketish
- Buyurtma holatini kuzatish (har 10 soniyada yangilanadi)
- Admin (`/admin`): buyurtmalar, mahsulotlar, aksiyalar

## Eslatma
Narxlar server tomonda hisoblanadi (mijoz yuborgan narxga ishonilmaydi).
Yetkazib berish narxi (8 000) men qo'ygan taxminiy qiymat — `backend/src/server.js` va `flutter_app/lib/config.dart` da o'zgartiring.

## Bildirishnomalar haqida
- Faqat **HTTPS** (yoki localhost) da ishlaydi. Render va domen HTTPS beradi.
- iPhone'da sayt Safari orqali "Ekranga qo'shish" qilinib, o'sha ikonkadan ochilganda bildirishnoma keladi.
- VAPID kalitlari birinchi ishga tushishda yaratilib bazada saqlanadi. `VAPID_PUBLIC_KEY` va `VAPID_PRIVATE_KEY` muhit o'zgaruvchilari bilan doimiy qilish mumkin.
- Sayt ochiq bo'lsa, bildirishnomaga qo'shimcha sahifa ichida ham xabar chiqadi.

## Ma'lumotlar bazasi (PostgreSQL)
Mahsulotlar, aksiyalar, buyurtmalar, bildirishnoma obunalari va yuklangan **rasmlar** PostgreSQL'da saqlanadi,
shuning uchun Render'da qayta deploy qilinsa ham yo'qolmaydi. Jadvallar server birinchi ishga tushganda o'zi yaratiladi
va boshlang'ich menyu bir marta yoziladi.

1. Neon (neon.tech) yoki Supabase'da bepul Postgres oching va **connection string** ni nusxalang
   (`postgresql://user:parol@host/dbname?sslmode=require`).
2. Render → servis → **Environment** → `DATABASE_URL` nomi bilan qo'shing (parolni GitHub'ga yozmang).
3. Kompyuteringizda sinash: `DATABASE_URL='postgresql://...' npm start` (backend papkasida).

Zaxira nusxa: `pg_dump "$DATABASE_URL" > zaxira.sql`.

## v5 yangiliklari
- **Xaritadan lokatsiya**: yetkazib berishda manzil qo'lda yozilmaydi — mijoz xaritada joyni bosadi/pinni suradi yoki **"Men turgan joy"** tugmasini bosadi (brauzer joylashuvga ruxsat so'raydi; HTTPS kerak). Xarita — OpenStreetMap + Leaflet (kalit/to'lov kerak emas). Admin buyurtmada "Xaritada ochish" havolasini ko'radi. Xarita boshlang'ich markazi: `backend/src/menu.js` → `brand.mapCenter` (hozir Toshkent).
- **Kun/tun rejimi**: tepadagi quyosh/oy tugmasi. Kunduzgi dizayn menyu rasmiga mos (och ko'k-oq, to'q ko'k, qizil). Kunduzgi mahsulot rasmlarini `frontend/public/images/day/` ga qo'ying (`lavash.jpg, donar.jpg, hotdog.jpg, haggi.jpg, choy.jpg, kofe.jpg, muzqaymoq.jpg`) — kun rejimida shular chiqadi, bo'lmasa tungilari.
- **Promokod**: admin → "Promokodlar" bo'limida yaratiladi (foiz yoki summa, minimal buyurtma, tugash sanasi, jami ishlatish limiti). Har bir telefon raqam bitta promokodni faqat **bir marta** ishlata oladi; limitga 1 yozilsa, kod birinchi ishlatilgandan keyin hamma uchun o'chadi. Chegirma mahsulotlar summasiga qo'llanadi.
<<<<<<< HEAD
- **To'lov usuli oynasi**: "Buyurtma berish" bosilgach alohida oynada Naxd / Karta tanlanadi; karta bo'lsa **Uzcard** yoki **Humo**. Tanlov buyurtma bilan saqlanadi va adminda ko'rinadi. (Onlayn to'lov — Click/Payme — ulanmagan: hozircha karta bilan to'lov buyurtma olinganda amalga oshadi.)
=======
- **To'lov usuli oynasi**: "Buyurtma berish" bosilgach alohida oynada Naxd / Karta tanlanadi. Karta tanlansa do'kon kartasi (raqam, egasi, nusxalash tugmasi) darhol chiqadi; mijoz o'tkazgach "To'lov qildim" ni bosadi. Shundagina buyurtma "To'lov tekshirilmoqda" holatida yaratiladi va adminga bildirishnoma boradi. Admin pul kartaga tushganini ko'rib "To'lov tushdi, tayyorlash" ni bosmaguncha buyurtma oshxonaga o'tmaydi. Karta raqami: admin → **Sozlamalar**. Raqam kiritilmasa, karta tanlovi o'chiq turadi. (Click/Payme avtomatik tekshiruvi ulanmagan.)
>>>>>>> 59b5c6d (v6, kartali tolov upgrade, design)
- Baza jadvallari (`promo_codes`, `promo_code_uses`, `orders` yangi ustunlar) server ishga tushganda o'zi qo'shiladi.
