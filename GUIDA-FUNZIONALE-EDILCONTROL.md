# EdilControl — Guida funzionale completa

**Sottotitolo:** Gestionale per il controllo di gestione dell'impresa edile
**Documento:** Traccia per manuale d'uso / presentazione PDF
**Versione applicazione:** Fase 1 + Addon Offerte + Addon Cantieri manutenzione

> **Nota per la generazione del PDF**
> Questo documento descrive *cosa fa* l'applicazione, schermata per schermata e funzione per funzione. È pensato come traccia per un manuale illustrato: ogni sezione può diventare una pagina o un capitolo del PDF, eventualmente affiancata da uno screenshot dell'app. Il tono è quello di una guida pratica rivolta all'utente finale (titolare, ufficio tecnico, capo cantiere).

---

## 1. Che cos'è EdilControl

EdilControl è un'applicazione web pensata per le imprese edili che vogliono sapere, **cantiere per cantiere, se stanno guadagnando o perdendo**.

Raccoglie in un unico posto i tre flussi che determinano il risultato economico di una commessa:

- **i costi della manodopera** (ore dei dipendenti registrate sui cantieri),
- **i costi dei materiali** (acquisti imputati al cantiere),
- **i ricavi** (stati avanzamento lavori e fatture),

e vi aggiunge la quota di **costi indiretti** (struttura, ufficio, mezzi) ripartita in modo automatico o manuale. Il risultato è il **margine** di ogni cantiere, calcolato in tempo reale e sempre aggiornato.

L'applicazione è accessibile da browser, non richiede installazioni e i dati sono custoditi in modo sicuro su database cloud con accesso protetto da credenziali.

### A chi è rivolta
- **Titolare / amministrazione**: visione completa di costi, ricavi e marginalità, gestione anagrafiche e dati aziendali.
- **Direzione tecnica**: monitoraggio dell'andamento dei cantieri e dei report economici.
- **Capo cantiere**: inserimento delle ore lavorate e dei materiali sui cantieri di propria competenza.

---

## 2. Concetti chiave (glossario)

Prima di entrare nelle schermate, alcuni termini ricorrenti nell'app:

| Termine | Significato |
|---|---|
| **Cantiere commessa** | Lavoro su contratto, con un valore contrattuale di riferimento. |
| **Cantiere manutenzione** | Cantiere gestito in regime di manutenzione (modulo aggiuntivo). |
| **Rapportino ore** | Registrazione delle ore lavorate da un dipendente su un cantiere in un dato giorno. |
| **Costo diretto** | Costo attribuibile direttamente al cantiere (manodopera + materiali). |
| **Costo indiretto** | Costo di struttura (affitti, utenze, ufficio, mezzi) non riferibile a un singolo cantiere; viene ripartito. |
| **Margine diretto** | Ricavi − costi diretti. |
| **Margine pieno** | Ricavi − costi diretti − quota di costi indiretti ripartiti. È l'indicatore di redditività reale. |
| **Driver di ripartizione** | Criterio con cui i costi indiretti vengono distribuiti sui cantieri (ore, costi diretti o ricavi). |
| **Tariffa oraria storicizzata** | Costo orario di un dipendente valido in un certo periodo; cambiando tariffa restano congelati i costi già registrati. |
| **Offerta / preventivo** | Proposta economica al cliente, con revisioni e documento Word (modulo aggiuntivo). |

---

## 3. Accesso all'applicazione (Login)

L'app si apre sulla schermata di **accesso**.

1. L'utente inserisce **email** e **password** del proprio account aziendale.
2. Premendo **Accedi**, se le credenziali sono corrette entra nella dashboard.
3. In caso di errore, l'app mostra un messaggio chiaro in italiano (es. *"Email o password non corretti"*, *"Troppi tentativi, attendi qualche minuto"*).
4. È presente un link **"Contatta il supporto"** per chi ha problemi di accesso.

Gli account vengono creati dall'amministratore; non è prevista l'auto-registrazione (l'app è riservata al personale dell'impresa).

---

## 4. La struttura dello schermo

Dopo l'accesso, ogni schermata condivide lo stesso impianto:

### 4.1 Menu laterale (sinistra)
Contiene il logo **EdilControl**, il riquadro con nome e ruolo dell'utente, e la navigazione principale:

