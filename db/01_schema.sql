-- ============================================================
-- EdilControl - Schema database
-- Da eseguire nello SQL Editor di Supabase. Idempotente.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUM
-- ============================================================

do $$ begin
  create type ruolo_utente as enum ('admin', 'capo_cantiere', 'direzione');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_cliente as enum ('lead', 'prospect', 'cliente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_dipendente as enum ('operaio', 'ufficio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stato_cantiere as enum ('pianificato', 'in_corso', 'sospeso', 'in_ritardo', 'chiuso');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stato_offerta as enum ('inviata', 'ok', 'ko');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_ricavo as enum ('sal', 'fattura');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stato_ricavo as enum ('in_attesa', 'pagato', 'scaduto');
exception when duplicate_object then null; end $$;

do $$ begin
  create type driver_ripartizione as enum ('percentuale_manuale', 'ore_lavorate', 'costi_diretti', 'ricavi');
exception when duplicate_object then null; end $$;

-- ============================================================
-- PROFILES (legato a auth.users)
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  ruolo ruolo_utente not null default 'capo_cantiere',
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ANAGRAFICHE
-- ============================================================

create table if not exists public.clienti (
  id uuid primary key default gen_random_uuid(),
  ragione_sociale text not null,
  tipo tipo_cliente not null default 'cliente',
  partita_iva text,
  codice_fiscale text,
  referente text,
  indirizzo text,
  citta text,
  provincia text,
  cap text,
  email text,
  pec text,
  telefono text,
  codice_sdi text,
  termini_pagamento text,
  cliente_dal date,
  attivo boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clienti_tipo on public.clienti(tipo);
create index if not exists idx_clienti_rs on public.clienti(lower(ragione_sociale));

create table if not exists public.fornitori (
  id uuid primary key default gen_random_uuid(),
  ragione_sociale text not null,
  partita_iva text,
  categoria text,
  referente text,
  indirizzo text,
  citta text,
  provincia text,
  cap text,
  email text,
  pec text,
  telefono text,
  iban text,
  condizioni_pagamento text,
  valutazione smallint check (valutazione is null or (valutazione >= 0 and valutazione <= 5)),
  fornitore_dal date,
  attivo boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dipendenti (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cognome text not null,
  codice_fiscale text,
  mansione text,
  tipo tipo_dipendente not null default 'operaio',
  email text,
  telefono text,
  data_assunzione date,
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tariffe orarie storicizzate
create table if not exists public.costo_orario_dipendente (
  id uuid primary key default gen_random_uuid(),
  dipendente_id uuid not null references public.dipendenti(id) on delete cascade,
  costo_ord numeric(10,2) not null check (costo_ord >= 0),
  costo_str numeric(10,2) not null check (costo_str >= 0),
  valido_da date not null,
  valido_a date,
  created_at timestamptz not null default now(),
  check (valido_a is null or valido_a >= valido_da)
);

create index if not exists idx_costo_orario_dip on public.costo_orario_dipendente(dipendente_id, valido_da);

-- ============================================================
-- CANTIERI (commessa + manutenzione)
-- ============================================================

create table if not exists public.cantieri (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique,                       -- es. CANT-2026-001
  nome text not null,
  cliente_id uuid references public.clienti(id),
  indirizzo text,
  citta text,
  provincia text,
  data_inizio date,
  data_fine_prevista date,
  stato stato_cantiere not null default 'in_corso',
  valore_contratto numeric(12,2) not null default 0,
  manutenzione boolean not null default false,       -- true = sezione manutenzione
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cantieri_cliente on public.cantieri(cliente_id);
create index if not exists idx_cantieri_stato on public.cantieri(stato);
create index if not exists idx_cantieri_manutenzione on public.cantieri(manutenzione);

-- Mapping capo cantiere → cantieri assegnati (per RLS)
create table if not exists public.capo_cantiere_assegnazione (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cantiere_id uuid not null references public.cantieri(id) on delete cascade,
  primary key (profile_id, cantiere_id)
);

-- ============================================================
-- COSTI DIRETTI: rapportini + materiali
-- ============================================================

create table if not exists public.rapportini_ore (
  id uuid primary key default gen_random_uuid(),
  cantiere_id uuid not null references public.cantieri(id) on delete restrict,
  dipendente_id uuid not null references public.dipendenti(id) on delete restrict,
  data date not null,
  ore_ord numeric(4,2) not null default 0 check (ore_ord >= 0),
  ore_str numeric(4,2) not null default 0 check (ore_str >= 0),
  trasferta boolean not null default false,
  costo_trasferta numeric(10,2) not null default 0 check (costo_trasferta >= 0),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_rapportini_cantiere on public.rapportini_ore(cantiere_id, data);
create index if not exists idx_rapportini_dipendente on public.rapportini_ore(dipendente_id, data);

create table if not exists public.tipi_materiale (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  attivo boolean not null default true
);

create table if not exists public.materiali (
  id uuid primary key default gen_random_uuid(),
  cantiere_id uuid not null references public.cantieri(id) on delete restrict,
  fornitore_id uuid references public.fornitori(id),
  tipo_materiale_id uuid references public.tipi_materiale(id),
  descrizione text not null,
  quantita numeric(12,3) not null default 1 check (quantita >= 0),
  unita_misura text,
  prezzo_unitario numeric(12,4) not null default 0 check (prezzo_unitario >= 0),
  importo_totale numeric(12,2) generated always as (round(quantita * prezzo_unitario, 2)) stored,
  data date not null,
  riferimento_documento text,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_materiali_cantiere on public.materiali(cantiere_id, data);

-- ============================================================
-- RICAVI
-- ============================================================

create table if not exists public.ricavi (
  id uuid primary key default gen_random_uuid(),
  cantiere_id uuid not null references public.cantieri(id) on delete restrict,
  tipo tipo_ricavo not null default 'sal',
  numero_documento text,
  data date not null,
  importo numeric(12,2) not null check (importo >= 0),
  stato stato_ricavo not null default 'in_attesa',
  scadenza date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ricavi_cantiere on public.ricavi(cantiere_id, data);

-- ============================================================
-- COSTI INDIRETTI + RIPARTIZIONE
-- ============================================================

create table if not exists public.categorie_indiretto (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descrizione text
);

create table if not exists public.costi_indiretti (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references public.categorie_indiretto(id),
  descrizione text not null,
  data date not null,
  importo numeric(12,2) not null check (importo >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_indiretti_data on public.costi_indiretti(data);

-- Regola di ripartizione (per periodo)
create table if not exists public.ripartizioni_indiretto (
  id uuid primary key default gen_random_uuid(),
  periodo_inizio date not null,
  periodo_fine date not null,
  driver driver_ripartizione not null default 'percentuale_manuale',
  note text,
  applicata_at timestamptz,
  created_at timestamptz not null default now(),
  check (periodo_fine >= periodo_inizio)
);

create table if not exists public.ripartizione_indiretto_righe (
  id uuid primary key default gen_random_uuid(),
  ripartizione_id uuid not null references public.ripartizioni_indiretto(id) on delete cascade,
  cantiere_id uuid not null references public.cantieri(id) on delete cascade,
  percentuale numeric(7,4) not null default 0 check (percentuale >= 0 and percentuale <= 100),
  importo numeric(12,2) not null default 0 check (importo >= 0),
  unique (ripartizione_id, cantiere_id)
);

-- ============================================================
-- ALLEGATI CANTIERE (file su Supabase Storage)
-- ============================================================

create table if not exists public.allegati_cantiere (
  id uuid primary key default gen_random_uuid(),
  cantiere_id uuid not null references public.cantieri(id) on delete cascade,
  storage_path text not null,                  -- bucket/path
  nome_file text not null,
  mime_type text,
  size_bytes bigint,
  origine text not null default 'upload',      -- 'upload' | 'offerta'
  offerta_id uuid,                              -- se generato da un'offerta
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_allegati_cantiere on public.allegati_cantiere(cantiere_id);

-- ============================================================
-- OFFERTE (fase 2)
-- ============================================================

create table if not exists public.offerte (
  id uuid primary key default gen_random_uuid(),
  progressivo integer not null,                       -- progressivo annuale (NNN)
  anno integer not null,                              -- es. 2026
  revisione integer not null default 1,               -- R01, R02...
  numero text generated always as (
    'EC-P-' || anno::text || '-' || lpad(progressivo::text, 3, '0') || '-R' || lpad(revisione::text, 2, '0')
  ) stored,
  titolo text not null,
  data date not null default current_date,
  stato stato_offerta not null default 'inviata',

  -- Cliente
  cliente_id uuid references public.clienti(id),
  cliente_nome text,                                  -- snapshot per nuovo cliente
  localita text,

  -- Cantiere associato (opzionale, allegato Word va qui)
  cantiere_id uuid references public.cantieri(id),

  -- Dati intervento
  tipo text,
  categoria text,
  superficie_mq numeric(10,2),
  piani integer,
  struttura text,
  finiture text,
  garanzia text,
  durata_mesi integer,

  -- Offerta economica
  importo numeric(12,2) not null default 0,
  oneri_sicurezza numeric(12,2) not null default 0,

  tempistiche text,
  esclusioni text,
  note text,                                          -- interne, non vanno nel Word

  -- Conversione in cantiere
  commessa_creata text,                               -- codice del cantiere generato

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anno, progressivo, revisione)
);

create index if not exists idx_offerte_stato on public.offerte(stato);
create index if not exists idx_offerte_cliente on public.offerte(cliente_id);

-- Storico revisioni (R01, R02...)
create table if not exists public.offerta_revisioni (
  id uuid primary key default gen_random_uuid(),
  offerta_id uuid not null references public.offerte(id) on delete cascade,
  revisione integer not null,
  data date not null default current_date,
  autore text,
  nota text,
  created_at timestamptz not null default now()
);

-- Voci materiale con ricarico
create table if not exists public.offerta_materiali (
  id uuid primary key default gen_random_uuid(),
  offerta_id uuid not null references public.offerte(id) on delete cascade,
  tipo text,
  descrizione text,
  importo numeric(12,2) not null default 0 check (importo >= 0),
  ricarico_pct numeric(7,2) not null default 0,        -- % ricarico
  ord integer not null default 0
);

-- Acconti percentuali (devono sommare 100)
create table if not exists public.offerta_pagamenti (
  id uuid primary key default gen_random_uuid(),
  offerta_id uuid not null references public.offerte(id) on delete cascade,
  percentuale numeric(7,2) not null check (percentuale >= 0 and percentuale <= 100),
  descrizione text not null,
  ord integer not null default 0
);

-- ============================================================
-- VISTE CALCOLATE - margine per cantiere
-- ============================================================

create or replace view public.v_cantiere_costi_manodopera as
select
  r.cantiere_id,
  sum(
    coalesce(r.ore_ord, 0) * coalesce(c.costo_ord, 0)
    + coalesce(r.ore_str, 0) * coalesce(c.costo_str, 0)
    + coalesce(r.costo_trasferta, 0)
  )::numeric(12,2) as costo_manodopera
from public.rapportini_ore r
left join lateral (
  select co.costo_ord, co.costo_str
  from public.costo_orario_dipendente co
  where co.dipendente_id = r.dipendente_id
    and co.valido_da <= r.data
    and (co.valido_a is null or co.valido_a >= r.data)
  order by co.valido_da desc
  limit 1
) c on true
group by r.cantiere_id;

create or replace view public.v_cantiere_costi_materiali as
select cantiere_id, sum(importo_totale)::numeric(12,2) as costo_materiali
from public.materiali
group by cantiere_id;

create or replace view public.v_cantiere_ricavi as
select cantiere_id, sum(importo)::numeric(12,2) as ricavi
from public.ricavi
group by cantiere_id;

create or replace view public.v_cantiere_indiretti as
select cantiere_id, sum(importo)::numeric(12,2) as indiretti
from public.ripartizione_indiretto_righe
group by cantiere_id;

create or replace view public.v_cantiere_margini as
select
  c.id as cantiere_id,
  c.codice,
  c.nome,
  c.cliente_id,
  c.manutenzione,
  coalesce(m.costo_manodopera, 0) as costo_manodopera,
  coalesce(mat.costo_materiali, 0) as costo_materiali,
  coalesce(m.costo_manodopera, 0) + coalesce(mat.costo_materiali, 0) as costi_diretti,
  coalesce(r.ricavi, 0) as ricavi,
  coalesce(r.ricavi, 0) - (coalesce(m.costo_manodopera, 0) + coalesce(mat.costo_materiali, 0)) as margine_diretto,
  coalesce(i.indiretti, 0) as indiretti,
  coalesce(r.ricavi, 0) - (coalesce(m.costo_manodopera, 0) + coalesce(mat.costo_materiali, 0)) - coalesce(i.indiretti, 0) as margine_pieno
from public.cantieri c
left join public.v_cantiere_costi_manodopera m on m.cantiere_id = c.id
left join public.v_cantiere_costi_materiali mat on mat.cantiere_id = c.id
left join public.v_cantiere_ricavi r on r.cantiere_id = c.id
left join public.v_cantiere_indiretti i on i.cantiere_id = c.id;

-- ============================================================
-- FUNZIONI UTILITY
-- ============================================================

-- Tariffa oraria valida a una certa data
create or replace function public.tariffa_oraria_valida(
  p_dipendente_id uuid,
  p_data date
) returns table (costo_ord numeric, costo_str numeric)
language sql stable as $$
  select costo_ord, costo_str
  from public.costo_orario_dipendente
  where dipendente_id = p_dipendente_id
    and valido_da <= p_data
    and (valido_a is null or valido_a >= p_data)
  order by valido_da desc
  limit 1;
$$;

-- Prossimo progressivo offerta dell'anno
create or replace function public.prossimo_progressivo_offerta(p_anno integer)
returns integer language sql as $$
  select coalesce(max(progressivo), 0) + 1
  from public.offerte where anno = p_anno;
$$;

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  for t in select unnest(array['clienti','fornitori','dipendenti','cantieri','offerte']) loop
    execute format('drop trigger if exists trg_%I_updated on public.%I', t, t);
    execute format('create trigger trg_%I_updated before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ============================================================
-- DATI BASE
-- ============================================================

insert into public.categorie_indiretto(nome, descrizione) values
  ('Affitti', 'Affitti uffici, magazzini'),
  ('Utenze', 'Energia, acqua, gas, telefonia'),
  ('Buste paga ufficio', 'Stipendi personale amministrativo'),
  ('Veicoli', 'Leasing, manutenzione, carburante furgoni'),
  ('Servizi', 'Commercialista, consulenti, software')
on conflict (nome) do nothing;

insert into public.tipi_materiale(nome) values
  ('Cemento e malte'),
  ('Ferro e tondini'),
  ('Laterizi'),
  ('Pavimenti'),
  ('Rivestimenti'),
  ('Sanitari'),
  ('Impianto elettrico'),
  ('Impianto idraulico'),
  ('Pittura'),
  ('Isolanti'),
  ('Altro')
on conflict (nome) do nothing;
