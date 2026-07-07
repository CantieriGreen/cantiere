-- ============================================================
-- EdilControl - Dipendenti: data assunzione + gestione tariffe
-- Esegui DOPO i file precedenti. Idempotente.
-- ============================================================

-- Data di assunzione ("in azienda dal")
alter table public.dipendenti add column if not exists data_assunzione date;

-- ============================================================
-- Vista: tariffa attualmente valida per ciascun dipendente
-- ============================================================

create or replace view public.v_tariffa_corrente as
select distinct on (dipendente_id)
  dipendente_id,
  costo_ord,
  costo_str,
  valido_da,
  valido_a
from public.costo_orario_dipendente
where valido_da <= current_date
  and (valido_a is null or valido_a >= current_date)
order by dipendente_id, valido_da desc;

-- ============================================================
-- Funzione: aggiungi un nuovo periodo tariffario
-- Chiude automaticamente il periodo aperto precedente (valido_a = nuova data - 1).
-- Gira come l'utente chiamante => rispetta le RLS (solo admin può scrivere).
-- ============================================================

create or replace function public.aggiungi_tariffa(
  p_dipendente_id uuid,
  p_costo_ord numeric,
  p_costo_str numeric,
  p_valido_da date
) returns public.costo_orario_dipendente
language plpgsql
as $$
declare
  v_row public.costo_orario_dipendente;
begin
  -- Chiudi il periodo aperto che inizia prima della nuova decorrenza
  update public.costo_orario_dipendente
  set valido_a = p_valido_da - 1
  where dipendente_id = p_dipendente_id
    and valido_a is null
    and valido_da < p_valido_da;

  insert into public.costo_orario_dipendente
    (dipendente_id, costo_ord, costo_str, valido_da)
  values
    (p_dipendente_id, p_costo_ord, p_costo_str, p_valido_da)
  returning * into v_row;

  return v_row;
end $$;
