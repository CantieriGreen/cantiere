-- ============================================================
-- EdilControl - Flag addon (sblocco sezioni a pagamento)
-- Esegui DOPO 09_azienda.sql. Idempotente.
--
-- Le sezioni "Offerte" e "Cantieri manutenzione" sono addon opzionali.
-- Quando il cliente acquista l'addon, attivare il relativo flag QUI:
--
--   update public.azienda set addon_offerte = true where id = true;
--   update public.azienda set addon_manutenzione = true where id = true;
--
-- Per disattivare: stessa query con false.
-- ============================================================

alter table public.azienda add column if not exists addon_offerte boolean not null default false;
alter table public.azienda add column if not exists addon_manutenzione boolean not null default false;
