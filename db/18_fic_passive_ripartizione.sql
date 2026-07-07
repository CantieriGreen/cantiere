-- ============================================================
-- EdilControl - Fatture passive: ripartizione su piu cantieri (ramo Materiale)
-- Una fattura di acquisto puo essere divisa per importo su piu cantieri:
-- ogni quota genera un materiale separato collegato alla stessa fattura.
-- Esegui DOPO 16_fic_passive.sql. Idempotente.
-- ============================================================

-- Piu materiali possono ora riferire la stessa fattura FIC.
drop index if exists public.uq_materiali_fic_id;
create index if not exists idx_materiali_fic_id
  on public.materiali(fic_id) where fic_id is not null;

-- Nuova firma: il ramo "materiale" accetta una lista di quote per cantiere.
drop function if exists public.fic_assegna_passiva(uuid, text, uuid, uuid);

create or replace function public.fic_assegna_passiva(
  p_staging_id uuid,
  p_destinazione text,
  p_righe jsonb,        -- [{ "cantiere_id": "...", "importo": 123.45 }, ...] (solo materiale)
  p_categoria_id uuid   -- solo indiretto
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f public.fic_fatture_passive;
  v_fornitore uuid;
  v_somma numeric(12,2);
  v_riga record;
  v_desc text;
  v_mat uuid;
  v_first_mat uuid;
  v_first_cant uuid;
  v_n int := 0;
  v_ind uuid;
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
    if p_righe is null or jsonb_array_length(p_righe) = 0 then
      raise exception 'Nessuna riga di ripartizione';
    end if;

    select coalesce(sum((x->>'importo')::numeric), 0) into v_somma
    from jsonb_array_elements(p_righe) x;
    if abs(v_somma - v_f.importo_netto) > 0.01 then
      raise exception 'La somma delle quote (%) deve essere uguale al netto (%)',
        v_somma, v_f.importo_netto;
    end if;

    for v_riga in
      select (x->>'cantiere_id')::uuid as cantiere_id,
             (x->>'importo')::numeric as importo
      from jsonb_array_elements(p_righe) x
    loop
      if v_riga.cantiere_id is null then raise exception 'Riga senza cantiere'; end if;

      insert into public.materiali (
        cantiere_id, fornitore_id, descrizione, quantita, prezzo_unitario,
        data, riferimento_documento, note, fic_id, origine
      ) values (
        v_riga.cantiere_id, v_fornitore,
        v_desc || case when jsonb_array_length(p_righe) > 1 then ' (quota ripartita)' else '' end,
        1, v_riga.importo, coalesce(v_f.data, current_date), v_f.numero,
        'Importata da Fatture in Cloud', v_f.fic_id, 'fattureincloud'
      )
      returning id into v_mat;

      if v_n = 0 then v_first_mat := v_mat; v_first_cant := v_riga.cantiere_id; end if;
      v_n := v_n + 1;
    end loop;

    update public.fic_fatture_passive set
      stato_assegnazione = 'assegnata', destinazione = 'materiale',
      fornitore_id = v_fornitore,
      cantiere_id = case when v_n = 1 then v_first_cant else null end,
      materiale_id = case when v_n = 1 then v_first_mat else null end,
      assegnato_at = now()
    where id = p_staging_id;
    return v_fornitore;

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

grant execute on function public.fic_assegna_passiva(uuid, text, jsonb, uuid) to authenticated;
