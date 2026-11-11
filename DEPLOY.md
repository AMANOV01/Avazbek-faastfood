# Internetga joylash va .uz domen

Loyiha bitta Node.js ilovasi sifatida ishlaydi: backend tayyor Vue saytini ham o'zi beradi
(`frontend/dist` mavjud bo'lsa). Shuning uchun serverda faqat bitta jarayon kerak.

## 1. Server (VPS) olish
Ubuntu 22.04/24.04 li oddiy VPS yetadi (1 CPU, 1 GB RAM). Provayderni o'zingiz tanlang
(O'zbekistondagi hosting yoki Hetzner/DigitalOcean kabi xorijiy). Sizga IP manzil va SSH parol/kalit beriladi.

## 2. Serverni tayyorlash (SSH orqali)
```
ssh root@SERVER_IP
apt update && apt install -y nginx unzip curl
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm i -g pm2
```

## 3. Loyihani yuklash
Kompyuteringizdan (Windows PowerShell):
```
scp avazbek-lavash.zip root@SERVER_IP:/root/
```
Serverda:
```
cd /root && unzip avazbek-lavash.zip
cd avazbek-lavash/frontend && npm install && npm run build
cd ../backend && npm install
DATABASE_URL="postgresql://..." ADMIN_PASSWORD="o'zingizning_kuchli_parolingiz" PORT=4000 pm2 start src/server.js --name avazbek
pm2 save && pm2 startup
```

## 4. Nginx
`/etc/nginx/sites-available/avazbek` faylini yarating:
```
server {
  listen 80;
  server_name avazbek.uz www.avazbek.uz;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```
```
ln -s /etc/nginx/sites-available/avazbek /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 5. .uz domen
1. `.uz` domenlarni akkreditatsiyalangan registratorlar orqali ro'yxatdan o'tkaziladi
   (ro'yxat: cctld.uz). Nomi bo'sh ekanini registrator saytida tekshiring.
2. Narx va talab qilinadigan hujjatlar registratorga qarab farq qiladi — to'lashdan oldin so'rang.
3. Registrator panelida DNS yozuvlarini qo'shing:
   - `A`   `@`   → SERVER_IP
   - `A`   `www` → SERVER_IP
4. DNS yangilanishi bir necha daqiqadan bir necha soatgacha ketadi.

## 6. HTTPS (bepul)
```
apt install -y certbot python3-certbot-nginx
certbot --nginx -d avazbek.uz -d www.avazbek.uz
```

## 7. Flutter ilovani domenga ulash
```
flutter build apk --dart-define=API_BASE=https://avazbek.uz
```
(HTTPS bo'lgani uchun `usesCleartextTraffic` kerak emas.)

## Muhim
- Ma'lumotlar PostgreSQL'da (`DATABASE_URL`). Vaqti-vaqti bilan `pg_dump "$DATABASE_URL" > zaxira.sql` qilib zaxira oling.
- Admin parolini albatta almashtiring (3-qadamdagi `ADMIN_PASSWORD`).
- Saytni yangilash: yangi fayllarni yuklab, `frontend` da `npm run build`, keyin `pm2 restart avazbek`.

## Yandex xarita (ixtiyoriy)
Buyurtmada manzil tanlash xaritasi Yandex Maps bo'lishi uchun kalit kerak:
1. https://developer.tech.yandex.ru → «Кабинет разработчика» → kalit yarating, xizmat: **«JavaScript API и HTTP Геокодер»**.
2. Kalitni HTTP-referer bo'yicha sayt domeningizga cheklang.
3. Render → Environment → `YANDEX_MAPS_KEY` = kalitingiz → Save (qayta deploy bo'ladi).
Kalit bo'lmasa yoki Yandex yuklanmasa, sayt avtomatik OpenStreetMap xaritasiga o'tadi. Admin paneldagi "xaritada ochish" havolasi Google Maps'ni ochadi (kalit shart emas).
