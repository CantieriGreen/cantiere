-- ============================================================
-- EdilControl - Sicurezza: il capo cantiere vede solo i suoi cantieri
-- Esegui DOPO 21_scadenze_altro.sql. Idempotente (si puo rieseguire).
--
-- Corregge due falle emerse dalla verifica del 26/11/2026:
--
-- 1) Viste di calcolo senza security_invoker.
--    Una vista senza questa opzione gira con i permessi del proprietario
--    e IGNORA le RLS delle tabelle sotto: un capo cantiere riceveva
--    margini, ricavi e costi di tutti i cantieri e il costo di tutti
--    i rapportini. Con security_invoker la vista applica le RLS di chi
--    la interroga. Per admin e direzione non cambia nulla.
--
-- 2) File allegati (Storage, bucket 'allegati').
--    Le regole di 08_storage_allegati.sql controllavano solo il bucket:
--    qualunque utente collegato poteva elencare, scaricare, sovrascrivere
--    ed eliminare i file di qualsiasi cantiere. Ora valgono le stesse
--    regole della tabella allegati_cantiere:
--      lettura  -> chi ha accesso al cantiere (admin, direzione, capo assegnato)
--      carica   -> admin, oppure capo cantiere sui propri cantieri
--      modifica / elimina -> solo admin
--    Il cantiere si ricava dalla prima cartella del percorso del file,
--    che l'app scrive sempre come  <id cantiere>/<timestamp>_<nome file>.
--
-- In piu': la funzione fic_trova_o_crea_fornitore non e' piu chiamabile
-- direttamente dagli utenti (la usa solo fic_assegna_passiva).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Viste: rispettano le RLS di chi interroga
-- ------------------------------------------------------------
alter view public.v_cantiere_costi_manodopera set (security_invoker = true);
alter view public.v_cantiere_costi_materiali  set (security_invoker = true);
alter view public.v_cantiere_ricavi           set (security_invoker = true);
alter view public.v_cantiere_indiretti        set (security_invoker = true);
alter view public.v_cantiere_margini          set (security_invoker = true);
alter view public.v_rapportino_costo          set (security_invoker = true);
alter view public.v_tariffa_corrente          set (security_invoker = true);

-- ------------------------------------------------------------
-- 2) Storage: file allegati legati al cantiere
-- ------------------------------------------------------------

-- Id del cantiere dalla prima cartella del percorso; null se non e' un uuid
-- (cosi' un percorso anomalo non manda in errore la regola: lo vede solo l'admin).
create or replace function public.cantiere_da_path(p_name text)
returns uuid
language sql immutable
set search_path = public
as $$
  select case
    when split_part(p_name, '/', 1)
         ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

drop policy if exists allegati_read on storage.objects;
create policy allegati_read on storage.objects for select
  to authenticated
  using (
    bucket_id = 'allegati'
    and public.can_access_cantiere(public.cantiere_da_path(name))
  );

drop policy if exists allegati_insert on storage.objects;
create policy allegati_insert on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'allegati'
    and (
      public.current_role() = 'admin'
      or (
        public.current_role() = 'capo_cantiere'
        and public.can_access_cantiere(public.cantiere_da_path(name))
      )
    )
  );

drop policy if exists allegati_update on storage.objects;
create policy allegati_update on storage.objects for update
  to authenticated
  using (bucket_id = 'allegati' and public.current_role() = 'admin')
  with check (bucket_id = 'allegati' and public.current_role() = 'admin');

drop policy if exists allegati_delete on storage.objects;
create policy allegati_delete on storage.objects for delete
  to authenticated
  using (bucket_id = 'allegati' and public.current_role() = 'admin');

-- ------------------------------------------------------------
-- 3) fic_trova_o_crea_fornitore: solo uso interno
--    (fic_assegna_passiva e' security definer e la chiama con i permessi
--     del proprietario, quindi continua a funzionare)
-- ------------------------------------------------------------
revoke all on function public.fic_trova_o_crea_fornitore(text, text, text)
  from public, anon, authenticated;

-- ============================================================
-- VERIFICHE (da eseguire dopo, una alla volta)
-- ============================================================
-- a) tutte le viste devono riportare security_invoker=true:
--   select c.relname, c.reloptions from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'v' order by 1;
--
-- b) file con percorso non riconosciuto (visibili ormai solo all'admin);
--    atteso: nessuna riga
--   select name from storage.objects
--   where bucket_id = 'allegati' and public.cantiere_da_path(name) is null;
