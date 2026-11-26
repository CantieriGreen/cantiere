-- ============================================================
-- EdilControl - Il capo cantiere vede il periodo delle quote indiretti
-- Esegui DOPO 23_profili_solo_admin.sql. Idempotente.
--
-- Il capo cantiere legge gia' le quote di costi indiretti dei propri
-- cantieri (ripartizione_indiretto_righe, filtrate con can_access_cantiere),
-- ma non l'intestazione della ripartizione (periodo e criterio), che era
-- riservata ad admin e direzione: nella scheda del cantiere e nella pagina
-- Costi indiretti il periodo risultava vuoto.
--
-- Ora puo' leggere le ripartizioni che hanno almeno una quota su un suo
-- cantiere. Restano invisibili: i costi indiretti dell'azienda
-- (costi_indiretti) e le quote degli altri cantieri.
-- ============================================================

drop policy if exists ripart_read on public.ripartizioni_indiretto;
create policy ripart_read on public.ripartizioni_indiretto for select using (
  public.current_role() in ('admin', 'direzione')
  or exists (
    select 1 from public.ripartizione_indiretto_righe r
    where r.ripartizione_id = ripartizioni_indiretto.id
      and public.can_access_cantiere(r.cantiere_id)
  )
);
