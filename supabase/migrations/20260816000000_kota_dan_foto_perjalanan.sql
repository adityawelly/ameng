-- Titik lokasi di peta (dulunya array KOTA hardcoded di PetaAnimasi.jsx)
create table if not exists public.kota (
  id text primary key,
  nama text not null,
  x numeric not null,
  y numeric not null,
  arah text not null default 'atas' check (arah in ('atas', 'bawah', 'kiri', 'kanan')),
  created_at timestamptz not null default now()
);

-- Foto perjalanan tiap kota, ditampilkan di mode Photo Journey diurutkan dari tanggal
create table if not exists public.foto_perjalanan (
  id uuid primary key default gen_random_uuid(),
  kota_id text not null references public.kota (id) on delete cascade,
  src text not null,
  tanggal date not null,
  lokasi text not null,
  created_at timestamptz not null default now()
);

create index if not exists foto_perjalanan_kota_id_idx on public.foto_perjalanan (kota_id);
create index if not exists foto_perjalanan_tanggal_idx on public.foto_perjalanan (tanggal);

-- Data ini publik dan cuma dibaca dari halaman peta, jadi RLS-nya read-only buat semua orang.
alter table public.kota enable row level security;
alter table public.foto_perjalanan enable row level security;

create policy "kota bisa dibaca publik" on public.kota
  for select using (true);

create policy "foto_perjalanan bisa dibaca publik" on public.foto_perjalanan
  for select using (true);

-- Bucket Storage buat file foto perjalanan
insert into storage.buckets (id, name, public)
values ('kota-foto', 'kota-foto', true)
on conflict (id) do nothing;

create policy "kota-foto bisa dibaca publik"
  on storage.objects for select
  using (bucket_id = 'kota-foto');
