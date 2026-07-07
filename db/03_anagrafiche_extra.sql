-- ============================================================
-- EdilControl - Campi anagrafici aggiuntivi (clienti / fornitori)
-- Esegui DOPO 01_schema.sql e 02_policies.sql. Idempotente.
-- ============================================================

-- Clienti: referente, PEC, codice SDI, termini pagamento, data primo contatto
alter table public.clienti add column if not exists referente text;
alter table public.clienti add column if not exists pec text;
alter table public.clienti add column if not exists codice_sdi text;
alter table public.clienti add column if not exists termini_pagamento text;
alter table public.clienti add column if not exists cliente_dal date;
alter table public.clienti add column if not exists attivo boolean not null default true;

-- Fornitori: categoria, referente, PEC, IBAN, condizioni pagamento, valutazione
alter table public.fornitori add column if not exists categoria text;
alter table public.fornitori add column if not exists referente text;
alter table public.fornitori add column if not exists pec text;
alter table public.fornitori add column if not exists iban text;
alter table public.fornitori add column if not exists condizioni_pagamento text;
alter table public.fornitori add column if not exists valutazione smallint check (valutazione is null or (valutazione >= 0 and valutazione <= 5));
alter table public.fornitori add column if not exists fornitore_dal date;
alter table public.fornitori add column if not exists attivo boolean not null default true;
