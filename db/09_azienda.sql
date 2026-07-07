-- ============================================================
-- EdilControl - Dati azienda (riga singola)
-- Usati per intestare report e offerte. Esegui DOPO i precedenti.
-- ============================================================

create table if not exists public.azienda (
  id boolean primary key default true,
  ragione_sociale text not null default 'La mia impresa',
  forma_giuridica text,
  partita_iva text,
  codice_fiscale text,
  codice_sdi text,
  sede_legale text,
  citta text,
  provincia text,
  cap text,
  telefono text,
  email text,
  pec text,
  iban text,
  rea text,
  logo_url text,
  updated_at timestamptz not null default now(),
  constraint azienda_singleton check (id = true)
);

-- Riga di default
insert into public.azienda (id) values (true) on conflict (id) do nothing;

alter table public.azienda enable row level security;

drop policy if exists azienda_read on public.azienda;
create policy azienda_read on public.azienda for select
  using (auth.uid() is not null);

drop policy if exists azienda_write on public.azienda;
create policy azienda_write on public.azienda for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- trigger updated_at
drop trigger if exists trg_azienda_updated on public.azienda;
create trigger trg_azienda_updated before update on public.azienda
  for each row execute function public.set_updated_at();
