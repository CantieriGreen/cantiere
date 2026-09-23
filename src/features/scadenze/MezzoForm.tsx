import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/toast'
import type { Mezzo, MezzoInput } from '@/lib/types'
import { useCreateMezzo, useUpdateMezzo } from './api'

type Props = {
  open: boolean
  onClose: () => void
  mezzo?: Mezzo | null
}

const vuoto = () => ({
  tipo_mezzo: '',
  targa: '',
  descrizione: '',
  scadenza_assicurazione: '',
  scadenza_bollo: '',
  scadenza_revisione: '',
  attivo: true,
  note: '',
})

export function MezzoForm({ open, onClose, mezzo }: Props) {
  const isEdit = !!mezzo
  const toast = useToast()
  const createM = useCreateMezzo()
  const updateM = useUpdateMezzo()
  const [f, setF] = useState(vuoto())

  useEffect(() => {
    if (!open) return
    setF(
      mezzo
        ? {
            tipo_mezzo: mezzo.tipo_mezzo,
            targa: mezzo.targa ?? '',
            descrizione: mezzo.descrizione ?? '',
            scadenza_assicurazione: mezzo.scadenza_assicurazione ?? '',
            scadenza_bollo: mezzo.scadenza_bollo ?? '',
            scadenza_revisione: mezzo.scadenza_revisione ?? '',
            attivo: mezzo.attivo,
            note: mezzo.note ?? '',
          }
        : vuoto()
    )
  }, [open, mezzo])

  const set = <K extends keyof ReturnType<typeof vuoto>>(
    k: K,
    v: ReturnType<typeof vuoto>[K]
  ) => setF((s) => ({ ...s, [k]: v }))

  const saving = createM.isPending || updateM.isPending

  const submit = async () => {
    if (!f.tipo_mezzo.trim()) return toast.error('Indica il tipo di mezzo')
    const blank = (s: string) => (s.trim() ? s.trim() : null)
    const input: MezzoInput = {
      tipo_mezzo: f.tipo_mezzo.trim(),
      targa: blank(f.targa)?.toUpperCase() ?? null,
      descrizione: blank(f.descrizione),
      scadenza_assicurazione: f.scadenza_assicurazione || null,
      scadenza_bollo: f.scadenza_bollo || null,
      scadenza_revisione: f.scadenza_revisione || null,
      attivo: f.attivo,
      note: blank(f.note),
    }
    try {
      if (isEdit && mezzo) {
        await updateM.mutateAsync({ id: mezzo.id, input })
        toast.success('Mezzo aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Mezzo registrato')
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
      title={isEdit ? 'Modifica mezzo' : 'Nuovo mezzo'}
      subtitle="Scadenze di assicurazione, bollo e revisione"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={saving} icon={saving ? 'loader-circle' : 'save'}>
            {isEdit ? 'Salva' : 'Registra mezzo'}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <Field label="Tipo mezzo" required span={7}>
          <Input
            leftIcon="car"
            placeholder="es. Furgone, Autocarro, Escavatore"
            value={f.tipo_mezzo}
            onChange={(e) => set('tipo_mezzo', e.target.value)}
          />
        </Field>
        <Field label="Targa" span={5} hint="facoltativa, utile per la ricerca">
          <Input
            leftIcon="hash"
            placeholder="AB123CD"
            value={f.targa}
            onChange={(e) => set('targa', e.target.value)}
          />
        </Field>
        <Field label="Descrizione" span={12} hint="facoltativa: marca, modello, uso">
          <Input
            placeholder="es. Fiat Ducato — squadra impianti"
            value={f.descrizione}
            onChange={(e) => set('descrizione', e.target.value)}
          />
        </Field>

        <Field label="Scadenza assicurazione" span={4}>
          <Input
            type="date"
            value={f.scadenza_assicurazione}
            onChange={(e) => set('scadenza_assicurazione', e.target.value)}
          />
        </Field>
        <Field label="Scadenza bollo" span={4}>
          <Input
            type="date"
            value={f.scadenza_bollo}
            onChange={(e) => set('scadenza_bollo', e.target.value)}
          />
        </Field>
        <Field label="Scadenza revisione" span={4}>
          <Input
            type="date"
            value={f.scadenza_revisione}
            onChange={(e) => set('scadenza_revisione', e.target.value)}
          />
        </Field>

        <Field
          label="In uso"
          span={12}
          hint="Disattiva per un mezzo venduto o dismesso: non genera più avvisi."
        >
          <Toggle
            checked={f.attivo}
            onChange={(v) => set('attivo', v)}
            label={f.attivo ? 'Attivo' : 'Dismesso'}
          />
        </Field>

        <Field label="Note" span={12}>
          <Textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} />
        </Field>
      </div>
    </Drawer>
  )
}
