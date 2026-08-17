-- RLS policy "bisa dibaca publik" nggak cukup sendirian — role anon/authenticated
-- juga butuh GRANT dasar ke tabelnya, soalnya Supabase versi baru nggak lagi
-- otomatis expose tabel baru ke Data API roles.
grant usage on schema public to anon, authenticated;
grant select on public.kota to anon, authenticated;
grant select on public.foto_perjalanan to anon, authenticated;
