# Tecnoimpianti — Guida alla revisione dell'applicazione

**Scopo di questo documento:** permettere a chi revisiona l'app di **orientarsi rapidamente**, capire cosa fa ogni sezione e il comportamento atteso, così da individuare **bug** e **aree migliorabili** e produrre un resoconto.

> App = *Tecnoimpianti* (gestionale controllo di gestione per impresa edile). Nome del progetto/codice: *edilcontrol*. Stack: React + TypeScript + Vite, database e autenticazione su Supabase, deploy su Vercel.

---

## 0. Come accedere e come muoversi

- **URL**: _(inserire l'indirizzo dell'app)_
- **Credenziali di prova**: _(farsele dare — servono almeno un utente **Amministratore**; se possibile anche un **Capo cantiere** per testare i permessi ridotti)_
- **Struttura schermo**: menu di navigazione a **sinistra**, barra in **alto** (ricerca globale, "?", menu utente), contenuto al centro.
- **Suggerimento**: per una revisione realistica servono **dati** (almeno un paio di cantieri con rapportini, materiali, ricavi e qualche costo indiretto), altrimenti molte viste appaiono vuote.

### Nota importante per il revisore
Alcune funzioni sono **volutamente non attive / non completate** in questa fase: sono elencate nella sezione **§13 "Limiti noti e fuori scope"**. Leggerla **prima** di segnalare, per non riportare cose già note.

---

## 1. Ruoli e permessi (testare con l'ottica giusta)

Tre ruoli, con visibilità diversa. La separazione è garantita a livello di database (Row Level Security), non solo nell'interfaccia.

| Funzione | Amministratore | Direzione | Capo cantiere |
|---|---|---|---|
| Vedere tutti i cantieri | ✅ | ✅ | Solo quelli **assegnati** |
| Anagrafiche (clienti/fornitori/dipendenti/tariffe) | Modifica | Sola lettura | Sola lettura |
| Creare/modificare cantieri | ✅ | — | — |
| Inserire rapportini e materiali | ✅ | — | ✅ sui propri cantieri |
| Ricavi, costi indiretti, ripartizioni | ✅ | Sola lettura | Sola lettura |
| Impostazioni, utenti, sincronizzazione Fatture in Cloud | ✅ | — | — |

**Cosa verificare:** che un Capo cantiere non veda/tocchi ciò che non gli compete; che i pulsanti "admin-only" (es. "Sincronizza fatture") non compaiano agli altri ruoli.

---

## 2. Accesso (Login)

- Login con **email + password**. Messaggi d'errore tradotti in italiano (credenziali errate, troppi tentativi, ecc.).
- Se già autenticato, rimanda alla dashboard.
- Link "Contatta il supporto" (mailto).

**Cosa verificare:** credenziali errate, campo vuoto, comportamento del "resta connesso" (la sessione persiste al refresh).

---

## 3. Dashboard

Pagina di sintesi. In alto **4 KPI** sui cantieri **attivi** (non chiusi): Ricavi, Costi diretti, Indiretti ripartiti, **Margine pieno** (verde/rosso + % sui ricavi). Sotto, tabella **cantieri attivi ordinati per margine**, con barra visiva (in rosso quelli in perdita) e riga totali. Click su una riga → scheda cantiere.

**Cosa verificare:** che i totali coincidano con la somma dei cantieri; coerenza tra Dashboard, scheda cantiere e Report.

---

## 4. Cantieri commessa

### Elenco
Filtri per stato (Tutti / In corso / In ritardo / Pianificati / Chiusi) + ricerca. Colonne: codice, nome/indirizzo, cliente, stato, interruttore **Manutenzione**, avanzamento ricavi, valore contratto, margine %. Azioni: nuovo, modifica, elimina.
- **Stati**: Pianificato · In corso · Sospeso · In ritardo · Chiuso.
- L'eliminazione è **bloccata** se ci sono rapportini/materiali/ricavi collegati (messaggio esplicativo).

> ⚠️ Nota per il revisore: lo stato **"Sospeso"** esiste ma **non ha un filtro** dedicato nell'elenco (i sospesi si vedono solo sotto "Tutti"). È un possibile punto da migliorare.

### Scheda cantiere
**Riepilogo economico** a 6 celle: Costo manodopera, Costo materiali, Indiretti ripartiti, Ricavi (con % avanzamento sul contratto), **Margine diretto**, **Margine pieno** (evidenziato). Barra di avanzamento ricavi.

**5 schede (tab):**
- **Manodopera** — rapportini del cantiere (ore ord/str, trasferte/viaggio, costo totale) + totali.
- **Materiali** — acquisti imputati (fornitore, qtà, prezzo, totale, documento).
- **Ricavi** — SAL e fatture (scadenza, importo, stato incasso).
- **Costi indiretti** — quota ripartita sul cantiere per periodo (con driver usato).
- **Allegati** — file del cantiere (max 25 MB); quelli generati dalle Offerte hanno un'etichetta.

