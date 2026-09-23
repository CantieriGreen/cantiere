import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import type { VisitaMedica, VisitaMedicaInput } from '@/lib/types'
import { useCreateVisita, useUpdateVisita } from './api'
import { PersonaFields } from './PersonaFields'
import { personaVuota, validaPersona, type Persona } from './persona'

type Props = {
  open: boolean
  onClose: () => void
  visita?: VisitaMedica | null
}

export function VisitaForm({ open, onClose, visita }: Props) {
  const isEdit = !!visita
  const toast = useToast()
  const createM = useCreateVisita()
  const updateM = useUpdateVisita()

  const [persona, setPersona] = useState<Persona>(personaVuota())
  const [scadenza, setScadenza] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (visita) {
      setPersona({
        dipendente_id: visita.dipendente_id ?? '',
        nome: visita.nome,
        cognome: visita.cognome,
        telefono: visita.telefono ?? '',
      })
      setScadenza(visita.scadenza_visita)
      setNote(visita.note ?? '')
    } else {
      setPersona(personaVuota())
      setScadenza('')
      setNote('')
    }
  }, [open, visita])

  const saving = createM.isPending || updateM.isPending

  const submit = async () => {
    const err = validaPersona(persona)
    if (err) return toast.error(err)
    if (!scadenza) return toast.error('Indica la data di scadenza della visita')

    const input: VisitaMedicaInput = {
      dipendente_id: persona.dipendente_id || null,
      nome: persona.nome.trim(),
      cognome: persona.cognome.trim(),
      telefono: persona.telefono?.trim() || null,
      scadenza_visita: scadenza,
      note: note.trim() || null,
    }
    try {
      if (isEdit && visita) {
        await updateM.mutateAsync({ id: visita.id, input })
        toast.success('Visita aggiornata')
      } else {
        await createM.mutateAsync(input)
        toast.success('Visita medica registrata')
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
      title={isEdit ? 'Modifica visita medica' : 'Nuova visita medica'}
      subtitle="Scadenza dell'idoneità alla mansione"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={saving} icon={saving ? 'loader-circle' : 'save'}>
            {isEdit ? 'Salva' : 'Registra visita'}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <PersonaFields value={persona} onChange={setPersona} conTelefono />
        <Field label="Scadenza visita medica" required span={6}>
          <Input
            type="date"
            leftIcon="calendar"
            value={scadenza}
            onChange={(e) => setScadenza(e.target.value)}
          />
        </Field>
        <Field label="Note" span={12}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Drawer>
  )
}