- **Dashboard**
- **Cantieri commessa**
- **Cantieri manutenzione** *(modulo aggiuntivo)*
- **Offerte** *(modulo aggiuntivo)*
- **Rapportini ore**
- **Materiali**
- **Ricavi**
- **Costi indiretti**
- **Anagrafiche** (si espande in *Clienti*, *Fornitori*, *Dipendenti*)
- **Report**
- **Impostazioni**

In fondo: **Centro assistenza** (apre una email di supporto) e **Esci** (logout).

> I moduli aggiuntivi **Cantieri manutenzione** e **Offerte** restano sempre visibili nel menu. Se non sono attivi mostrano un piccolo **lucchetto**: cliccandoli si apre una schermata che invita a richiederne l'attivazione (vedi §14).

### 4.2 Barra superiore (header)
- **Ricerca globale**: campo di ricerca rapida (anche con scorciatoia da tastiera) che trova cantieri, clienti, fornitori, dipendenti e offerte e porta direttamente alla scheda.
- **Pulsante "?"**: apre una email verso il supporto.
- **Menu utente**: mostra nome, ruolo ed email, con la voce **Esci**.

---

## 5. Dashboard

È la pagina di sintesi che si apre all'avvio. Risponde alla domanda *"come stanno andando i miei cantieri, complessivamente?"*.

In alto, quattro **indicatori chiave (KPI)** riferiti ai **cantieri attivi** (non chiusi):
- **Ricavi** totali
- **Costi diretti** totali
- **Indiretti ripartiti** totali
- **Margine pieno** complessivo, in verde se positivo e in rosso se negativo, con la percentuale sui ricavi

Sotto, la tabella **"Cantieri attivi"**, ordinata dal margine più alto al più basso. Per ogni cantiere: codice, nome e cliente, ricavi, costi diretti, indiretti, margine pieno (con segno) e percentuale, più una **barra visiva** che evidenzia a colpo d'occhio i cantieri in utile e quelli in perdita (in rosso). Una riga di **totali** chiude la tabella.

Cliccando una riga si apre la **scheda del cantiere**. Il pulsante **"Vedi tutti"** porta all'elenco completo dei cantieri.

---

## 6. Cantieri commessa

### 6.1 Elenco cantieri
Mostra tutti i cantieri a commessa con strumenti di consultazione:

