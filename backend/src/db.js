// PostgreSQL (Neon, Supabase, Render Postgres yoki o'zingizniki) — ma'lumotlar deploydan keyin ham saqlanadi.
// Ulanish: DATABASE_URL muhit o'zgaruvchisi, masalan  postgresql://user:parol@host/dbname?sslmode=require
import pg from 'pg';
import { products as seedProducts } from './menu.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "\nXATO: DATABASE_URL berilmagan.\n" +
      "Neon (yoki boshqa Postgres) ulanish satrini muhit o'zgaruvchisi sifatida bering:\n" +
      "  Render: Environment → DATABASE_URL\n" +
      "  Kompyuterda: DATABASE_URL='postgresql://...' npm start\n"
  );
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)([:/]|$)/.test(url) || url.includes('host=/');
export const pool = new pg.Pool({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000, // Neon "uyg'onishi" uchun biroz kutadi
});
// Uzilib qolgan ulanish serverni yiqitmasin
pool.on('error', (e) => console.error('DB ulanish xatosi:', e.message));

export const q = (text, params) => pool.query(text, params);

export async function getSetting(key) {
  const { rows } = await q('select value from settings where key = $1', [key]);
  return rows[0]?.value;
}
export async function setSetting(key, value) {
  await q(
    'insert into settings(key, value) values($1, $2::jsonb) on conflict (key) do update set value = excluded.value',
    [key, JSON.stringify(value)]
  );
}

const SCHEMA = `
create table if not exists products (
  id serial primary key,
  category text not null,
  name text not null,
  names jsonb not null default '{}',
  price int not null check (price >= 0),
  available boolean not null default true,
  image text not null default ''
);
create table if not exists promos (
  id serial primary key,
  product_id int not null references products(id) on delete cascade,
  min_qty int not null,
  type text not null,
  value int not null,
  ends_at text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists orders (
  id serial primary key,
  token text not null,
  name text not null,
  phone text not null,
  address text not null default '',
  comment text not null default '',
  type text not null,
  lang text not null default 'uz',
  push jsonb,
  items jsonb not null,
  subtotal int not null,
  delivery_fee int not null default 0,
  total int not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (id desc);
-- v5: xaritadan belgilangan joy, to'lov usuli, promokod
alter table orders add column if not exists lat double precision;
alter table orders add column if not exists lng double precision;
alter table orders add column if not exists pay_method text not null default 'cash';
alter table orders add column if not exists pay_card text not null default '';
alter table orders add column if not exists pay_last4 text not null default '';
alter table orders add column if not exists promo_code text not null default '';
alter table orders add column if not exists code_discount int not null default 0;
create table if not exists promo_codes (
  id serial primary key,
  code text not null unique,
  type text not null,
  value int not null,
  min_total int not null default 0,
  max_uses int,
  used_count int not null default 0,
  ends_at text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- Bitta telefon raqam bitta promokodni faqat bir marta ishlata oladi (unique shuni kafolatlaydi)
create table if not exists promo_code_uses (
  code_id int not null references promo_codes(id) on delete cascade,
  phone text not null,
  order_id int,
  created_at timestamptz not null default now(),
  primary key (code_id, phone)
);
create table if not exists settings (key text primary key, value jsonb not null);
create table if not exists admin_push (endpoint text primary key, sub jsonb not null);
create table if not exists images (
  name text primary key,
  mime text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
`;

export async function initDb() {
  await q(SCHEMA);
  // Boshlang'ich menyu faqat bir marta yoziladi (keyin admin hammasini o'chirsa ham qaytib kelmaydi)
  if (!(await getSetting('seeded'))) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      for (const p of seedProducts) {
        await client.query(
          'insert into products(category, name, names, price, available, image) values($1,$2,$3::jsonb,$4,true,\'\')',
          [p.category, p.name, JSON.stringify(p.names), p.price]
        );
      }
      await client.query(
        "insert into settings(key, value) values('seeded', 'true'::jsonb) on conflict (key) do nothing"
      );
      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
    console.log(`Boshlang'ich menyu yozildi (${seedProducts.length} ta mahsulot)`);
  }
}
