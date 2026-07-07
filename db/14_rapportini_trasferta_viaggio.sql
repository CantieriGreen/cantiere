-- ============================================================
-- EdilControl - Fornitori speciali + trasferta/viaggio sui rapportini
-- Esegui DOPO i file precedenti. Idempotente.
-- ============================================================

-- ---- 1) Fornitori "speciali" (magazzino interno, carburante, pedaggi) ----
-- Il magazzino e gestito solo in USCITA: i prelievi diventano costi materiali
-- imputati al cantiere con fornitore = "Magazzino".
insert into public.fornitori (ragione_sociale, categoria, note)
select 'Magazzino', 'Interno',
       'Magazzino aziendale (solo uscite): materiale prelevato e imputato ai cantieri.'
where not exists (select 1 from public.fornitori where ragione_sociale = 'Magazzino');

insert into public.fornitori (ragione_sociale, categoria)
select 'Casello autostradale', 'Trasferte'
where not exists (select 1 from public.fornitori where ragione_sociale = 'Casello autostradale');

insert into public.fornitori (ragione_sociale, categoria)
select 'Benzina', 'Carburante'
where not exists (select 1 from public.fornitori where ragione_sociale = 'Benzina');

-- ---- 2) Rapportini: diaria pernottamento + ore/costo viaggio ----
-- pernottamento: il dipendente dorme fuori -> diaria fissa (default 46,48 €)
-- ore_viaggio + costo_viaggio: tempo di viaggio con costo inserito manualmente,
--   anche senza pernottamento.
alter table public.rapportini_ore
  add column if not exists pernottamento boolean not null default false;
alter table public.rapportini_ore
  add column if not exists diaria numeric(10,2) not null default 0 check (diaria >= 0);
alter table public.rapportini_ore
  add column if not exists ore_viaggio numeric(5,2) not null default 0 check (ore_viaggio >= 0);
alter table public.rapportini_ore
  add column if not exists costo_viaggio numeric(10,2) not null default 0 check (costo_viaggio >= 0);

-- ---- 3) Viste costo: includono diaria + costo viaggio (oltre al vecchio costo_trasferta) ----
create or replace view public.v_rapportino_costo as
select
  r.id,
  r.cantiere_id,
  r.dipendente_id,
  r.data,
  r.ore_ord,
  r.ore_str,
  r.trasferta,
  r.costo_trasferta,
  coalesce(t.costo_ord, 0) as tariffa_ord,
  coalesce(t.costo_str, 0) as tariffa_str,
  round(
    r.ore_ord * coalesce(t.costo_ord, 0)
    + r.ore_str * coalesce(t.costo_str, 0),
    2
  ) as costo_ore,
  round(
    r.ore_ord * coalesce(t.costo_ord, 0)
    + r.ore_str * coalesce(t.costo_str, 0)
    + coalesce(r.costo_trasferta, 0)
    + coalesce(r.diaria, 0)
    + coalesce(r.costo_viaggio, 0),
    2
  ) as costo_totale,
  r.pernottamento,
  r.diaria,
  r.ore_viaggio,
  r.costo_viaggio
from public.rapportini_ore r
left join lateral (
  select co.costo_ord, co.costo_str
  from public.costo_orario_dipendente co
  where co.dipendente_id = r.dipendente_id
    and co.valido_da <= r.data
    and (co.valido_a is null or co.valido_a >= r.data)
  order by co.valido_da desc
  limit 1
) t on true;

create or replace view public.v_cantiere_costi_manodopera as
select
  r.cantiere_id,
  sum(
    coalesce(r.ore_ord, 0) * coalesce(c.costo_ord, 0)
    + coalesce(r.ore_str, 0) * coalesce(c.costo_str, 0)
    + coalesce(r.costo_trasferta, 0)
    + coalesce(r.diaria, 0)
    + coalesce(r.costo_viaggio, 0)
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
