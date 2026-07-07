-- ============================================================
-- EdilControl - Row Level Security
-- Esegui DOPO 01_schema.sql.
-- ============================================================

-- Helper: ruolo dell'utente corrente
create or replace function public.current_role()
returns public.ruolo_utente
language sql stable security definer
set search_path = public
as $$
  select ruolo from public.profiles where id = auth.uid();
$$;

-- Helper: il capo cantiere ha accesso a questo cantiere?
create or replace function public.can_access_cantiere(p_cantiere_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case
    when public.current_role() in ('admin', 'direzione') then true
    else exists (
      select 1 from public.capo_cantiere_assegnazione
      where profile_id = auth.uid() and cantiere_id = p_cantiere_id
    )
  end;
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clienti enable row level security;
alter table public.fornitori enable row level security;
alter table public.dipendenti enable row level security;
alter table public.costo_orario_dipendente enable row level security;
alter table public.cantieri enable row level security;
alter table public.capo_cantiere_assegnazione enable row level security;
alter table public.rapportini_ore enable row level security;
alter table public.tipi_materiale enable row level security;
alter table public.materiali enable row level security;
alter table public.ricavi enable row level security;
alter table public.categorie_indiretto enable row level security;
alter table public.costi_indiretti enable row level security;
alter table public.ripartizioni_indiretto enable row level security;
alter table public.ripartizione_indiretto_righe enable row level security;
alter table public.allegati_cantiere enable row level security;
alter table public.offerte enable row level security;
alter table public.offerta_revisioni enable row level security;
alter table public.offerta_materiali enable row level security;
alter table public.offerta_pagamenti enable row level security;

-- ============================================================
-- POLICIES - profiles
-- ============================================================

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (auth.uid() = id or public.current_role() = 'admin');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (auth.uid() = id or public.current_role() = 'admin');

-- ============================================================
-- POLICIES - lettura generica autenticati
-- (admin/direzione vedono tutto, capo_cantiere vede tutto a parte i cantieri)
-- ============================================================

-- Anagrafiche: tutti gli autenticati possono leggere; solo admin modifica
do $$ begin
  perform 1;
exception when others then null; end $$;

drop policy if exists clienti_read on public.clienti;
create policy clienti_read on public.clienti for select using (auth.uid() is not null);
drop policy if exists clienti_write on public.clienti;
create policy clienti_write on public.clienti for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists fornitori_read on public.fornitori;
create policy fornitori_read on public.fornitori for select using (auth.uid() is not null);
drop policy if exists fornitori_write on public.fornitori;
create policy fornitori_write on public.fornitori for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists dipendenti_read on public.dipendenti;
create policy dipendenti_read on public.dipendenti for select using (auth.uid() is not null);
drop policy if exists dipendenti_write on public.dipendenti;
create policy dipendenti_write on public.dipendenti for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists costo_orario_read on public.costo_orario_dipendente;
create policy costo_orario_read on public.costo_orario_dipendente for select using (auth.uid() is not null);
drop policy if exists costo_orario_write on public.costo_orario_dipendente;
create policy costo_orario_write on public.costo_orario_dipendente for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists tipi_materiale_read on public.tipi_materiale;
create policy tipi_materiale_read on public.tipi_materiale for select using (auth.uid() is not null);
drop policy if exists tipi_materiale_write on public.tipi_materiale;
create policy tipi_materiale_write on public.tipi_materiale for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists categorie_ind_read on public.categorie_indiretto;
create policy categorie_ind_read on public.categorie_indiretto for select using (auth.uid() is not null);
drop policy if exists categorie_ind_write on public.categorie_indiretto;
create policy categorie_ind_write on public.categorie_indiretto for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- ============================================================
-- POLICIES - cantieri (capo cantiere vede solo i suoi)
-- ============================================================

drop policy if exists cantieri_read on public.cantieri;
create policy cantieri_read on public.cantieri for select using (
  public.current_role() in ('admin', 'direzione')
  or exists (
    select 1 from public.capo_cantiere_assegnazione a
    where a.profile_id = auth.uid() and a.cantiere_id = cantieri.id
  )
);

drop policy if exists cantieri_write on public.cantieri;
create policy cantieri_write on public.cantieri for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists assegn_read on public.capo_cantiere_assegnazione;
create policy assegn_read on public.capo_cantiere_assegnazione for select
  using (public.current_role() in ('admin', 'direzione') or profile_id = auth.uid());

drop policy if exists assegn_write on public.capo_cantiere_assegnazione;
create policy assegn_write on public.capo_cantiere_assegnazione for all
  using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- ============================================================
-- POLICIES - rapportini & materiali (capo cantiere inserisce sui suoi cantieri)
-- ============================================================

drop policy if exists rapportini_read on public.rapportini_ore;
create policy rapportini_read on public.rapportini_ore for select
  using (public.can_access_cantiere(cantiere_id));

drop policy if exists rapportini_insert on public.rapportini_ore;
create policy rapportini_insert on public.rapportini_ore for insert
  with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'capo_cantiere' and public.can_access_cantiere(cantiere_id))
  );

