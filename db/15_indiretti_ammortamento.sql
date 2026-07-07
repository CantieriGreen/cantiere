-- ============================================================
-- EdilControl - Costi indiretti: fornitore + ammortamento su N mesi
-- Un costo (es. mezzo, attrezzatura) puo essere spalmato su piu mesi:
-- genera N quote mensili, ognuna entra nella ripartizione del suo mese.
-- Esegui DOPO i file precedenti. Idempotente.
-- ============================================================

alter table public.costi_indiretti
  add column if not exists fornitore_id uuid references public.fornitori(id) on delete set null;
alter table public.costi_indiretti
  add column if not exists ammortamento_id uuid;
alter table public.costi_indiretti
  add column if not exists rata_n int;
alter table public.costi_indiretti
  add column if not exists rate_totali int;

create index if not exists idx_indiretti_ammortamento
  on public.costi_indiretti(ammortamento_id);

-- ============================================================
-- RPC: crea un costo indiretto ammortizzato su N mesi
-- Genera N righe mensili (importo/N) a partire da p_data_inizio.
-- L'ultima rata assorbe l'arrotondamento (somma = importo totale).
-- Ritorna l'ammortamento_id che raggruppa le rate.
-- ============================================================
create or replace function public.crea_costo_indiretto_ammortizzato(
  p_categoria_id uuid,
  p_fornitore_id uuid,
  p_descrizione text,
  p_importo_totale numeric,
  p_data_inizio date,
  p_mesi int,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amm uuid := gen_random_uuid();
  v_quota numeric(12,2);
  v_importo numeric(12,2);
  i int;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Solo un amministratore puo registrare gli ammortamenti';
  end if;
  if p_mesi is null or p_mesi < 1 then
    raise exception 'Numero di mesi non valido';
  end if;
  if p_importo_totale is null or p_importo_totale <= 0 then
    raise exception 'Importo non valido';
  end if;

  v_quota := round(p_importo_totale / p_mesi, 2);

  for i in 0 .. p_mesi - 1 loop
    -- l'ultima rata pareggia eventuali centesimi di arrotondamento
    if i = p_mesi - 1 then
      v_importo := p_importo_totale - v_quota * (p_mesi - 1);
    else
      v_importo := v_quota;
    end if;

    insert into public.costi_indiretti (
      categoria_id, fornitore_id, descrizione, data, importo, note,
      ammortamento_id, rata_n, rate_totali
    ) values (
      p_categoria_id, p_fornitore_id,
      p_descrizione || ' (rata ' || (i + 1) || '/' || p_mesi || ')',
      (p_data_inizio + make_interval(months => i))::date,
      v_importo, p_note,
      v_amm, i + 1, p_mesi
    );
  end loop;

  return v_amm;
end $$;

grant execute on function public.crea_costo_indiretto_ammortizzato(
  uuid, uuid, text, numeric, date, int, text
) to authenticated;

-- ============================================================
-- RPC: elimina un intero piano di ammortamento (tutte le rate)
-- ============================================================
create or replace function public.elimina_ammortamento(p_ammortamento_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Solo un amministratore puo eliminare gli ammortamenti';
  end if;

  delete from public.costi_indiretti where ammortamento_id = p_ammortamento_id;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

grant execute on function public.elimina_ammortamento(uuid) to authenticated;
