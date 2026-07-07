import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/toast'
import { useClienti } from '@/features/clienti/api'
import type { Cantiere, CantiereInput, StatoCantiere } from '@/lib/types'
import {
  useCreateCantiere,
  useProssimoCodiceCantiere,
  useUpdateCantiere,
} from './api'
import { STATI_CANTIERE_ORDER, STATO_CANTIERE } from './constants'

const schema = z.object({
  codice: z.string().trim().min(1, 'Il codice è obbligatorio'),
  nome: z.string().trim().min(1, 'Il nome è obbligatorio'),
  cliente_id: z.string().trim().optional(),
  stato: z.enum(['pianificato', 'in_corso', 'sospeso', 'in_ritardo', 'chiuso']),
  valore_contratto: z.number().min(0, 'Non può essere negativo'),
  indirizzo: z.string().trim().optional(),
  citta: z.string().trim().optional(),
  provincia: z.string().trim().max(2, 'Max 2 lettere').optional(),
  data_inizio: z.string().trim().optional(),
  data_fine_prevista: z.string().trim().optional(),
  manutenzione: z.boolean(),
  note: z.string().trim().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onClose: () => void
  cantiere?: Cantiere | null
  defaultManutenzione?: boolean
}

function toFormValues(c?: Cantiere | null, defaultManutenzione = false): FormValues {
  return {
    codice: c?.codice ?? '',
    nome: c?.nome ?? '',
    cliente_id: c?.cliente_id ?? '',
    stato: c?.stato ?? 'in_corso',
    valore_contratto: c?.valore_contratto ?? 0,
    indirizzo: c?.indirizzo ?? '',
    citta: c?.citta ?? '',
    provincia: c?.provincia ?? '',
    data_inizio: c?.data_inizio ?? '',
    data_fine_prevista: c?.data_fine_prevista ?? '',
    manutenzione: c?.manutenzione ?? defaultManutenzione,
    note: c?.note ?? '',
  }
}

function toInput(v: FormValues): CantiereInput {
  const blank = (s?: string) => (s && s.length ? s : null)
  return {
    codice: v.codice.trim(),
    nome: v.nome.trim(),
    cliente_id: v.cliente_id && v.cliente_id.length ? v.cliente_id : null,
    stato: v.stato as StatoCantiere,
    valore_contratto: v.valore_contratto || 0,
    indirizzo: blank(v.indirizzo),
    citta: blank(v.citta),
    provincia: blank(v.provincia),
    data_inizio: blank(v.data_inizio),
    data_fine_prevista: blank(v.data_fine_prevista),
    manutenzione: v.manutenzione,
    note: blank(v.note),
  }
}

export function CantiereForm({ open, onClose, cantiere, defaultManutenzione = false }: Props) {
  const isEdit = !!cantiere
  const toast = useToast()
  const { data: clienti = [] } = useClienti()
  const { data: prossimoCodice } = useProssimoCodiceCantiere()
  const createM = useCreateCantiere()
  const updateM = useUpdateCantiere()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: toFormValues(cantiere, defaultManutenzione),
  })

  // Precompila il codice generato quando si crea un nuovo cantiere
  useEffect(() => {
    if (open && !isEdit && prossimoCodice && !watch('codice')) {
      setValue('codice', prossimoCodice)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, prossimoCodice])

  const stato = watch('stato')
  const manutenzione = watch('manutenzione')

  const onSubmit = handleSubmit(async (values) => {
    const input = toInput(values)
    try {
      if (isEdit && cantiere) {
        await updateM.mutateAsync({ id: cantiere.id, input })
        toast.success('Cantiere aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Cantiere creato')
      }
      reset()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'sconosciuto'
      toast.error(
        msg.includes('duplicate') || msg.includes('unique')
          ? 'Codice cantiere già esistente'
          : 'Errore: ' + msg
      )
    }
  })

  const saving = createM.isPending || updateM.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifica cantiere' : 'Nuovo cantiere'}
      subtitle={isEdit ? cantiere?.nome : 'Crea una nuova commessa'}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saving}
            icon={saving ? 'loader-circle' : 'save'}
          >
            {isEdit ? 'Salva modifiche' : 'Crea cantiere'}
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="grid grid-cols-12 gap-4">
        <Field label="Codice commessa" required span={5} error={errors.codice?.message}>
          <Input leftIcon="hash" {...register('codice')} />
        </Field>
        <Field label="Nome cantiere" required span={7} error={errors.nome?.message}>
          <Input placeholder="es. Ristrutturazione Villa Bianchi" {...register('nome')} />
        </Field>

        <Field label="Cliente" span={8}>
          <Select leftIcon="building" {...register('cliente_id')}>
            <option value="">— Nessun cliente —</option>
            {clienti.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ragione_sociale}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valore contratto" span={4} error={errors.valore_contratto?.message}>
          <Input
            type="number"
            step="0.01"
            rightAddon="€"
            {...register('valore_contratto', { valueAsNumber: true })}
          />
        </Field>

        <Field label="Stato" span={12}>
          <input type="hidden" {...register('stato')} />
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATI_CANTIERE_ORDER.map((s) => {
              const info = STATO_CANTIERE[s]
              const active = stato === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setValue('stato', s, { shouldDirty: true })}
                  className={`h-9 px-3 rounded-lg text-sm font-medium border transition inline-flex items-center gap-1.5 ${
                    active
                      ? 'bg-navy-600 text-white border-navy-600'
                      : 'bg-white text-ink-soft border-line hover:text-ink'
                  }`}
                >
                  {info.label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Indirizzo" span={12}>
          <Input leftIcon="map-pin" {...register('indirizzo')} />
        </Field>
        <Field label="Città" span={8}>
          <Input {...register('citta')} />
        </Field>
        <Field label="Prov." span={4} error={errors.provincia?.message}>
          <Input placeholder="VR" maxLength={2} {...register('provincia')} />
        </Field>

        <Field label="Data inizio" span={6}>
          <Input type="date" {...register('data_inizio')} />
        </Field>
        <Field label="Fine prevista" span={6}>
          <Input type="date" {...register('data_fine_prevista')} />
        </Field>

        <Field label="Gestione manutenzione" span={12}
          hint="Attiva se questo cantiere è anche in gestione manutenzione.">
          <Toggle
            checked={manutenzione}
            onChange={(v) => setValue('manutenzione', v, { shouldDirty: true })}
            label={manutenzione ? 'Attiva' : 'Disattivata'}
          />
        </Field>

        <Field label="Note" span={12}>
          <Textarea rows={2} {...register('note')} />
        </Field>
      </form>
    </Drawer>
  )
}