drop policy if exists rapportini_update on public.rapportini_ore;
create policy rapportini_update on public.rapportini_ore for update
  using (public.current_role() = 'admin' or (public.current_role() = 'capo_cantiere' and created_by = auth.uid()))
  with check (public.current_role() = 'admin' or (public.current_role() = 'capo_cantiere' and created_by = auth.uid()));

drop policy if exists rapportini_delete on public.rapportini_ore;
create policy rapportini_delete on public.rapportini_ore for delete
  using (public.current_role() = 'admin');

drop policy if exists materiali_read on public.materiali;
create policy materiali_read on public.materiali for select
  using (public.can_access_cantiere(cantiere_id));

drop policy if exists materiali_insert on public.materiali;
create policy materiali_insert on public.materiali for insert
  with check (
    public.current_role() = 'admin'
    or (public.current_role() = 'capo_cantiere' and public.can_access_cantiere(cantiere_id))
  );

drop policy if exists materiali_update on public.materiali;
create policy materiali_update on public.materiali for update
  using (public.current_role() = 'admin' or (public.current_role() = 'capo_cantiere' and created_by = auth.uid()))
  with check (public.current_role() = 'admin' or (public.current_role() = 'capo_cantiere' and created_by = auth.uid()));

drop policy if exists materiali_delete on public.materiali;
create policy materiali_delete on public.materiali for delete
  using (public.current_role() = 'admin');

-- ============================================================
-- POLICIES - ricavi, indiretti, ripartizioni (solo admin scrive)
-- ============================================================

drop policy if exists ricavi_read on public.ricavi;
create policy ricavi_read on public.ricavi for select using (public.can_access_cantiere(cantiere_id));
drop policy if exists ricavi_write on public.ricavi;
create policy ricavi_write on public.ricavi for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists indiretti_read on public.costi_indiretti;
create policy indiretti_read on public.costi_indiretti for select using (public.current_role() in ('admin','direzione'));
drop policy if exists indiretti_write on public.costi_indiretti;
create policy indiretti_write on public.costi_indiretti for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists ripart_read on public.ripartizioni_indiretto;
create policy ripart_read on public.ripartizioni_indiretto for select using (public.current_role() in ('admin','direzione'));
drop policy if exists ripart_write on public.ripartizioni_indiretto;
create policy ripart_write on public.ripartizioni_indiretto for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists ripart_righe_read on public.ripartizione_indiretto_righe;
create policy ripart_righe_read on public.ripartizione_indiretto_righe for select using (public.can_access_cantiere(cantiere_id));
drop policy if exists ripart_righe_write on public.ripartizione_indiretto_righe;
create policy ripart_righe_write on public.ripartizione_indiretto_righe for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- ============================================================
-- POLICIES - allegati cantiere
-- ============================================================

drop policy if exists allegati_read on public.allegati_cantiere;
create policy allegati_read on public.allegati_cantiere for select using (public.can_access_cantiere(cantiere_id));

drop policy if exists allegati_insert on public.allegati_cantiere;
create policy allegati_insert on public.allegati_cantiere for insert
  with check (public.current_role() = 'admin' or (public.current_role() = 'capo_cantiere' and public.can_access_cantiere(cantiere_id)));

drop policy if exists allegati_delete on public.allegati_cantiere;
create policy allegati_delete on public.allegati_cantiere for delete using (public.current_role() = 'admin');

-- ============================================================
-- POLICIES - offerte (solo admin gestisce, direzione legge)
-- ============================================================

drop policy if exists offerte_read on public.offerte;
create policy offerte_read on public.offerte for select using (public.current_role() in ('admin','direzione'));
drop policy if exists offerte_write on public.offerte;
create policy offerte_write on public.offerte for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists offerte_rev_read on public.offerta_revisioni;
create policy offerte_rev_read on public.offerta_revisioni for select using (public.current_role() in ('admin','direzione'));
drop policy if exists offerte_rev_write on public.offerta_revisioni;
create policy offerte_rev_write on public.offerta_revisioni for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists offerte_mat_read on public.offerta_materiali;
create policy offerte_mat_read on public.offerta_materiali for select using (public.current_role() in ('admin','direzione'));
drop policy if exists offerte_mat_write on public.offerta_materiali;
create policy offerte_mat_write on public.offerta_materiali for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists offerte_pag_read on public.offerta_pagamenti;
create policy offerte_pag_read on public.offerta_pagamenti for select using (public.current_role() in ('admin','direzione'));
drop policy if exists offerte_pag_write on public.offerta_pagamenti;
create policy offerte_pag_write on public.offerta_pagamenti for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- ============================================================
-- AUTO-PROFILE on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, ruolo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'ruolo')::public.ruolo_utente, 'capo_cantiere'::public.ruolo_utente)
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user error: % (sqlstate %)', sqlerrm, sqlstate;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
