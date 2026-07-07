-- ============================================================
-- EdilControl - Ricavi: stato incasso + scadenza
-- Esegui DOPO i file precedenti. Idempotente.
-- ============================================================

do $$ begin
  create type stato_ricavo as enum ('in_attesa', 'pagato', 'scaduto');
exception when duplicate_object then null; end $$;

alter table public.ricavi add column if not exists stato stato_ricavo not null default 'in_attesa';
alter table public.ricavi add column if not exists scadenza date;
