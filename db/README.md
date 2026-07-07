# Database — EdilControl

Migrations da eseguire in ordine nello **SQL Editor di Supabase**.

| File | Descrizione |
|---|---|
| `01_schema.sql` | Tabelle, indici, viste calcolate, funzioni utility. Idempotente (può essere rieseguito). |
| `02_policies.sql` | Row Level Security policies per i 3 ruoli (admin, capo_cantiere, direzione). |
| `03_seed_demo.sql` | Dati di esempio per sviluppo (cantieri, clienti, dipendenti…). **Non eseguire in produzione.** |

## Come applicare

1. Dashboard Supabase → **SQL Editor** → New query
2. Incolla il contenuto del file
3. Esegui (Run)
4. Verifica in **Table Editor** che le tabelle siano comparse

## Schema riassuntivo

```
auth.users (Supabase auth)
└── public.profiles      (1:1, ruolo: admin / capo_cantiere / direzione)

public.clienti           (tipo: lead/prospect/cliente)
public.fornitori
public.dipendenti
└── public.costo_orario_dipendente  (storicizzato, valido_da/valido_a)

public.cantieri          (commessa o manutenzione, valore_contratto, stato)
├── public.rapportini_ore      (ore ordinarie + straordinarie + trasferta)
├── public.materiali            (qta, prezzo_unitario, fornitore, ddt)
├── public.ricavi               (SAL/fatture)
└── public.allegati_cantiere    (file da storage)

public.categorie_indiretto
└── public.costi_indiretti      (affitti, utenze, ecc. per periodo)

public.ripartizioni_indiretto         (regola: % o driver)
└── public.ripartizione_indiretto_righe  (quota per cantiere)

public.offerte           (numerazione EC-P-2026-NNN-RXX)
├── public.offerta_revisioni    (storico R01, R02…)
├── public.offerta_materiali    (voci con ricarico %)
└── public.offerta_pagamenti    (acconti %)
```

## Funzioni Postgres

- `calcola_margine_cantiere(cantiere_id)` — restituisce costi/ricavi/margine
- `applica_ripartizione_indiretto(periodo, regola_id)` — calcola e salva le righe
- `genera_numero_offerta(progressivo, revisione)` — formato `EC-P-2026-NNN-RXX`
