-- ============================================================
-- EdilControl - Vista costo per singolo rapportino
-- Esegui DOPO i file precedenti. Idempotente.
-- Calcola il costo di ogni rapportino usando la tariffa valida alla sua data.
-- ============================================================

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
    + coalesce(r.costo_trasferta, 0),
    2
  ) as costo_totale
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
