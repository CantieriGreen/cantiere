import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import type { Fornitore, FornitoreInput } from '@/lib/types'
import { useCreateFornitore, useUpdateFornitore } from './api'
import { StarRating } from './StarRating'

const schema = z.object({
  ragione_sociale: z.string().trim().min(1, 'La ragione sociale è obbligatoria'),
  categoria: z.string().trim().optional(),
  referente: z.string().trim().optional(),
  partita_iva: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email('Email non valida')
    .optional()
    .or(z.literal('')),
  pec: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  indirizzo: z.string().trim().optional(),
  citta: z.string().trim().optional(),
  provincia: z.string().trim().max(2, 'Max 2 lettere').optional(),
  cap: z.string().trim().optional(),
  iban: z.string().trim().optional(),
  condizioni_pagamento: z.string().trim().optional(),
  valutazione: z.number().min(0).max(5),
  fornitore_dal: z.string().trim().optional(),
  note: z.string().trim().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onClose: () => void
  fornitore?: Fornitore | null
}

function toFormValues(f?: Fornitore | null): FormValues {
  return {
    ragione_sociale: f?.ragione_sociale ?? '',
    categoria: f?.categoria ?? '',
    referente: f?.referente ?? '',
    partita_iva: f?.partita_iva ?? '',
    email: f?.email ?? '',
    pec: f?.pec ?? '',
    telefono: f?.telefono ?? '',
    indirizzo: f?.indirizzo ?? '',
    citta: f?.citta ?? '',
    provincia: f?.provincia ?? '',
    cap: f?.cap ?? '',
    iban: f?.iban ?? '',
    condizioni_pagamento: f?.condizioni_pagamento ?? '',
    valutazione: f?.valutazione ?? 0,
    fornitore_dal: f?.fornitore_dal ?? '',
    note: f?.note ?? '',
  }
}

function toInput(v: FormValues): FornitoreInput {
  const blank = (s?: string) => (s && s.length ? s : null)
  return {
    ragione_sociale: v.ragione_sociale.trim(),
    categoria: blank(v.categoria),
    referente: blank(v.referente),
    partita_iva: blank(v.partita_iva),
    email: blank(v.email),
    pec: blank(v.pec),
    telefono: blank(v.telefono),
    indirizzo: blank(v.indirizzo),
    citta: blank(v.citta),
    provincia: blank(v.provincia),
    cap: blank(v.cap),
    iban: blank(v.iban),
    condizioni_pagamento: blank(v.condizioni_pagamento),
    valutazione: v.valutazione > 0 ? v.valutazione : null,
    fornitore_dal: blank(v.fornitore_dal),
    attivo: true,
    note: blank(v.note),
  }
}

export function FornitoreForm({ open, onClose, fornitore }: Props) {
  const isEdit = !!fornitore
  const toast = useToast()
  const createM = useCreateFornitore()
  const updateM = useUpdateFornitore()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: toFormValues(fornitore),
  })

  const valutazione = watch('valutazione')

  const onSubmit = handleSubmit(async (values) => {
    const input = toInput(values)
    try {
      if (isEdit && fornitore) {
        await updateM.mutateAsync({ id: fornitore.id, input })
        toast.success('Fornitore aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Fornitore creato')
      }
      reset()
      onClose()
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  })

  const saving = createM.isPending || updateM.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifica fornitore' : 'Nuovo fornitore'}
      subtitle={
        isEdit ? fornitore?.ragione_sociale : 'Inserisci i dati anagrafici'
      }
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
            {isEdit ? 'Salva modifiche' : 'Crea fornitore'}
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="grid grid-cols-12 gap-4">
        <Field label="Ragione sociale" required span={12} error={errors.ragione_sociale?.message}>
          <Input leftIcon="truck" placeholder="es. Edilcentro Veneto srl" {...register('ragione_sociale')} />
        </Field>

        <Field label="Categoria" span={6}>
          <Input leftIcon="tag" placeholder="es. Materiali edili" {...register('categoria')} />
        </Field>
        <Field label="Referente" span={6}>
          <Input leftIcon="user" {...register('referente')} />
        </Field>

        <Field label="Partita IVA" span={6}>
          <Input leftIcon="hash" {...register('partita_iva')} />
        </Field>
        <Field label="Telefono" span={6}>
          <Input leftIcon="phone" {...register('telefono')} />
        </Field>

        <Field label="Email" span={6} error={errors.email?.message}>
          <Input leftIcon="mail" type="email" {...register('email')} />
        </Field>
        <Field label="PEC" span={6}>
          <Input leftIcon="mail" {...register('pec')} />
        </Field>

        <Field label="Indirizzo" span={12}>
          <Input leftIcon="map-pin" {...register('indirizzo')} />
        </Field>
        <Field label="Città" span={5}>
          <Input {...register('citta')} />
        </Field>
        <Field label="Prov." span={3} error={errors.provincia?.message}>
          <Input placeholder="VR" maxLength={2} {...register('provincia')} />
        </Field>
        <Field label="CAP" span={4}>
          <Input {...register('cap')} />
        </Field>

        <Field label="IBAN" span={12}>
          <Input leftIcon="banknote" placeholder="IT.." {...register('iban')} />
        </Field>

        <Field label="Condizioni pagamento" span={6}>
          <Input leftIcon="calendar-clock" placeholder="es. 60 gg DF" {...register('condizioni_pagamento')} />
        </Field>
        <Field label="Fornitore dal" span={6}>
          <Input type="date" {...register('fornitore_dal')} />
        </Field>

        <Field label="Valutazione" span={12}>
          <input type="hidden" {...register('valutazione', { valueAsNumber: true })} />
          <div className="flex items-center gap-3">
            <StarRating
              value={valutazione}
              onChange={(v) => setValue('valutazione', v, { shouldDirty: true })}
              size={22}
            />
            <span className="text-sm text-ink-soft">
              {valutazione > 0 ? `${valutazione}/5` : 'non valutato'}
            </span>
          </div>
        </Field>

        <Field label="Note" span={12}>
          <Textarea rows={2} placeholder="Note interne…" {...register('note')} />
        </Field>
      </form>
    </Drawer>
  )
}
