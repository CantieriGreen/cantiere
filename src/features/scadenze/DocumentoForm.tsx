import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/toast'
import type { DocumentoDipendente, DocumentoDipendenteInput } from '@/lib/types'
import { useCreateDocumento, useUpdateDocumento } from './api'
import { PersonaFields } from './PersonaFields'
import { personaVuota, validaPersona, type Persona } from './persona'

type Props = {
  open: boolean
  onClose: () => void
  documento?: DocumentoDipendente | null
}

export function DocumentoForm({ open, onClose, documento }: Props) {
  const isEdit = !!documento
  const toast = useToast()
  const createM = useCreateDocumento()
  const updateM = useUpdateDocumento()

  const [persona, setPersona] = useState<Persona>(personaVuota())
  const [patente, setPatente] = useState('')
  const [haPermesso, setHaPermesso] = useState(false)
  const [permesso, setPermesso] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (documento) {
      setPersona({
        dipendente_id: documento.dipendente_id ?? '',
        nome: documento.nome,
        cognome: documento.cognome,
      })
      setPatente(documento.scadenza_patente ?? '')
      setHaPermesso(documento.ha_permesso_soggiorno)
      setPermesso(documento.scadenza_permesso ?? '')
      setNote(documento.note ?? '')
    } else {
      setPersona(personaVuota())
      setPatente('')
      setHaPermesso(false)
      setPermesso('')
      setNote('')
    }
  }, [open, documento])

  const saving = createM.isPending || updateM.isPending

  const submit = async () => {
    const err = validaPersona(persona)
    if (err) return toast.error(err)
    if (haPermesso && !permesso)
      return toast.error('Indica la scadenza del permesso di soggiorno')
    if (!patente && !haPermesso)
      return toast.error('Indica almeno la scadenza della patente o del permesso di soggiorno')

    const input: DocumentoDipendenteInput = {
      dipendente_id: persona.dipendente_id || null,
      nome: persona.nome.trim(),
      cognome: persona.cognome.trim(),
      scadenza_patente: patente || null,
      ha_permesso_soggiorno: haPermesso,
      scadenza_permesso: haPermesso ? permesso || null : null,
      note: note.trim() || null,
    }
    try {
      if (isEdit && documento) {
        await updateM.mutateAsync({ id: documento.id, input })
        toast.success('Documenti aggiornati')
      } else {
        await createM.mutateAsync(input)
        toast.success('Documenti registrati')
      }
      onClose()
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifica documenti' : 'Nuova scadenza documenti'}
      subtitle="Patente di guida e permesso di soggiorno"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={saving} icon={saving ? 'loader-circle' : 'save'}>
            {isEdit ? 'Salva' : 'Registra'}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <PersonaFields value={persona} onChange={setPersona} />

        <Field label="Scadenza patente" span={6} hint="lascia vuoto se non ha patente">
          <Input
            type="date"
            leftIcon="calendar"
            value={patente}
            onChange={(e) => setPatente(e.target.value)}
          />
        </Field>

        <Field
          label="Permesso di soggiorno"
          span={12}
          hint="Attiva solo per i lavoratori che ne hanno bisogno."
        >
          <Toggle
            checked={haPermesso}
            onChange={setHaPermesso}
            label={haPermesso ? 'Sì, ha il permesso di soggiorno' : 'Non necessario'}
          />
        </Field>

        {haPermesso && (
          <Field label="Scadenza permesso di soggiorno" required span={6}>
            <Input
              type="date"
              leftIcon="calendar"
              value={permesso}
              onChange={(e) => setPermesso(e.target.value)}
            />
          </Field>
        )}

        <Field label="Note" span={12}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Drawer>
  )
}
