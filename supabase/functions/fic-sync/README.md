# Integrazione Fatture in Cloud — guida operativa

Importa le **fatture emesse** da Fatture in Cloud (FIC) in EdilControl. Le fatture
arrivano in un'inbox ("Fatture da assegnare" nella sezione Ricavi); l'admin le
collega al cantiere e diventano ricavi.

## Architettura

- **Edge Function `fic-sync`** (questo modulo): gira sui server Supabase, custodisce
  il token FIC, chiama le API FIC e popola la tabella `fic_fatture_importate`.
- **DB** (`db/11_fattureincloud.sql`): tabella di staging + colonne `fic_id`/`origine`
  su `ricavi` + RPC `fic_assegna_a_cantiere`.
- **Frontend**: pulsante "Sincronizza fatture" e inbox nella pagina Ricavi.

Il token FIC **non sta mai nel frontend**: vive solo nei secret della Edge Function.

## 1. Migration database

Esegui nell'SQL Editor di Supabase, in ordine:
1. `db/11_fattureincloud.sql`  (obbligatorio)
2. `db/12_fic_demo_data.sql`   (facoltativo, solo per testare l'inbox senza token)

## 2. Token Fatture in Cloud (Manual Authentication)

1. Il cliente accede al proprio account FIC → impostazioni API/sviluppatori.
2. Genera un **token di accesso manuale** con permesso di **lettura documenti** (issued documents).
3. Annota anche l'**ID azienda** (company id). Si ricava anche via API:
   `GET https://api-v2.fattureincloud.it/user/companies`.

## 3. Configurazione secret + deploy

Con la Supabase CLI (una volta sola):

```bash
# imposta i secret (sostituisci i valori reali del cliente)
supabase secrets set FIC_API_TOKEN="il-token-del-cliente"
supabase secrets set FIC_COMPANY_ID="123456"

# deploy della funzione
supabase functions deploy fic-sync
```

> Finché i secret non sono impostati, il pulsante "Sincronizza fatture" risponde
> con un messaggio chiaro ("Fatture in Cloud non configurato") e non rompe nulla.
> L'inbox e l'assegnazione funzionano comunque sui dati demo.

## 4. (Opzionale) Sincronizzazione automatica giornaliera

Con pg_cron su Supabase, schedula una chiamata quotidiana alla funzione (richiede
l'estensione `pg_cron` + `pg_net`). In alternativa, lasciare solo il pulsante manuale.

## Note

- I nomi dei campi FIC nella funzione (`amount_net`, `entity.name`, `payments_list`,
  ecc.) vanno verificati sui **dati reali** del cliente alla prima sincronizzazione
  e ritoccati se l'account usa una struttura diversa.
- I ricavi importati da FIC sono in **sola lettura** nell'app (badge "FIC"): importo
  e stato si aggiornano solo alla sincronizzazione.
