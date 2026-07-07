-- ============================================================
-- EdilControl - Fatture passive (acquisti) da Fatture in Cloud
-- Le fatture ricevute diventano, a scelta: un MATERIALE su un cantiere
-- oppure un COSTO INDIRETTO. Il fornitore viene creato se non esiste.
-- Esegui DOPO i file precedenti. Idempotente.
-- ============================================================

-- ---- Tracciamento origine sui costi ----
alter table public.materiali add column if not exists fic_id text;
alter table public.materiali add column if not exists origine text not null default 'manuale';
do $$ begin
  alter table public.materiali
    add constraint materiali_origine_chk check (origine in ('manuale', 'fattureincloud'));
exception when duplicate_object then null; end $$;
create unique index if not exists uq_materiali_fic_id on public.materiali(fic_id) where fic_id is not null;

alter table public.costi_indiretti add column if not exists fic_id text;
alter table public.costi_indiretti add column if not exists origine text not null default 'manuale';
do $$ begin
  alter table public.costi_indiretti
    add constraint costi_indiretti_origine_chk check (origine in ('manuale', 'fattureincloud'));
exception when duplicate_object then null; end $$;
create unique index if not exists uq_indiretti_fic_id on public.costi_indiretti(fic_id) where fic_id is not null;

-- ---- Staging fatture passive ----
create table if not exists public.fic_fatture_passive (
  id uuid primary key default gen_random_uuid(),
  fic_id text not null unique,
  numero text,
  data date,
  importo_netto numeric(12,2) not null default 0,
  importo_totale numeric(12,2) not null default 0,
  fornitore_nome text,
  fornitore_piva text,
  fornitore_cf text,
  stato_pagamento stato_ricavo not null default 'in_attesa',
  scadenza date,
  scadenze jsonb,
  stato_assegnazione text not null default 'da_assegnare'
    check (stato_assegnazione in ('da_assegnare', 'assegnata', 'ignorata')),
  destinazione text check (destinazione in ('materiale', 'indiretto')),
  fornitore_id uuid references public.fornitori(id) on delete set null,
  cantiere_id uuid references public.cantieri(id) on delete set null,
  materiale_id uuid references public.materiali(id) on delete set null,
  costo_indiretto_id uuid references public.costi_indiretti(id) on delete set null,
  importato_at timestamptz not null default now(),
  assegnato_at timestamptz
);

create index if not exists idx_fic_passive_stato
  on public.fic_fatture_passive(stato_assegnazione, data desc);

alter table public.fic_fatture_passive enable row level security;

drop policy if exists fic_passive_read on public.fic_fatture_passive;
create policy fic_passive_read on public.fic_fatture_passive for select
  using (public.current_role() in ('admin', 'direzione'));

drop policy if exists fic_passive_write on public.fic_fatture_passive;
create policy fic_passive_write on public.fic_fatture_passive for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================
-- Helper: trova un fornitore per P.IVA o ragione sociale, altrimenti lo crea.
-- ============================================================
create or replace function public.fic_trova_o_crea_fornitore(
  p_nome text,
  p_piva text,
  p_cf text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_piva is not null and length(trim(p_piva)) > 0 then
    select id into v_id from public.fornitori where partita_iva = trim(p_piva) limit 1;
    if v_id is not null then return v_id; end if;
  end if;

  if p_nome is not null and length(trim(p_nome)) > 0 then
    select id into v_id from public.fornitori
    where lower(ragione_sociale) = lower(trim(p_nome)) limit 1;
    if v_id is not null then return v_id; end if;
  end if;

  insert into public.fornitori (ragione_sociale, partita_iva, codice_fiscale, categoria, note)
  values (
    coalesce(nullif(trim(p_nome), ''), 'Fornitore FIC'),
    nullif(trim(p_piva), ''),
    nullif(trim(p_cf), ''),
    'Fatture in Cloud',
    'Creato automaticamente dall''import Fatture in Cloud.'
  )
  returning id into v_id;
  return v_id;
end $$;

-- ============================================================
-- RPC: assegna una fattura passiva a materiale (cantiere) o costo indiretto
-- ============================================================
create or replace function public.fic_assegna_passiva(
  p_staging_id uuid,
  p_destinazione text,
  p_cantiere_id uuid,
  p_categoria_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f public.fic_fatture_passive;
  v_fornitore uuid;
  v_mat uuid;
  v_ind uuid;
  v_desc text;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Solo un amministratore puo assegnare le fatture';
  end if;

  select * into v_f from public.fic_fatture_passive where id = p_staging_id;
  if not found then raise exception 'Fattura passiva non trovata'; end if;
  if v_f.stato_assegnazione = 'assegnata' then
    raise exception 'Fattura gia assegnata';
  end if;

  v_fornitore := public.fic_trova_o_crea_fornitore(
    v_f.fornitore_nome, v_f.fornitore_piva, v_f.fornitore_cf
  );
  v_desc := coalesce(nullif(v_f.numero, ''), 'Fattura') ||
            coalesce(' · ' || v_f.fornitore_nome, '');

  if p_destinazione = 'materiale' then
    if p_cantiere_id is null then raise exception 'Seleziona un cantiere'; end if;
    insert into public.materiali (
      cantiere_id, fornitore_id, descrizione, quantita, prezzo_unitario,
      data, riferimento_documento, note, fic_id, origine
    ) values (
      p_cantiere_id, v_fornitore, v_desc, 1, v_f.importo_netto,
      coalesce(v_f.data, current_date), v_f.numero,
      'Importata da Fatture in Cloud', v_f.fic_id, 'fattureincloud'
    )
    returning id into v_mat;

    update public.fic_fatture_passive set
      stato_assegnazione = 'assegnata', destinazione = 'materiale',
      fornitore_id = v_fornitore, cantiere_id = p_cantiere_id,
      materiale_id = v_mat, assegnato_at = now()
    where id = p_staging_id;
    return v_mat;

  elsif p_destinazione = 'indiretto' then
    insert into public.costi_indiretti (
      categoria_id, fornitore_id, descrizione, data, importo, note, fic_id, origine
    ) values (
      p_categoria_id, v_fornitore, v_desc, coalesce(v_f.data, current_date),
      v_f.importo_netto, 'Importata da Fatture in Cloud', v_f.fic_id, 'fattureincloud'
    )
    returning id into v_ind;

    update public.fic_fatture_passive set
      stato_assegnazione = 'assegnata', destinazione = 'indiretto',
      fornitore_id = v_fornitore, costo_indiretto_id = v_ind, assegnato_at = now()
    where id = p_staging_id;
    return v_ind;
  else
    raise exception 'Destinazione non valida (materiale|indiretto)';
  end if;
end $$;

grant execute on function public.fic_assegna_passiva(uuid, text, uuid, uuid) to authenticated;
