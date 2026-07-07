-- ============================================================
-- EdilControl - Integrazione Fatture in Cloud (FIC)
-- Importazione fatture emesse -> inbox -> assegnazione a cantiere.
-- Esegui DOPO i file precedenti. Idempotente.
-- ============================================================

-- ---- Colonne su ricavi: tracciano l'origine e il legame con FIC ----
alter table public.ricavi add column if not exists fic_id text;
alter table public.ricavi
  add column if not exists origine text not null default 'manuale';

do $$ begin
  alter table public.ricavi
    add constraint ricavi_origine_chk check (origine in ('manuale', 'fattureincloud'));
exception when duplicate_object then null; end $$;

-- un ricavo per ogni fattura FIC (evita doppioni)
create unique index if not exists uq_ricavi_fic_id
  on public.ricavi(fic_id) where fic_id is not null;

-- ---- Tabella di staging: fatture importate in attesa di assegnazione ----
create table if not exists public.fic_fatture_importate (
  id uuid primary key default gen_random_uuid(),
  fic_id text not null unique,            -- id documento su Fatture in Cloud
  fic_type text,                          -- es. "invoice"
  numero text,                            -- numero/numerazione documento
  data date,
  importo_netto numeric(12,2) not null default 0,
  importo_totale numeric(12,2) not null default 0,
  cliente_nome text,
  cliente_piva text,
  stato_pagamento stato_ricavo not null default 'in_attesa',
  scadenza date,
  scadenze jsonb,                         -- payments_list grezza da FIC
  stato_assegnazione text not null default 'da_assegnare'
    check (stato_assegnazione in ('da_assegnare', 'assegnata', 'ignorata')),
  cantiere_id uuid references public.cantieri(id) on delete set null,
  ricavo_id uuid references public.ricavi(id) on delete set null,
  importato_at timestamptz not null default now(),
  assegnato_at timestamptz
);

create index if not exists idx_fic_staging_stato
  on public.fic_fatture_importate(stato_assegnazione, data desc);

-- ---- Log delle sincronizzazioni ----
create table if not exists public.fic_sync_log (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  messaggio text,
  importate int not null default 0,
  aggiornate int not null default 0
);

-- ============================================================
-- RLS: lettura admin/direzione, scrittura solo admin
-- (la Edge Function usa la service_role e bypassa queste policy)
-- ============================================================
alter table public.fic_fatture_importate enable row level security;
alter table public.fic_sync_log enable row level security;

drop policy if exists fic_staging_read on public.fic_fatture_importate;
create policy fic_staging_read on public.fic_fatture_importate for select
  using (public.current_role() in ('admin', 'direzione'));

drop policy if exists fic_staging_write on public.fic_fatture_importate;
create policy fic_staging_write on public.fic_fatture_importate for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists fic_log_read on public.fic_sync_log;
create policy fic_log_read on public.fic_sync_log for select
  using (public.current_role() in ('admin', 'direzione'));

drop policy if exists fic_log_write on public.fic_sync_log;
create policy fic_log_write on public.fic_sync_log for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================
-- RPC: assegna una fattura importata a un cantiere
-- crea il ricavo collegato e marca la fattura come assegnata.
-- ============================================================
create or replace function public.fic_assegna_a_cantiere(
  p_staging_id uuid,
  p_cantiere_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fattura public.fic_fatture_importate;
  v_ricavo_id uuid;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Solo un amministratore puo assegnare le fatture';
  end if;

  select * into v_fattura
  from public.fic_fatture_importate
  where id = p_staging_id;

  if not found then
    raise exception 'Fattura importata non trovata';
  end if;

  if v_fattura.stato_assegnazione = 'assegnata' and v_fattura.ricavo_id is not null then
    -- gia assegnata: sposta il ricavo esistente sul nuovo cantiere
    update public.ricavi set cantiere_id = p_cantiere_id where id = v_fattura.ricavo_id;
    update public.fic_fatture_importate
      set cantiere_id = p_cantiere_id, assegnato_at = now()
      where id = p_staging_id;
    return v_fattura.ricavo_id;
  end if;

  insert into public.ricavi (
    cantiere_id, tipo, numero_documento, data, importo, stato, scadenza, note,
    fic_id, origine
  ) values (
    p_cantiere_id, 'fattura', v_fattura.numero, coalesce(v_fattura.data, current_date),
    v_fattura.importo_netto, v_fattura.stato_pagamento, v_fattura.scadenza,
    'Importata da Fatture in Cloud' ||
      coalesce(' · ' || v_fattura.cliente_nome, ''),
    v_fattura.fic_id, 'fattureincloud'
  )
  on conflict (fic_id) where fic_id is not null
    do update set cantiere_id = excluded.cantiere_id
  returning id into v_ricavo_id;

  update public.fic_fatture_importate
    set stato_assegnazione = 'assegnata',
        cantiere_id = p_cantiere_id,
        ricavo_id = v_ricavo_id,
        assegnato_at = now()
    where id = p_staging_id;

  return v_ricavo_id;
end $$;

grant execute on function public.fic_assegna_a_cantiere(uuid, uuid) to authenticated;
