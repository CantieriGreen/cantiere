/** Nominativo del dipendente sulle righe del calendario scadenze. */
export type Persona = {
  dipendente_id: string
  nome: string
  cognome: string
  telefono?: string
  /** Nominativo libero da registrare anche in anagrafica dipendenti. */
  aggiungiAnagrafica?: boolean
}

export const personaVuota = (): Persona => ({
  dipendente_id: '',
  nome: '',
  cognome: '',
  telefono: '',
  aggiungiAnagrafica: false,
})

export function validaPersona(p: Persona): string | null {
  if (!p.nome.trim()) return 'Inserisci il nome'
  if (!p.cognome.trim()) return 'Inserisci il cognome'
  return null
}

/** Stesso nominativo, senza badare a maiuscole e spazi. */
export function stessoNominativo(
  a: { nome: string; cognome: string },
  b: { nome: string; cognome: string },
) {
  const n = (x: string) => x.trim().toLowerCase().replace(/\s+/g, ' ')
  return n(a.nome) === n(b.nome) && n(a.cognome) === n(b.cognome)
}
