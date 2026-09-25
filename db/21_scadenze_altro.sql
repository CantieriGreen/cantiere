-- ============================================================
-- EdilControl - Calendario scadenze: sezione "Altro"
-- Documenti aziendali vari con scadenza (DURC e qualsiasi altro documento):
-- nome del documento libero + data di scadenza.
-- La vista v_scadenze viene estesa: campanella ed email li includono
-- senza altre modifiche. Esegui DOPO 19_scadenze.sql. Idempotente.
-- NB: se si riesegue 19_scadenze.sql, rieseguire poi anche questo file
-- (19 ricrea la vista senza la parte "Altro").
-- ============================================================

create table if not exists public.scadenze_altro (
  id uuid primary key default gen_random_uuid(),
  nome_documento text not null,
  scadenza date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_altro_scadenza on public.scadenze_altro(scadenza);

drop trigger if exists trg_scadenze_altro_updated on public.scadenze_altro;
create trigger trg_scadenze_altro_updated before update on public.scadenze_altro
  for each row execute function public.set_updated_at();

-- RLS: come il resto del calendario (lettura admin/direzione, scrittura admin)
alter table public.scadenze_altro enable row level security;

drop policy if exists scadenze_altro_read on public.scadenze_altro;
create policy scadenze_altro_read on public.scadenze_altro for select
  using (public.current_role() in ('admin','direzione'));

drop policy if exists scadenze_altro_write on public.scadenze_altro;
create policy scadenze_altro_write on public.scadenze_altro for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================
-- VISTA UNIFICATA: stessa definizione di 19_scadenze.sql + documenti "Altro"
-- ============================================================

create or replace view public.v_scadenze
with (security_invoker = true)
as
  -- Mezzi
  select
    'mezzo_assicurazione'::text as tipo,
    'mezzi'::text               as categoria,
    m.id                        as record_id,
    coalesce(nullif(m.targa, ''), m.tipo_mezzo) as titolo,
    'Assicurazione'::text       as dettaglio,
    m.tipo_mezzo                as riferimento,
    null::text                  as telefono,
    m.scadenza_assicurazione    as scadenza,
    (m.scadenza_assicurazione - current_date)::int as giorni
  from public.mezzi m
  where m.attivo and m.scadenza_assicurazione is not null

  union all
  select
    'mezzo_bollo', 'mezzi', m.id,
    coalesce(nullif(m.targa, ''), m.tipo_mezzo),
    'Bollo', m.tipo_mezzo, null,
    m.scadenza_bollo, (m.scadenza_bollo - current_date)::int
  from public.mezzi m
  where m.attivo and m.scadenza_bollo is not null

  union all
  select
    'mezzo_revisione', 'mezzi', m.id,
    coalesce(nullif(m.targa, ''), m.tipo_mezzo),
    'Revisione', m.tipo_mezzo, null,
    m.scadenza_revisione, (m.scadenza_revisione - current_date)::int
  from public.mezzi m
  where m.attivo and m.scadenza_revisione is not null

  -- Visite mediche
  union all
  select
    'visita_medica', 'dipendenti', v.id,
    v.nome || ' ' || v.cognome,
    'Visita medica', null, v.telefono,
    v.scadenza_visita, (v.scadenza_visita - current_date)::int
  from public.scadenze_visite_mediche v

  -- Formazione sicurezza
  union all
  select
    'formazione', 'dipendenti', f.id,
    f.nome || ' ' || f.cognome,
    t.nome || ' · ' || (case f.tipologia
      when 'aggiornamento' then 'aggiornamento' else 'corso' end),
    t.nome, null,
    f.scadenza, (f.scadenza - current_date)::int
  from public.scadenze_formazione f
  join public.tipi_formazione t on t.id = f.tipo_formazione_id

  -- Patente
  union all
  select
    'patente', 'dipendenti', d.id,
    d.nome || ' ' || d.cognome,
    'Patente', null, null,
    d.scadenza_patente, (d.scadenza_patente - current_date)::int
  from public.scadenze_documenti d
  where d.scadenza_patente is not null

  -- Permesso di soggiorno
  union all
  select
    'permesso_soggiorno', 'dipendenti', d.id,
    d.nome || ' ' || d.cognome,
    'Permesso di soggiorno', null, null,
    d.scadenza_permesso, (d.scadenza_permesso - current_date)::int
  from public.scadenze_documenti d
  where d.ha_permesso_soggiorno and d.scadenza_permesso is not null

  -- Altri documenti (DURC, ecc.)
  union all
  select
    'documento_altro', 'altro', a.id,
    a.nome_documento,
    'Scadenza documento', null, null,
    a.scadenza, (a.scadenza - current_date)::int
  from public.scadenze_altro a;
