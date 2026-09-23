/** Nominativo del dipendente sulle righe del calendario scadenze. */
export type Persona = {
  dipendente_id: string
  nome: string
  cognome: string
  telefono?: string
}

export const personaVuota = (): Persona => ({
  dipendente_id: '',
  nome: '',
  cognome: '',
  telefono: '',
})

export function validaPersona(p: Persona): string | null {
  if (!p.nome.trim()) return 'Inserisci il nome'
  if (!p.cognome.trim()) return 'Inserisci il cognome'
  return null
}
