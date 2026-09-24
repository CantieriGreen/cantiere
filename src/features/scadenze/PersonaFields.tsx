import { Field, Input, Select } from '@/components/ui/Field'
import { Toggle } from '@/components/ui/Toggle'
import { useDipendenti } from '@/features/dipendenti/api'
import { stessoNominativo, type Persona } from './persona'

type Props = {
  value: Persona
  onChange: (p: Persona) => void
  /** Mostra anche il campo telefono (visite mediche). */
  conTelefono?: boolean
}

/**
 * Nome e cognome del dipendente. Si puo' scegliere dall'anagrafica
 * (precompila i campi) oppure scrivere a mano un nominativo non censito.
 */
export function PersonaFields({ value, onChange, conTelefono }: Props) {
  const { data: dipendenti = [] } = useDipendenti()

  const scegli = (id: string) => {
    const d = dipendenti.find((x) => x.id === id)
    if (!d) return onChange({ ...value, dipendente_id: '' })
    onChange({
      aggiungiAnagrafica: false,
      dipendente_id: d.id,
      nome: d.nome,
      cognome: d.cognome,
      telefono: conTelefono ? d.telefono ?? value.telefono ?? '' : value.telefono,
    })
  }

  const liberi = !value.dipendente_id
  const giaPresente =
    liberi && value.nome.trim() && value.cognome.trim()
      ? dipendenti.find((d) => stessoNominativo(d, value))
      : undefined

  return (
    <>
      <Field
        label="Dipendente in anagrafica"
        span={12}
        hint="facoltativo: sceglilo per compilare i campi, oppure scrivi il nominativo qui sotto"
      >
        <Select
          leftIcon="user"
          value={value.dipendente_id}
          onChange={(e) => scegli(e.target.value)}
        >
          <option value="">— Nominativo libero —</option>
          {dipendenti.map((d) => (
            <option key={d.id} value={d.id}>
              {d.cognome} {d.nome}
              {d.mansione ? ` — ${d.mansione}` : ''}
              {!d.attivo ? ' (non attivo)' : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nome" required span={6}>
        <Input
          value={value.nome}
          onChange={(e) => onChange({ ...value, nome: e.target.value })}
        />
      </Field>
      <Field label="Cognome" required span={6}>
        <Input
          value={value.cognome}
          onChange={(e) => onChange({ ...value, cognome: e.target.value })}
        />
      </Field>
      {conTelefono && (
        <Field label="Telefono" span={12} hint="facoltativo">
          <Input
            leftIcon="phone"
            placeholder="+39 ..."
            value={value.telefono ?? ''}
            onChange={(e) => onChange({ ...value, telefono: e.target.value })}
          />
        </Field>
      )}
      {liberi && (
        <Field
          label="Anagrafica dipendenti"
          span={12}
          hint={
            giaPresente
              ? undefined
              : 'Se attivo, il dipendente viene creato anche in Anagrafiche → Dipendenti: poi completa la tariffa oraria da lì.'
          }
        >
          {giaPresente ? (
            <p className="text-sm text-ink-soft">
              {giaPresente.cognome} {giaPresente.nome} è già in anagrafica.{' '}
              <button
                type="button"
                className="font-medium text-navy-600 underline"
                onClick={() => scegli(giaPresente.id)}
              >
                Collega la scadenza a questo dipendente
              </button>
            </p>
          ) : (
            <Toggle
              checked={!!value.aggiungiAnagrafica}
              onChange={(v) => onChange({ ...value, aggiungiAnagrafica: v })}
              label="Aggiungi anche all'anagrafica dipendenti"
            />
          )}
        </Field>
      )}
    </>
  )
}
