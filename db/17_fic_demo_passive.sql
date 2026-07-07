-- ============================================================
-- EdilControl - DATI DEMO Fatture passive (solo per test)
-- Inserisce alcune fatture di acquisto finte nell'inbox passiva.
-- Eseguilo dopo 16_fic_passive.sql.
-- Per rimuoverli:  delete from public.fic_fatture_passive where fic_id like 'DEMOP-%';
-- ============================================================

insert into public.fic_fatture_passive
  (fic_id, numero, data, importo_netto, importo_totale,
   fornitore_nome, fornitore_piva, stato_pagamento, scadenza, scadenze, stato_assegnazione)
values
  ('DEMOP-001', 'ACQ 2026/55', current_date - 8, 4200.00, 5124.00,
   'Ferramenta Bianchi srl', '02233445566', 'in_attesa', current_date + 22,
   '[{"due_date":"2026-07-14","amount":5124.00,"status":"not_paid"}]'::jsonb,
   'da_assegnare'),
  ('DEMOP-002', 'ACQ 2026/56', current_date - 25, 900.00, 1098.00,
   'Assicurazioni Sicure spa', '03344556677', 'pagato', current_date - 5,
   '[{"due_date":"2026-06-12","amount":1098.00,"status":"paid","paid_date":"2026-06-10"}]'::jsonb,
   'da_assegnare')
on conflict (fic_id) do nothing;
