-- ============================================================
-- EdilControl - Profili modificabili solo dall'amministratore
-- Esegui DOPO 22_sicurezza_capo_cantiere.sql. Idempotente.
--
-- Falla corretta (verifica del 26/11/2026):
-- la regola profiles_update di 02_policies.sql permetteva a OGNI utente
-- di modificare il proprio profilo senza limiti sui campi. Chiamando
-- direttamente l'API di Supabase con le proprie credenziali, un capo
-- cantiere poteva impostarsi ruolo = 'admin', e un utente sospeso
-- poteva rimettersi attivo = true.
--
-- L'app modifica i profili solo da Impostazioni -> Utenti e ruoli
-- (amministratore); creazione e sospensione passano dalle Edge Function
-- utenti-crea / utenti-stato con la chiave di servizio, che non e'
-- soggetta a questa regola. Nessuna schermata ne risente.
-- ============================================================

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================
-- VERIFICA (da eseguire dopo): deve comparire una sola regola di UPDATE,
-- con  (current_role() = 'admin'::ruolo_utente)  in entrambe le colonne.
-- ============================================================
--   select polname, polcmd,
--          pg_get_expr(polqual, polrelid)      as using_expr,
--          pg_get_expr(polwithcheck, polrelid) as check_expr
--   from pg_policy
--   where polrelid = 'public.profiles'::regclass
--   order by polname;