**Cosa verificare:** che i numeri del riepilogo cambino coerentemente inserendo/eliminando rapportini, materiali, ricavi; che il margine pieno = ricavi − costi diretti − indiretti.

---

## 5. Rapportini ore

Registrazione ore → alimenta il **costo manodopera** del cantiere.
Campi: data, cantiere, dipendente, **ore ordinarie**, **ore straordinarie**, **Pernottamento** (se attivo applica una **diaria** predefinita **€ 46,48**, modificabile sul rapportino), **Ore di viaggio** + **Costo viaggio** (importo manuale, anche senza pernottamento), note.

Il **costo è calcolato in tempo reale** = ore ord × tariffa ord + ore str × tariffa str + diaria + costo viaggio.

> Punto chiave: il costo usa la **tariffa valida alla data** del rapportino (storicizzata). Cambiare le tariffe in futuro **non** modifica i costi già registrati.

**Cosa verificare:** dipendente senza tariffa valida a quella data (l'app avvisa); che diaria e costo viaggio confluiscano nel costo del cantiere; ricalcolo cambiando la data.

---

## 6. Materiali

Acquisti di materiale imputati ai cantieri (fornitore, qtà, unità, prezzo, totale, documento). Confluiscono nel **costo materiali** → costi diretti.
- I fornitori includono voci "speciali" pre-caricate: **Magazzino** (prelievi interni, solo uscita), **Casello autostradale**, **Benzina** (pedaggi/carburante come costi diretti).
- **Fatture passive da Fatture in Cloud**: se attive (vedi §12), qui compare l'inbox "Fatture passive da assegnare" e le righe importate hanno badge **FIC**.

**Cosa verificare:** somma materiali = valore in scheda cantiere; comportamento con fornitore vuoto.

---

## 7. Ricavi

SAL (Stati Avanzamento Lavori) e fatture attive. Campi: documento, tipo (SAL/Fattura), data, scadenza, importo, **stato incasso** (In attesa / Pagato / Scaduto). KPI in alto: fatturato, incassato, in attesa, scaduto.
- **Fatture attive da Fatture in Cloud**: se attive (§12), inbox "Fatture da assegnare", pulsante "Sincronizza fatture" (admin), righe importate con badge **FIC** e in **sola lettura**.

**Cosa verificare:** i ricavi determinano l'avanzamento del cantiere; coerenza degli stati.

---

## 8. Costi indiretti

Costi di struttura, gestiti **per mese**, poi **ripartiti** sui cantieri.
- **A** — registro costi del periodo (categoria, fornitore, descrizione, importo).
- **B** — configurazione ripartizione: **per driver** (Ore lavorate / Costi diretti / Ricavi) oppure **per percentuale manuale** (deve sommare 100%).
- **Anteprima** della distribuzione + pulsante **"Applica ripartizione al periodo"**. Riapplicando, la precedente viene sostituita.
- **Ammortamento**: alla creazione di un costo si può spuntare "Ammortizza su più mesi" → genera **N quote mensili** (importo ÷ mesi) a partire da una data; ogni quota entra nella ripartizione del suo mese. Le rate hanno badge **"rata n/N"**; eliminandone una si elimina l'intero piano.

> Punto chiave: l'ammortamento spalma nel **tempo** (mesi); la ripartizione spalma sui **cantieri** (di ogni mese). La ripartizione va **applicata mese per mese** (non è automatica).

**Cosa verificare:** che la quota d'ammortamento del mese compaia nella ripartizione e quindi nel margine dei cantieri; somma delle rate = importo totale (l'ultima pareggia i centesimi).

---

## 9. Anagrafiche

- **Clienti** — con **classificazione** (Lead / Prospect / Cliente) e campo "Ragione sociale / Nominativo" (per aziende o privati).
- **Fornitori** — con **valutazione a stelle** e **storico acquisti** (materiali imputati da quel fornitore).
- **Dipendenti** — anagrafica + **storico tariffe orarie**: inserendo un **nuovo periodo tariffario** il precedente viene **chiuso automaticamente**. Le tariffe alimentano il costo dei rapportini in base alla data.

**Cosa verificare:** creazione/modifica; che il costo del fornitore compaia nel suo storico; che la tariffa giusta venga applicata ai rapportini per data.

---

## 10. Report

Analisi economica dei cantieri, con selettore **ambito** (Cantieri commessa / Manutenzione / Tutti). KPI (Ricavi, Costi diretti+indiretti, Margine, Attivi/Passivi) + tabella per cantiere con stato **Attivo/Passivo**. **Esportazione Excel e PDF** (il PDF è intestato con la ragione sociale azienda).

