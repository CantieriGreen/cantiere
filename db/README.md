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

## Calendario scadenze (mezzi + dipendenti)

| File | Descrizione |
|---|---|
| `19_scadenze.sql` | Tabelle `mezzi`, `scadenze_visite_mediche`, `tipi_formazione` (con i 10 corsi predefiniti), `scadenze_formazione`, `scadenze_documenti`; vista unificata `v_scadenze`; log `scadenze_notifiche_log`; RPC `scadenze_da_notificare` e `scadenze_destinatari_admin`; RLS (lettura admin/direzione, scrittura admin). Idempotente. |
| `20_scadenze_cron.sql` | Job `pg_cron` giornaliero che chiama la Edge Function `scadenze-notify`. **Contiene due segnaposto da sostituire** prima di eseguirlo. |

### Attivazione, in ordine

1. SQL Editor → esegui `19_scadenze.sql`. Da qui la sezione funziona già nell'app (inserimento, ricerca, campanella degli avvisi).
2. Account [Resend](https://resend.com): verifica il dominio mittente e crea una API key.
3. Deploy della Edge Function e dei secret (serve la Supabase CLI):
   ```bash
   supabase secrets set RESEND_API_KEY="re_..." \
     RESEND_FROM_EMAIL="scadenze@<dominio-verificato>" \
     SCADENZE_CRON_SECRET="<stringa-casuale-lunga>" \
     APP_URL="https://<indirizzo-app>"
   supabase functions deploy scadenze-notify --no-verify-jwt
   ```
   Facoltativo: `SCADENZE_MAIL_TO="a@x.it,b@y.it"` per destinatari fissi al posto degli admin attivi.
4. Prova a mano: nell'app, *Calendario scadenze → Invia avvisi email*.
5. SQL Editor → sostituisci `<PROJECT_REF>` e `<SCADENZE_CRON_SECRET>` in `20_scadenze_cron.sql` ed eseguilo.

Le email partono una volta al giorno per le scadenze che distano **esattamente** 14, 7, 3 o 1 giorno; ogni (scadenza, soglia) viene notificata una sola volta. Se l'invio fallisce il log viene annullato e il giro successivo riprova.
