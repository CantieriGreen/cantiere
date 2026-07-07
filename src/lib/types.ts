// Tipi entità del dominio EdilControl (allineati allo schema Supabase)

export type Ruolo = 'admin' | 'capo_cantiere' | 'direzione'
export type TipoCliente = 'lead' | 'prospect' | 'cliente'
export type TipoDipendente = 'operaio' | 'ufficio'
export type StatoCantiere =
  | 'pianificato'
  | 'in_corso'
  | 'sospeso'
  | 'in_ritardo'
  | 'chiuso'
export type StatoOfferta = 'inviata' | 'ok' | 'ko'
export type TipoRicavo = 'sal' | 'fattura'
export type StatoRicavo = 'in_attesa' | 'pagato' | 'scaduto'
export type DriverRipartizione =
  | 'percentuale_manuale'
  | 'ore_lavorate'
  | 'costi_diretti'
  | 'ricavi'

export type Cliente = {
  id: string
  ragione_sociale: string
  tipo: TipoCliente
  partita_iva: string | null
  codice_fiscale: string | null
  referente: string | null
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  cap: string | null
  email: string | null
  pec: string | null
  telefono: string | null
  codice_sdi: string | null
  termini_pagamento: string | null
  cliente_dal: string | null
  attivo: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export type ClienteInput = Omit<
  Cliente,
  'id' | 'created_at' | 'updated_at'
>

export type Fornitore = {
  id: string
  ragione_sociale: string
  partita_iva: string | null
  categoria: string | null
  referente: string | null
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  cap: string | null
  email: string | null
  pec: string | null
  telefono: string | null
  iban: string | null
  condizioni_pagamento: string | null
  valutazione: number | null
  fornitore_dal: string | null
  attivo: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export type FornitoreInput = Omit<
  Fornitore,
  'id' | 'created_at' | 'updated_at'
>

export type Dipendente = {
  id: string
  nome: string
  cognome: string
  codice_fiscale: string | null
  mansione: string | null
  tipo: TipoDipendente
  email: string | null
  telefono: string | null
  data_assunzione: string | null
  attivo: boolean
  created_at: string
  updated_at: string
}

export type DipendenteInput = Omit<
  Dipendente,
  'id' | 'created_at' | 'updated_at'
>

export type Cantiere = {
  id: string
  codice: string
  nome: string
  cliente_id: string | null
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  data_inizio: string | null
  data_fine_prevista: string | null
  stato: StatoCantiere
  valore_contratto: number
  manutenzione: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export type CantiereInput = Omit<Cantiere, 'id' | 'created_at' | 'updated_at'>

// Margini calcolati (dalla vista v_cantiere_margini)
export type CantiereMargini = {
  cantiere_id: string
  costo_manodopera: number
  costo_materiali: number
  costi_diretti: number
  ricavi: number
  margine_diretto: number
  indiretti: number
  margine_pieno: number
}

export type TariffaOraria = {
  id: string
  dipendente_id: string
  costo_ord: number
  costo_str: number
  valido_da: string
  valido_a: string | null
  created_at: string
}

// Tariffa attualmente valida (dalla vista v_tariffa_corrente)
export type TariffaCorrente = {
  dipendente_id: string
  costo_ord: number
  costo_str: number
  valido_da: string
  valido_a: string | null
}

export type RapportinoOre = {
  id: string
  cantiere_id: string
  dipendente_id: string
  data: string
  ore_ord: number
  ore_str: number
  trasferta: boolean
  costo_trasferta: number
  pernottamento: boolean
  diaria: number
  ore_viaggio: number
  costo_viaggio: number
  note: string | null
  created_by: string | null
  created_at: string
}

export type RapportinoInput = {
  cantiere_id: string
  dipendente_id: string
  data: string
  ore_ord: number
  ore_str: number
  pernottamento: boolean
  diaria: number
  ore_viaggio: number
  costo_viaggio: number
  note: string | null
}

export type Materiale = {
  id: string
  cantiere_id: string
  fornitore_id: string | null
  tipo_materiale_id: string | null
  descrizione: string
  quantita: number
  unita_misura: string | null
  prezzo_unitario: number
  importo_totale: number
  data: string
  riferimento_documento: string | null
  note: string | null
  fic_id: string | null
  origine: OrigineRicavo
  created_by: string | null
  created_at: string
}

export type MaterialeInput = {
  cantiere_id: string
  fornitore_id: string | null
  tipo_materiale_id: string | null
  descrizione: string
  quantita: number
  unita_misura: string | null
  prezzo_unitario: number
  data: string
  riferimento_documento: string | null
  note: string | null
}

export type TipoMateriale = {
  id: string
  nome: string
  attivo: boolean
}

export type OrigineRicavo = 'manuale' | 'fattureincloud'

export type Ricavo = {
  id: string
  cantiere_id: string
  tipo: TipoRicavo
  numero_documento: string | null
  data: string
  importo: number
  stato: StatoRicavo
  scadenza: string | null
  note: string | null
  fic_id: string | null
  origine: OrigineRicavo
  created_at: string
}

export type FicFatturaImportata = {
  id: string
  fic_id: string
  fic_type: string | null
  numero: string | null
  data: string | null
  importo_netto: number
  importo_totale: number
  cliente_nome: string | null
  cliente_piva: string | null
  stato_pagamento: StatoRicavo
  scadenza: string | null
  stato_assegnazione: 'da_assegnare' | 'assegnata' | 'ignorata'
  cantiere_id: string | null
  ricavo_id: string | null
  importato_at: string
  assegnato_at: string | null
}

export type FicFatturaPassiva = {
  id: string
  fic_id: string
  numero: string | null
  data: string | null
  importo_netto: number
  importo_totale: number
  fornitore_nome: string | null
  fornitore_piva: string | null
  fornitore_cf: string | null
  stato_pagamento: StatoRicavo
  scadenza: string | null
  stato_assegnazione: 'da_assegnare' | 'assegnata' | 'ignorata'
  destinazione: 'materiale' | 'indiretto' | null
  fornitore_id: string | null
  cantiere_id: string | null
  materiale_id: string | null
  costo_indiretto_id: string | null
  importato_at: string
  assegnato_at: string | null
}

export type RicavoInput = {
  cantiere_id: string
  tipo: TipoRicavo
  numero_documento: string | null
  data: string
  importo: number
  stato: StatoRicavo
  scadenza: string | null
  note: string | null
}

export type CategoriaIndiretto = {
  id: string
  nome: string
  descrizione: string | null
}

export type CostoIndiretto = {
  id: string
  categoria_id: string | null
  fornitore_id: string | null
  descrizione: string
  data: string
  importo: number
  note: string | null
  ammortamento_id: string | null
  rata_n: number | null
  rate_totali: number | null
  fic_id: string | null
  origine: OrigineRicavo
  created_at: string
}

export type CostoIndirettoInput = {
  categoria_id: string | null
  fornitore_id: string | null
  descrizione: string
  data: string
  importo: number
  note: string | null
}

// Riga di anteprima ripartizione (dalla RPC anteprima_ripartizione)
export type AnteprimaRipartizione = {
  cantiere_id: string
  codice: string
  nome: string
  basis: number
}

export type RipartizionePeriodo = {
  id: string
  driver: DriverRipartizione
  applicata_at: string | null
}

export type Offerta = {
  id: string
  progressivo: number
  anno: number
  revisione: number
  numero: string
  titolo: string
  data: string
  stato: StatoOfferta
  cliente_id: string | null
  cliente_nome: string | null
  localita: string | null
  cantiere_id: string | null
  tipo: string | null
  categoria: string | null
  superficie_mq: number | null
  piani: number | null
  struttura: string | null
  finiture: string | null
  garanzia: string | null
  durata_mesi: number | null
  importo: number
  oneri_sicurezza: number
  tempistiche: string | null
  esclusioni: string | null
  note: string | null
  commessa_creata: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type OffertaMateriale = {
  id?: string
  offerta_id?: string
  tipo: string | null
  descrizione: string | null
  importo: number
  ricarico_pct: number
  ord: number
}

export type OffertaPagamento = {
  id?: string
  offerta_id?: string
  percentuale: number
  descrizione: string
  ord: number
}

export type OffertaRevisione = {
  id: string
  offerta_id: string
  revisione: number
  data: string
  autore: string | null
  nota: string | null
  created_at: string
}
