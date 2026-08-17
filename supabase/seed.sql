-- Data titik kota yang tadinya hardcoded di PetaAnimasi.jsx.
-- Tambah foto_perjalanan-nya sendiri lewat Studio / SQL setelah upload foto ke bucket "kota-foto".
insert into public.kota (id, nama, x, y, arah) values
  ('lampung_timur', 'Lampung Timur', 18.9, 61.3, 'atas'),
  ('jakarta', 'Jakarta', 22.6, 65.5, 'kiri')
on conflict (id) do nothing;
