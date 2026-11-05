# AVAZBEK LAVASH — Hot Doglari

Fastfood buyurtma tizimi: Vue 3 sayt + Express backend + Flutter ilova.

```
backend/      Express API (ma'lumotlar data/db.json da)
frontend/     Vue 3 + Vite + Pinia + Vue Router + SCSS
flutter_app/  Flutter/Dart mobil ilova
```

## Ishga tushirish

Backend (1-terminal):
```
cd backend
npm install
npm start            # http://localhost:4000
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
- VAPID kalitlari birinchi ishga tushishda `data/db.json` ichida yaratiladi. `VAPID_PUBLIC_KEY` va `VAPID_PRIVATE_KEY` muhit o'zgaruvchilari bilan doimiy qilish mumkin.
- Sayt ochiq bo'lsa, bildirishnomaga qo'shimcha sahifa ichida ham xabar chiqadi.

## Ma'lumotlar saqlanishi (Render muhim!)
Mahsulotlar, aksiyalar, buyurtmalar va yuklangan rasmlar `backend/data/` papkasida turadi. Render'ning bepul rejasida bu papka har deploy/restartda **tozalanadi**. Doimiy saqlash uchun Render'da *Disk* ulang (mount path: `/opt/render/project/src/backend/data`) yoki VPS ishlating (DEPLOY.md).