- **Filtri per stato**: *Tutti, In corso, In ritardo, Pianificati, Chiusi* (ognuno con il conteggio).
- **Ricerca** per nome cantiere, cliente o codice.
- Per ogni riga: codice, nome e indirizzo, cliente, **stato** (con etichetta colorata), interruttore **Manutenzione**, barra di **avanzamento ricavi**, **valore contratto** e **margine %**.
- **Interruttore "Manut."**: segnala che il cantiere è gestito anche in manutenzione (alimenta la sezione dedicata, vedi §13).
- Pulsanti per **modificare** o **eliminare** un cantiere (l'eliminazione è bloccata se esistono rapportini, materiali o ricavi collegati, con messaggio esplicativo).

Il pulsante **"Nuovo cantiere"** apre il modulo di creazione (codice, nome, cliente, indirizzo, valore contratto, stato, ecc.).

**Stati del cantiere:** Pianificato · In corso · Sospeso · In ritardo · Chiuso.

### 6.2 Scheda del cantiere
È il cuore operativo dell'app. In alto: nome, codice, cliente, indirizzo, stato ed eventuale etichetta *Manutenzione*.

#### Riepilogo economico
Un pannello a sei celle riassume l'intera economia del cantiere:
1. **Costo manodopera**
2. **Costo materiali**
3. **Indiretti ripartiti**
4. **Ricavi** (con percentuale di avanzamento sul contratto)
5. **Margine diretto** (ricavi − costi diretti)
6. **Margine pieno** (al netto anche degli indiretti), evidenziato e con la percentuale sui ricavi

Una **barra di avanzamento** mostra il rapporto tra ricavi maturati e valore del contratto.

#### Schede di dettaglio (tab)
Sotto al riepilogo, cinque schede:

- **Manodopera** — elenco dei rapportini ore del cantiere, con dipendente, ore ordinarie e straordinarie, trasferte e costo totale; riga dei totali (ore e costo). Da qui si può aggiungere un nuovo rapportino o modificarne/eliminarne uno.
- **Materiali** — elenco degli acquisti imputati al cantiere (data, descrizione, fornitore, quantità, prezzo, totale, riferimento documento) con totale di periodo.
- **Ricavi** — SAL e fatture del cantiere, con data, documento, scadenza, importo e stato (in attesa / pagato / scaduto).
- **Costi indiretti** — quota di costi indiretti ripartita sul cantiere, con dettaglio per periodo e driver utilizzato.
- **Allegati** — documenti del cantiere (contratti, DDT, foto, offerte generate). Si caricano file fino a 25 MB; quelli generati dal modulo Offerte sono contrassegnati con un'etichetta dedicata. Ogni file si può scaricare o eliminare.

---

## 7. Rapportini ore

Sezione dedicata alla registrazione delle ore di lavoro, che alimentano il **costo della manodopera** dei cantieri.

Il modulo **Nuovo rapportino** chiede:
- **Data** del lavoro
- **Cantiere** (con cliente e indirizzo mostrati come riferimento)
- **Dipendente** (mostra la tariffa valida a quella data)
- **Ore ordinarie** e **ore straordinarie** (con selettore +/−, passo mezz'ora)
- **Trasferta** (interruttore) ed eventuale **costo trasferta**
- **Note** libere

Il **costo viene calcolato in tempo reale** mentre si compila: ore ordinarie × tariffa ordinaria + ore straordinarie × tariffa straordinaria + eventuale trasferta. Il dettaglio del calcolo è mostrato a piè di pagina.

> **Punto importante:** il costo usa la **tariffa valida alla data del rapportino**. Modificare in futuro la tariffa di un dipendente **non altera** i costi già registrati: lo storico resta coerente.

Se il dipendente non ha una tariffa valida a quella data, l'app avvisa che il costo non può essere calcolato.

---

## 8. Materiali

Registro degli acquisti di materiale imputati ai cantieri. Per ogni movimento si indicano data, cantiere, descrizione, **fornitore**, quantità e unità di misura, prezzo unitario, importo totale e riferimento documento (es. numero DDT o fattura).

I materiali confluiscono automaticamente nel **costo materiali** del cantiere e quindi nel margine. Possono essere inseriti, modificati ed eliminati sia dalla sezione Materiali sia dalla scheda del singolo cantiere.

---

## 9. Ricavi

Registro dei **ricavi** dei cantieri: **SAL** (stati avanzamento lavori) e **fatture**.

Per ogni voce: data, numero documento, **tipo** (SAL / Fattura), **scadenza**, **importo** e **stato**:
- **In attesa** (giallo)
- **Pagato** (verde)
- **Scaduto** (rosso)

I ricavi determinano la percentuale di **avanzamento** del cantiere rispetto al valore di contratto e concorrono al calcolo del margine.

---

## 10. Costi indiretti e ripartizione

Sezione per gestire i **costi di struttura** (affitti, utenze, personale d'ufficio, mezzi) e distribuirli sui cantieri, così che il **margine pieno** rifletta anche questi costi.

Il lavoro è organizzato **per periodo (mese)**, selezionabile in alto. La pagina è divisa in tre blocchi:

### A — Costi indiretti del periodo
Elenco dei costi del mese, con categoria, descrizione e importo, e totale complessivo. Si aggiungono, modificano ed eliminano singole voci.

### B — Configurazione della ripartizione
Si sceglie **come** distribuire il totale sui cantieri attivi:
- **Per driver automatico** *(consigliato)*: il sistema calcola il peso di ogni cantiere in base a un parametro a scelta:
  - **Ore lavorate** sul cantiere
  - **Costi diretti** del cantiere
  - **Ricavi** del cantiere
- **Per percentuale manuale**: si imposta a mano la percentuale di ciascun cantiere (devono sommare 100%).

### Anteprima e applicazione
Una tabella mostra **in anteprima** come verrebbero distribuiti i costi: per ogni cantiere il valore del driver, la percentuale e la **quota in euro**. Quando la distribuzione è corretta, il pulsante **"Applica ripartizione al periodo"** assegna le quote ai cantieri.

Le quote applicate diventano subito visibili nella scheda di ciascun cantiere e nel suo margine pieno. Riapplicando una ripartizione sullo stesso periodo, la precedente viene **sostituita**. Un indicatore segnala se il periodo è già stato ripartito o è ancora da elaborare (utile prima della chiusura del mese).

---

## 11. Anagrafiche

Raggruppa i registri di base dell'impresa.

### 11.1 Clienti
Elenco e schede dei clienti (ragione sociale, dati fiscali, recapiti, ecc.). I clienti vengono associati ai cantieri e alle offerte.

### 11.2 Fornitori
Elenco e schede dei fornitori, con la possibilità di assegnare una **valutazione a stelle** (rating). I fornitori vengono associati ai movimenti di materiale.

### 11.3 Dipendenti
Elenco e schede dei dipendenti. La scheda contiene:
- Anagrafica (mansione, tipo **operaio/ufficio**, data di assunzione, codice fiscale, recapiti, stato attivo/sospeso).
- **Storico delle tariffe orarie**: ogni periodo ha una data di inizio e fine, una tariffa ordinaria e una straordinaria.

> **Gestione delle tariffe storicizzate:** quando si inserisce un **nuovo periodo tariffario**, il precedente viene **chiuso automaticamente**. In questo modo ogni rapportino usa sempre la tariffa giusta in base alla data, e gli aumenti di costo del lavoro non riscrivono la storia dei costi già calcolati.

---

## 12. Report

Sezione di **analisi economica** dei cantieri, con possibilità di esportazione.

In alto si sceglie l'**ambito**:
- **Cantieri commessa**
- **Cantieri manutenzione**
- **Tutti i cantieri**

Vengono mostrati quattro KPI: **Ricavi**, **Costi** (diretti + indiretti), **Margine complessivo** (verde/rosso) e conteggio **Attivi / Passivi** (cantieri in utile / in perdita).

La tabella **"Dettaglio per cantiere"** elenca ogni cantiere con ricavi, costi, margine e stato **Attivo/Passivo**, con riga di totali. Cliccando una riga si apre la scheda del cantiere.

### Esportazione
- **Excel**: scarica il report in foglio di calcolo.
- **PDF**: genera un PDF intestato con la **ragione sociale dell'azienda** (presa dalle Impostazioni), titolo, sottotitolo e riga di totali.

---

## 13. Impostazioni

Due schede:

### 13.1 Dati azienda
Dati dell'impresa (ragione sociale, forma giuridica, P.IVA, codice fiscale, codice SDI, sede, città, recapiti, PEC, IBAN, REA). Questi dati **intestano i report e le offerte** generati dall'app.

### 13.2 Utenti e ruoli
Elenco degli utenti dell'app, con possibilità di:
- cambiare il **ruolo** di un utente (Amministratore / Capo cantiere / Direzione),
- **sospendere o riattivare** un utente.

I nuovi utenti si creano dal pannello di amministrazione del database (servizio di autenticazione); da qui se ne gestiscono ruoli e stato. *(L'utente non può modificare il proprio ruolo, per sicurezza.)*

---

## 14. Moduli aggiuntivi (addon)

Due sezioni sono **moduli opzionali a pagamento**, attivabili su richiesta. Restano sempre visibili nel menu; se non attivi mostrano un **lucchetto** e, alla selezione, una schermata **"modulo non attivo"** con la descrizione del modulo e un pulsante **"Richiedi attivazione"** che apre una email al fornitore.

L'attivazione avviene lato fornitore tramite un'impostazione dedicata: una volta abilitato il modulo, la sezione diventa immediatamente operativa.

### 14.1 Offerte *(addon)*
Modulo per la redazione dei **preventivi commerciali** ai clienti.

Per ogni offerta si compilano:
- **Intestazione**: titolo, numero (assegnato automaticamente) e data.
- **Committente**: cliente esistente oppure nuovo cliente, località ed eventuale **cantiere associato**.
- **Sintesi della proposta**: tipo di intervento, categoria lavori, superficie, piani, durata, struttura, finiture, garanzia.
- **Configurazione materiali**: voci di materiale con **ricarico %**; l'app calcola il prezzo finale e propone di usarlo come importo dell'offerta.
- **Offerta economica**: importo lavori (IVA esclusa), oneri sicurezza e **modalità di pagamento** in percentuali (es. 30% alla firma, 40% a SAL, 30% a fine lavori); l'app verifica che le percentuali sommino 100%.
- **Tempistiche, esclusioni e note** (le note interne non finiscono nel documento al cliente).

Funzioni del modulo Offerte:
- **Stato dell'offerta**: *Trattativa inviata*, *OK · Accettata*, *KO · Rifiutata*.
- **Revisioni**: si può salvare una nuova revisione con nota; viene mantenuto lo **storico** delle revisioni con autore e data.
- **Genera Word**: produce il documento dell'offerta in formato Word (.docx), pronto da inviare al cliente e modificabile fuori dall'app. Se l'offerta è collegata a un cantiere, il documento viene anche **allegato automaticamente** alla scheda del cantiere.
- **Conversione in cantiere**: quando l'offerta è accettata, con un clic si crea un **cantiere commessa** con valore contratto pari all'importo dell'offerta. L'app segnala l'avvenuta conversione e collega il cantiere creato.

### 14.2 Cantieri manutenzione *(addon)*
Vista dedicata ai cantieri gestiti in **manutenzione**, separata dai cantieri a commessa, con elenco e indicatori propri. Un cantiere entra in questa vista attivando l'apposito interruttore **Manutenzione** nella scheda/elenco cantieri. I dati di manutenzione confluiscono nei report (ambito *Manutenzione* o *Tutti*).

---

## 15. Ruoli e permessi

L'app prevede tre ruoli con visibilità e poteri diversi:

| Funzione | Amministratore | Direzione | Capo cantiere |
|---|---|---|---|
| Vedere tutti i cantieri | ✅ | ✅ | Solo quelli **assegnati** |
| Anagrafiche (clienti, fornitori, dipendenti, tariffe) | Modifica | Sola lettura | Sola lettura |
| Creare/modificare cantieri | ✅ | — | — |
| Inserire rapportini e materiali | ✅ | — | ✅ sui propri cantieri |
| Modificare/eliminare i propri rapportini/materiali | ✅ (tutti) | — | ✅ solo i propri (modifica) |
| Ricavi, costi indiretti, ripartizioni | ✅ | Sola lettura | Sola lettura |
| Impostazioni e gestione utenti | ✅ | — | — |

In sintesi: l'**Amministratore** gestisce tutto; la **Direzione** ha visione completa in lettura per il controllo di gestione; il **Capo cantiere** opera solo sui cantieri di sua competenza inserendo ore e materiali.

> La separazione dei dati è garantita a livello di database (sicurezza a livello di riga), non solo nell'interfaccia: ciascun utente vede e modifica esclusivamente ciò che gli compete.

---

## 16. Come si calcola il margine (il flusso completo)

A beneficio di chi legge il PDF, ecco la catena del calcolo, dal dato inserito al risultato:

1. **Manodopera** — i rapportini ore × tariffa valida alla data → *costo manodopera* del cantiere.
2. **Materiali** — gli acquisti imputati → *costo materiali* del cantiere.
3. **Costi diretti** = costo manodopera + costo materiali.
4. **Ricavi** — SAL e fatture registrati → *ricavi* del cantiere.
5. **Margine diretto** = ricavi − costi diretti.
6. **Costi indiretti** — i costi di struttura del mese vengono **ripartiti** sui cantieri secondo il driver scelto → *quota indiretti* del cantiere.
7. **Margine pieno** = ricavi − costi diretti − quota indiretti.

Tutti questi valori si aggiornano automaticamente man mano che si inseriscono i dati e sono visibili nella scheda cantiere, in dashboard e nei report.

---

## 17. Note tecniche e sicurezza (sintesi non tecnica)

- **Accesso protetto**: ogni utente entra con email e password personali.
- **Dati in cloud**: le informazioni sono archiviate su database gestito, con backup e disponibilità garantiti dal provider.
- **Separazione dei permessi**: i ruoli limitano cosa ciascuno può vedere e modificare.
- **Allegati**: i documenti (contratti, DDT, foto, offerte Word) sono conservati in archivio sicuro, fino a 25 MB per file.
- **Storico coerente**: tariffe e ripartizioni sono storicizzate, così i numeri del passato non cambiano quando si aggiornano i dati correnti.

---

## 18. Indice rapido delle schermate (per impaginazione PDF)

1. Login
2. Dashboard
3. Cantieri commessa — elenco
4. Cantiere — scheda e riepilogo economico
5. Cantiere — tab Manodopera / Materiali / Ricavi / Indiretti / Allegati
6. Rapportini ore — nuovo rapportino con calcolo costo
7. Materiali
8. Ricavi
9. Costi indiretti — registro e ripartizione
10. Anagrafiche — Clienti / Fornitori / Dipendenti (tariffe storicizzate)
11. Report — con export Excel e PDF
12. Impostazioni — dati azienda e utenti
13. Offerte *(addon)* — compilazione, revisioni, Word, conversione in cantiere
14. Cantieri manutenzione *(addon)*
15. Schermata "modulo non attivo" (addon bloccato)

---

*Fine documento — traccia funzionale EdilControl.*
