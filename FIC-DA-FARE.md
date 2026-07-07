# Fatture in Cloud — stato e cose da fare

Stato al 22/06/2026. L'integrazione è **sviluppata ma non ancora attiva**: manca il
collegamento con l'account FIC reale (token dal cliente) e il deploy della Edge Function.

---

## ✅ Già fatto (sviluppo completo, build pulita)

- **DB — schema** (`db/11_fattureincloud.sql`): tabella staging `fic_fatture_importate`,
  colonne `fic_id` + `origine` su `ricavi`, log `fic_sync_log`, RLS (lettura
  admin/direzione, scrittura admin).
- **DB — ripartizione multi-cantiere** (`db/13_fic_ripartizione.sql`): tabella
  `fic_fattura_assegnazioni`, RPC `fic_ripartisci_fattura`, `fic_riapri_fattura`,
  `fic_assegna_a_cantiere` (singolo, retro-compatibile).
- **DB — dati demo** (`db/12_fic_demo_data.sql`): 3 fatture finte per testare l'inbox.
- **Backend** (`supabase/functions/fic-sync/index.ts`): scarica le fatture emesse,
  popola lo staging, mappa lo stato pagamento; gated admin; legge i secret.
- **Frontend — attivo** (sezione Ricavi): pulsante "Sincronizza fatture", inbox
  "Fatture da assegnare" con assegnazione singola o **divisione su più cantieri**
  (controllo somma = netto), badge "FIC", righe FIC in sola lettura.
- **Frontend — passivo** (sezione Materiali): inbox "Fatture passive da assegnare",
  con scelta per fattura **Materiale (cantiere)** o **Costo indiretto**; il fornitore
  viene creato in automatico se non esiste. Badge "FIC" su materiali e costi indiretti.
- **Passivo DB/Edge** (`db/16_fic_passive.sql`, demo `db/17_fic_demo_passive.sql`):
  staging `fic_fatture_passive`, RPC `fic_assegna_passiva` + `fic_trova_o_crea_fornitore`,
  colonne `fic_id`/`origine` su materiali e costi_indiretti. La Edge Function `fic-sync`
  ora importa **sia** documenti emessi (attivi) **sia** ricevuti (passivi).

---

## ⏳ Da fare per andare in produzione

### 1. Applicare le migration su Supabase (SQL Editor), in ordine
- [ ] `db/11_fattureincloud.sql`  (attivo)
- [ ] `db/13_fic_ripartizione.sql`  (ripartizione attivo multi-cantiere)
- [ ] `db/16_fic_passive.sql`  (passivo)
- [ ] (facoltativo, solo test) `db/12_fic_demo_data.sql` + `db/17_fic_demo_passive.sql`

### 2. Ottenere le credenziali FIC dal cliente — **BLOCCANTE**
- [ ] Token di **Manual Authentication** con permesso di **lettura documenti emessi**
- [ ] **ID azienda** (company id) su Fatture in Cloud
- *(le deve fornire il cliente dal suo account FIC; finché mancano, la sync risponde
  "Fatture in Cloud non configurato" senza rompere nulla)*

### 3. Deploy della Edge Function + secret
Serve la **Supabase CLI** (o farlo dal pannello). Una volta sola:
- [ ] `supabase secrets set FIC_API_TOKEN="..." FIC_COMPANY_ID="..."`
- [ ] `supabase functions deploy fic-sync`

### 4. Prima sincronizzazione e verifica campi
- [ ] Premere "Sincronizza fatture" e controllare che le fatture arrivino in inbox
- [ ] **Verificare i nomi dei campi FIC** sui dati reali del cliente
  (`amount_net`, `entity.name`, `payments_list`, `due_date`, `status`, …) e
  ritoccare `fic-sync/index.ts` se l'account usa una struttura diversa.
  In particolare **confermare il `type` dei documenti ricevuti** (passivi): la
  function usa `received_documents?type=expense` — verificare che sia il valore
  corretto per le fatture di acquisto del cliente.
- [ ] Controllare la mappatura dello stato pagamento (pagato / scaduto / in attesa)

---

## 🔧 Opzionali / migliorie future

- [ ] **Sincronizzazione automatica giornaliera** (pg_cron + pg_net su Supabase) che
  richiama `fic-sync` una volta al giorno, oltre al pulsante manuale.
- [ ] **Pulsante "Riapri/Correggi"** nell'interfaccia per una fattura già assegnata:
  la logica esiste già (RPC `fic_riapri_fattura` + hook `useRiapriFattura`), manca
  solo il bottone. Utile per correggere un'assegnazione sbagliata.
- [ ] **Webhook FIC** per aggiornamento in tempo reale (al posto/oltre al cron).
- [ ] Eventuale gestione di fatture **parzialmente** assegnabili o note di credito.

---

## 💰 Nota commerciale

Questa integrazione è **fuori dalle 14 giornate** concordate per l'app base + addon →
va messa a preventivo a parte (stima: ~2–3 gg per la parte base + ~½–1 gg per la
ripartizione multi-cantiere, già sviluppate).

## 📌 Prerequisito condiviso

Il **deploy di Edge Function** su Supabase è lo stesso passaggio infrastrutturale
richiesto dall'eventuale **creazione utenti in-app**: se si attivano entrambe,
conviene predisporre la Supabase CLI una volta sola.
