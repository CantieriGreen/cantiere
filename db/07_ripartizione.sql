-- ============================================================
-- EdilControl - Logica di ripartizione costi indiretti
-- Esegui DOPO i file precedenti. Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- Anteprima: per ogni cantiere non chiuso, il "peso" (basis)
-- secondo il driver scelto, nel periodo indicato.
-- Il client calcola %/quota da basis e dal totale indiretti.
-- ------------------------------------------------------------

create or replace function public.anteprima_ripartizione(
  p_inizio date,
  p_fine date,
  p_driver driver_ripartizione
) returns table (
  cantiere_id uuid,
  codice text,
  nome text,
  basis numeric
)
language sql stable
set search_path = public
as $$
  select
    c.id,
    c.codice,
    c.nome,
    case p_driver
      when 'ore_lavorate' then coalesce((
        select sum(r.ore_ord + r.ore_str)
        from public.rapportini_ore r
        where r.cantiere_id = c.id
          and r.data between p_inizio and p_fine
      ), 0)
      when 'costi_diretti' then
        coalesce((
          select sum(vrc.costo_totale)
          from public.v_rapportino_costo vrc
          where vrc.cantiere_id = c.id
            and vrc.data between p_inizio and p_fine
        ), 0)
        + coalesce((
          select sum(m.importo_totale)
          from public.materiali m
          where m.cantiere_id = c.id
            and m.data between p_inizio and p_fine
        ), 0)
      when 'ricavi' then coalesce((
        select sum(ri.importo)
        from public.ricavi ri
        where ri.cantiere_id = c.id
          and ri.data between p_inizio and p_fine
      ), 0)
      else 0
    end::numeric as basis
  from public.cantieri c
  where c.stato <> 'chiuso'
  order by c.codice;
$$;

-- ------------------------------------------------------------
-- Applica: salva la ripartizione per un periodo.
-- Sostituisce eventuale ripartizione già esistente per lo stesso periodo.
-- p_righe = [{ "cantiere_id": "...", "percentuale": 12.5, "importo": 678.50 }, ...]
-- Gira come l'utente => solo admin (RLS) può scrivere.
-- ------------------------------------------------------------

create or replace function public.applica_ripartizione(
  p_inizio date,
  p_fine date,
  p_driver driver_ripartizione,
  p_righe jsonb
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  delete from public.ripartizioni_indiretto
  where periodo_inizio = p_inizio and periodo_fine = p_fine;

  insert into public.ripartizioni_indiretto
    (periodo_inizio, periodo_fine, driver, applicata_at)
  values (p_inizio, p_fine, p_driver, now())
  returning id into v_id;

  insert into public.ripartizione_indiretto_righe
    (ripartizione_id, cantiere_id, percentuale, importo)
  select
    v_id,
    (e->>'cantiere_id')::uuid,
    coalesce((e->>'percentuale')::numeric, 0),
    coalesce((e->>'importo')::numeric, 0)
  from jsonb_array_elements(p_righe) e
  where coalesce((e->>'importo')::numeric, 0) > 0;

  return v_id;
end $$;

-- ------------------------------------------------------------
-- Ripartizione applicata per un periodo (per mostrare lo stato)
-- ------------------------------------------------------------

create or replace function public.ripartizione_periodo(
  p_inizio date,
  p_fine date
) returns table (
  id uuid,
  driver driver_ripartizione,
  applicata_at timestamptz
)
language sql stable
set search_path = public
as $$
  select id, driver, applicata_at
  from public.ripartizioni_indiretto
  where periodo_inizio = p_inizio and periodo_fine = p_fine
  limit 1;
$$;
