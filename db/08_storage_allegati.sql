-- ============================================================
-- EdilControl - Storage per allegati cantiere
-- Esegui DOPO i file precedenti. Idempotente.
-- ============================================================

-- Bucket privato per gli allegati dei cantieri
insert into storage.buckets (id, name, public)
values ('allegati', 'allegati', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Policy storage.objects per il bucket 'allegati'
-- Gli utenti autenticati possono leggere/caricare; solo admin elimina.
-- (Il controllo fine per cantiere è gestito a livello applicativo +
--  tabella public.allegati_cantiere con le sue RLS.)
-- ------------------------------------------------------------

drop policy if exists allegati_read on storage.objects;
create policy allegati_read on storage.objects for select
  to authenticated
  using (bucket_id = 'allegati');

drop policy if exists allegati_insert on storage.objects;
create policy allegati_insert on storage.objects for insert
  to authenticated
  with check (bucket_id = 'allegati');

drop policy if exists allegati_update on storage.objects;
create policy allegati_update on storage.objects for update
  to authenticated
  using (bucket_id = 'allegati');

drop policy if exists allegati_delete on storage.objects;
create policy allegati_delete on storage.objects for delete
  to authenticated
  using (bucket_id = 'allegati');
