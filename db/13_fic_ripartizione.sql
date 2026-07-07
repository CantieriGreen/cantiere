-- ============================================================
-- EdilControl - FIC: ripartizione di una fattura su piu cantieri
-- Una fattura puo essere divisa per importo tra piu cantieri:
-- ogni quota genera un ricavo separato collegato alla stessa fattura.
-- Esegui DOPO 11_fattureincloud.sql. Idempotente.
-- ============================================================

-- Piu ricavi possono ora riferire la stessa fattura FIC:
-- l'unicita resta a livello di staging (fic_fatture_importate.fic_id).
drop index if exists public.uq_ricavi_fic_id;
create index if not exists idx_ricavi_fic_id
  on public.ricavi(fic_id) where fic_id is not null;

-- Mappa di come una fattura e stata ripartita sui cantieri.
create table if not exists public.fic_fattura_assegnazioni (
  id uuid primary key default gen_random_uuid(),
  staging_id uuid not null references public.fic_fatture_importate(id) on delete cascade,
  cantiere_id uuid not null references public.cantieri(id) on delete restrict,
  importo numeric(12,2) not null check (importo >= 0),
  ricavo_id uuid references public.ricavi(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fic_assegn_staging
  on public.fic_fattura_assegnazioni(staging_id);

alter table public.fic_fattura_assegnazioni enable row level security;

drop policy if exists fic_assegn_read on public.fic_fattura_assegnazioni;
create policy fic_assegn_read on public.fic_fattura_assegnazioni for select
  using (public.current_role() in ('admin', 'direzione'));

drop policy if exists fic_assegn_write on public.fic_fattura_assegnazioni;
create policy fic_assegn_write on public.fic_fattura_assegnazioni for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ============================================================
-- RPC: ripartisci una fattura su una o piu righe (cantiere + importo)
-- p_righe = jsonb: [{"cantiere_id": "...", "importo": 1234.56}, ...]
-- ============================================================
create or replace function public.fic_ripartisci_fattura(
  p_staging_id uuid,
  p_righe jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f public.fic_fatture_importate;
  v_somma numeric(12,2);
  v_riga record;
  v_ricavo_id uuid;
  v_count int := 0;
  v_first_cantiere uuid;
  v_first_ricavo uuid;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Solo un amministratore puo ripartire le fatture';
  end if;

  select * into v_f from public.fic_fatture_importate where id = p_staging_id;
  if not found then
    raise exception 'Fattura importata non trovata';
  end if;
  if v_f.stato_assegnazione = 'assegnata' then
    raise exception 'Fattura gia assegnata: riaprila prima di modificarla';
  end if;

  if p_righe is null or jsonb_array_length(p_righe) = 0 then
    raise exception 'Nessuna riga di ripartizione';
  end if;

  select coalesce(sum((x->>'importo')::numeric), 0)
    into v_somma
  from jsonb_array_elements(p_righe) x;

  -- la somma deve combaciare col netto (tolleranza centesimi)
  if abs(v_somma - v_f.importo_netto) > 0.01 then
    raise exception 'La somma delle quote (%) deve essere uguale al netto della fattura (%)',
      v_somma, v_f.importo_netto;
  end if;

  for v_riga in
    select (x->>'cantiere_id')::uuid as cantiere_id,
           (x->>'importo')::numeric as importo
    from jsonb_array_elements(p_righe) x
  loop
    if v_riga.cantiere_id is null then
      raise exception 'Riga senza cantiere';
    end if;

    insert into public.ricavi (
      cantiere_id, tipo, numero_documento, data, importo, stato, scadenza, note,
      fic_id, origine
    ) values (
      v_riga.cantiere_id, 'fattura', v_f.numero, coalesce(v_f.data, current_date),
      v_riga.importo, v_f.stato_pagamento, v_f.scadenza,
      'Importata da Fatture in Cloud' || coalesce(' · ' || v_f.cliente_nome, '') ||
        case when jsonb_array_length(p_righe) > 1 then ' (quota ripartita)' else '' end,
      v_f.fic_id, 'fattureincloud'
    )
    returning id into v_ricavo_id;

    insert into public.fic_fattura_assegnazioni (staging_id, cantiere_id, importo, ricavo_id)
    values (p_staging_id, v_riga.cantiere_id, v_riga.importo, v_ricavo_id);

    if v_count = 0 then
      v_first_cantiere := v_riga.cantiere_id;
      v_first_ricavo := v_ricavo_id;
    end if;
    v_count := v_count + 1;
  end loop;

  update public.fic_fatture_importate
    set stato_assegnazione = 'assegnata',
        assegnato_at = now(),
        -- per comodita: se riga unica memorizzo il riferimento diretto
        cantiere_id = case when v_count = 1 then v_first_cantiere else null end,
        ricavo_id = case when v_count = 1 then v_first_ricavo else null end
    where id = p_staging_id;

  return v_count;
end $$;

grant execute on function public.fic_ripartisci_fattura(uuid, jsonb) to authenticated;

-- ============================================================
-- RPC: riapri una fattura assegnata (annulla i ricavi generati)
-- ============================================================
create or replace function public.fic_riapri_fattura(p_staging_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'admin' then
    raise exception 'Solo un amministratore puo riaprire le fatture';
  end if;

  delete from public.ricavi
  where id in (
    select ricavo_id from public.fic_fattura_assegnazioni
    where staging_id = p_staging_id and ricavo_id is not null
  );

  delete from public.fic_fattura_assegnazioni where staging_id = p_staging_id;

  update public.fic_fatture_importate
    set stato_assegnazione = 'da_assegnare',
        cantiere_id = null,
        ricavo_id = null,
        assegnato_at = null
    where id = p_staging_id;
end $$;

grant execute on function public.fic_riapri_fattura(uuid) to authenticated;

-- ============================================================
-- Reindirizza il vecchio RPC singolo sul nuovo (retro-compatibilita)
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
  v_netto numeric(12,2);
begin
  select importo_netto into v_netto
  from public.fic_fatture_importate where id = p_staging_id;

  perform public.fic_ripartisci_fattura(
    p_staging_id,
    jsonb_build_array(jsonb_build_object('cantiere_id', p_cantiere_id, 'importo', v_netto))
  );

  return (select ricavo_id from public.fic_fatture_importate where id = p_staging_id);
end $$;
