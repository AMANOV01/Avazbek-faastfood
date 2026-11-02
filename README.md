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

## Imkoniyatlar
- Menyu (8 kategoriya, barcha narxlar rasmdagi menyudan)
- Savat, yetkazib berish (8 000 so'm) yoki olib ketish
- Buyurtma holatini kuzatish (har 10 soniyada yangilanadi)
- Admin (`/admin`): buyurtmalar holatini o'zgartirish, narx va mavjudlikni tahrirlash

## Eslatma
Narxlar server tomonda hisoblanadi (mijoz yuborgan narxga ishonilmaydi).
Yetkazib berish narxi (8 000) men qo'ygan taxminiy qiymat — `backend/src/server.js` va `flutter_app/lib/config.dart` da o'zgartiring.
