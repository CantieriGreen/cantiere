-- ============================================================
-- EdilControl - DATI DEMO Fatture in Cloud (solo per test)
-- Inserisce alcune fatture finte nell'inbox per provare il flusso
-- di assegnazione SENZA token reale.
--
-- Eseguilo dopo 11_fattureincloud.sql.
-- Per rimuoverli:  delete from public.fic_fatture_importate where fic_id like 'DEMO-%';
-- ============================================================

insert into public.fic_fatture_importate
  (fic_id, fic_type, numero, data, importo_netto, importo_totale,
   cliente_nome, cliente_piva, stato_pagamento, scadenza, scadenze, stato_assegnazione)
values
  ('DEMO-001', 'invoice', 'FT 2026/120', current_date - 12, 15000.00, 18300.00,
   'Condominio Via Roma 12', '01234567890', 'in_attesa', current_date + 18,
   '[{"due_date":"2026-07-10","amount":18300.00,"status":"not_paid"}]'::jsonb,
   'da_assegnare'),
  ('DEMO-002', 'invoice', 'FT 2026/121', current_date - 40, 8200.00, 10004.00,
   'Rossi Costruzioni srl', '09876543210', 'scaduto', current_date - 10,
   '[{"due_date":"2026-06-01","amount":10004.00,"status":"not_paid"}]'::jsonb,
   'da_assegnare'),
  ('DEMO-003', 'invoice', 'FT 2026/118', current_date - 60, 24500.00, 29890.00,
   'Comune di Esempio', '00011122233', 'pagato', current_date - 30,
   '[{"due_date":"2026-05-20","amount":29890.00,"status":"paid","paid_date":"2026-05-18"}]'::jsonb,
   'da_assegnare')
on conflict (fic_id) do nothing;