**Cosa verificare:** coerenza con Dashboard; contenuto e formattazione degli export.

---

## 11. Impostazioni

- **Dati azienda** — usati per intestare report e offerte.
- **Utenti e ruoli** — cambio ruolo e sospensione/riattivazione utenti. I **nuovi utenti** si creano dalla dashboard Supabase (vedi §13).

**Cosa verificare:** che l'utente non possa cambiare il **proprio** ruolo; che sospendere un utente ne blocchi l'accesso.

---

## 12. Moduli aggiuntivi (addon) e Fatture in Cloud

### Addon (sezioni a pagamento)
**Offerte** e **Cantieri manutenzione** sono moduli opzionali, comandati da due flag sul database (`addon_offerte`, `addon_manutenzione`). Se non attivi, restano visibili nel menu con un **lucchetto** e aprono la pagina **"modulo non attivo"** (con "Richiedi attivazione").
- **Offerte** (se attivo): preventivi con materiali+ricarico, modalità di pagamento in %, **revisioni**, stato (Inviata / OK / KO), **generazione Word**, **conversione in cantiere**.
- **Cantieri manutenzione** (se attivo): vista dedicata ai cantieri con l'interruttore Manutenzione attivo.

**Cosa verificare:** comportamento con addon ON e OFF; il lucchetto e la pagina di blocco; (se ON) il flusso offerta → Word → conversione in cantiere.

### Integrazione Fatture in Cloud (FIC)
Importa le fatture **attive** (→ Ricavi) e **passive** (→ Materiali o Costi indiretti) da Fatture in Cloud, con inbox di assegnazione ai cantieri (anche **ripartizione su più cantieri** per importo) e creazione automatica del fornitore per le passive.

> ⚠️ **Stato**: l'integrazione è sviluppata ma **NON attiva** in produzione (mancano il token del cliente e il deploy della Edge Function). Il pulsante "Sincronizza" risponderà "non configurato". È testabile solo con dati demo. **Non segnalare come bug** la mancata sincronizzazione reale.

---

## 13. Limiti noti e fuori scope (LEGGERE prima di segnalare)

Questi punti sono **già noti**: non serve riportarli come bug.

1. **Fatture in Cloud non è attivo** (token + deploy Edge Function in attesa del cliente).
2. **Creazione utenti in-app non realizzata**: i nuovi utenti si creano dalla dashboard Supabase; nell'app si gestiscono solo ruolo/stato.
3. **Ripartizione costi indiretti manuale**: va applicata mese per mese (nessuna automazione).
4. **Ammortamenti**: si impostano alla creazione; in modifica si edita la singola rata (la durata non si ricalcola). Nessun pulsante per "annullare/ricreare" un piano dall'interfaccia (esiste solo l'eliminazione dell'intero piano).
5. **Riapri fattura FIC assegnata**: logica presente a livello di database/hook ma **senza pulsante** nell'interfaccia.
6. **Filtro "Sospeso" assente** nell'elenco cantieri (vedi §4).
7. **Assegnazione cantieri ↔ Capo cantiere**: si fa solo via database (nessuna schermata dedicata).
8. **Box utente in sidebar**: è solo un'etichetta (il menu account è nell'header in alto a destra).
9. **Deploy**: ad ogni nuova pubblicazione, una scheda già aperta si **auto-ricarica** una volta (gestione dei chunk aggiornati) — è voluto.

---

## 14. Come vorrei il resoconto (suggerimento)

Per ogni rilievo, sarebbe utile avere:
- **Sezione** dell'app e **cosa stavi facendo** (passi per riprodurre)
- **Ruolo** con cui eri loggato
- **Cosa ti aspettavi** vs **cosa è successo**
- **Gravità**: bloccante / importante / minore / cosmetico
- Se è un **bug** o un **suggerimento di miglioramento**
- Screenshot se possibile

### Percorso di revisione consigliato
1. Login → giro delle anagrafiche (crea cliente, fornitore, dipendente con tariffa).
2. Crea un cantiere → inserisci rapportini (prova diaria e ore viaggio), materiali, ricavi.
3. Controlla il **riepilogo economico** e la **Dashboard** (i numeri tornano?).
4. Costi indiretti: registra costi, prova un **ammortamento**, **applica la ripartizione** e verifica la quota nella scheda cantiere.
5. Report: cambia ambito ed esporta Excel/PDF.
6. Prova gli **addon** (attivi e non) e i **permessi** con un ruolo Capo cantiere.
7. Impostazioni: dati azienda e gestione utenti.

---

*Documento di orientamento per la revisione — Tecnoimpianti / edilcontrol.*
