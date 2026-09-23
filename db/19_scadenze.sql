-- ============================================================
-- EdilControl - Calendario scadenze (mezzi + dipendenti)
-- Mezzi: assicurazione, bollo, revisione.
-- Dipendenti: visite mediche, formazione sicurezza, patente/permesso.
-- Vista unificata v_scadenze -> alimenta notifiche in-app e email.
-- Esegui DOPO i file precedenti. Idempotente.
-- ============================================================

-- ============================================================
-- ENUM
-- ============================================================

do $$ begin
  create type tipo_evento_formazione as enum ('corso', 'aggiornamento');
exception when duplicate_object then null; end $$;

-- ============================================================
-- MEZZI
-- ============================================================

create table if not exists public.mezzi (
  id uuid primary key default gen_random_uuid(),
  tipo_mezzo text not null,
  targa text,
  descrizione text,
  scadenza_assicurazione date,
  scadenza_bollo date,
  scadenza_revisione date,
  attivo boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mezzi_tipo on public.mezzi(lower(tipo_mezzo));
create index if not exists idx_mezzi_targa on public.mezzi(lower(targa));

-- ============================================================
-- DIPENDENTI - visite mediche
-- dipendente_id e' opzionale: si puo' registrare una scadenza anche per
-- una persona non presente in anagrafica. Se collegato, nome/cognome
-- restano salvati sulla riga (storico stabile).
-- ============================================================

create table if not exists public.scadenze_visite_mediche (
  id uuid primary key default gen_random_uuid(),
  dipendente_id uuid references public.dipendenti(id) on delete set null,
  nome text not null,
  cognome text not null,
  telefono text,
  scadenza_visita date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_visite_scadenza on public.scadenze_visite_mediche(scadenza_visita);
create index if not exists idx_visite_dipendente on public.scadenze_visite_mediche(dipendente_id);

-- ============================================================
-- DIPENDENTI - formazione sicurezza sul lavoro
-- ============================================================

create table if not exists public.tipi_formazione (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  predefinito boolean not null default false,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.tipi_formazione(nome, predefinito)
select v.nome, true
from (values
  ('Antincendio'),
  ('Primo soccorso'),
  ('Preposto'),
  ('Generale e specifica rischio alto'),
  ('Lavori in altezza'),
  ('PLE'),
  ('PES'),
  ('PAV'),
  ('PEI'),
  ('DPI terza categoria')
) as v(nome)
where not exists (
  select 1 from public.tipi_formazione t where t.nome = v.nome
);

create table if not exists public.scadenze_formazione (
  id uuid primary key default gen_random_uuid(),
  dipendente_id uuid references public.dipendenti(id) on delete set null,
  nome text not null,
  cognome text not null,
  tipo_formazione_id uuid not null references public.tipi_formazione(id) on delete restrict,
  tipologia tipo_evento_formazione not null default 'corso',
  scadenza date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_formazione_scadenza on public.scadenze_formazione(scadenza);
create index if not exists idx_formazione_dipendente on public.scadenze_formazione(dipendente_id);
create index if not exists idx_formazione_tipo on public.scadenze_formazione(tipo_formazione_id);

-- ============================================================
-- DIPENDENTI - patente e permesso di soggiorno
-- Il permesso di soggiorno e' opzionale (lavoratore che non ne ha bisogno).
-- ============================================================

create table if not exists public.scadenze_documenti (
  id uuid primary key default gen_random_uuid(),
  dipendente_id uuid references public.dipendenti(id) on delete set null,
  nome text not null,
  cognome text not null,
  scadenza_patente date,
  ha_permesso_soggiorno boolean not null default false,
  scadenza_permesso date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_permesso_coerente check (
    ha_permesso_soggiorno or scadenza_permesso is null
  )
);

create index if not exists idx_documenti_patente on public.scadenze_documenti(scadenza_patente);
create index if not exists idx_documenti_permesso on public.scadenze_documenti(scadenza_permesso);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================

do $$
declare t text;
begin
  for t in select unnest(array[
    'mezzi',
    'scadenze_visite_mediche',
    'scadenze_formazione',
    'scadenze_documenti'
  ]) loop
    execute format('drop trigger if exists trg_%I_updated on public.%I', t, t);
    execute format('create trigger trg_%I_updated before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ============================================================
-- VISTA UNIFICATA DELLE SCADENZE
-- Una riga per ogni data di scadenza presente nel sistema.
-- giorni < 0 = gia' scaduta.
-- security_invoker: la vista rispetta le RLS delle tabelle sottostanti.
-- ============================================================

drop view if exists public.v_scadenze;
create view public.v_scadenze
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
  where d.ha_permesso_soggiorno and d.scadenza_permesso is not null;

-- ============================================================
-- LOG NOTIFICHE EMAIL
-- Una riga per (scadenza, soglia) gia' notificata: impedisce i doppioni
-- anche se il cron gira piu' volte nello stesso giorno.
-- ============================================================

create table if not exists public.scadenze_notifiche_log (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  record_id uuid not null,
  scadenza date not null,
  soglia_giorni int not null,
  destinatari text,
  inviata_at timestamptz not null default now(),
  constraint uq_notifica unique (tipo, record_id, scadenza, soglia_giorni)
);

create index if not exists idx_notifiche_inviata on public.scadenze_notifiche_log(inviata_at desc);

-- ============================================================
-- RPC: rivendica le notifiche da inviare per le soglie indicate.
-- Inserisce nel log e ritorna SOLO le righe effettivamente inserite:
-- quelle gia' presenti (gia' notificate) vengono scartate.
-- Chiamata dalla Edge Function con service role.
-- ============================================================

create or replace function public.scadenze_da_notificare(p_soglie int[] default array[14,7,3,1])
returns table (
  tipo text,
  categoria text,
  record_id uuid,
  titolo text,
  dettaglio text,
  scadenza date,
  giorni int
)
-- language sql (non plpgsql): i nomi delle colonne di output coincidono con
-- quelli delle tabelle, e in plpgsql darebbero "column reference is ambiguous".
language sql
security definer
set search_path = public
as $$
  with candidate as (
    select s.tipo, s.categoria, s.record_id, s.titolo, s.dettaglio, s.scadenza, s.giorni
    from public.v_scadenze s
    where s.giorni = any(p_soglie)
  ), claimed as (
    insert into public.scadenze_notifiche_log (tipo, record_id, scadenza, soglia_giorni)
    select c.tipo, c.record_id, c.scadenza, c.giorni from candidate c
    on conflict on constraint uq_notifica do nothing
    returning scadenze_notifiche_log.tipo       as k_tipo,
              scadenze_notifiche_log.record_id  as k_record_id,
              scadenze_notifiche_log.scadenza   as k_scadenza,
              scadenze_notifiche_log.soglia_giorni as k_soglia
  )
  select c.tipo, c.categoria, c.record_id, c.titolo, c.dettaglio, c.scadenza, c.giorni
  from candidate c
  join claimed k
    on k.k_tipo = c.tipo
   and k.k_record_id = c.record_id
   and k.k_scadenza = c.scadenza
   and k.k_soglia = c.giorni
  order by c.giorni, c.categoria, c.titolo;
$$;

-- ============================================================
-- RPC: email degli amministratori attivi (destinatari delle notifiche).
-- auth.users non e' esposto via API: serve una funzione security definer.
-- ============================================================

create or replace function public.scadenze_destinatari_admin()
returns table (email text)
language sql
security definer
set search_path = public
as $$
  select u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.ruolo = 'admin'
    and p.attivo
    and u.email is not null;
$$;

revoke all on function public.scadenze_da_notificare(int[]) from public, anon, authenticated;
revoke all on function public.scadenze_destinatari_admin() from public, anon, authenticated;
grant execute on function public.scadenze_da_notificare(int[]) to service_role;
grant execute on function public.scadenze_destinatari_admin() to service_role;

-- ============================================================
-- ROW LEVEL SECURITY
-- Dati sensibili (salute, permessi di soggiorno): lettura riservata ad
-- admin e direzione, scrittura al solo admin. I capi cantiere non vedono
-- nulla di questa sezione.
-- ============================================================

alter table public.mezzi enable row level security;
alter table public.tipi_formazione enable row level security;
alter table public.scadenze_visite_mediche enable row level security;
alter table public.scadenze_formazione enable row level security;
alter table public.scadenze_documenti enable row level security;
alter table public.scadenze_notifiche_log enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'mezzi',
    'tipi_formazione',
    'scadenze_visite_mediche',
    'scadenze_formazione',
    'scadenze_documenti'
  ]) loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format($p$create policy %I_read on public.%I for select
      using (public.current_role() in ('admin','direzione'))$p$, t, t);

    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format($p$create policy %I_write on public.%I for all
      using (public.current_role() = 'admin')
      with check (public.current_role() = 'admin')$p$, t, t);
  end loop;
end $$;

-- Log notifiche: sola lettura per admin (la scrittura passa dalla RPC).
drop policy if exists notifiche_log_read on public.scadenze_notifiche_log;
create policy notifiche_log_read on public.scadenze_notifiche_log for select
  using (public.current_role() = 'admin');
