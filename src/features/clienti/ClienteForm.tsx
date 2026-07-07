import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import type { Cliente, ClienteInput } from '@/lib/types'
import { useCreateCliente, useUpdateCliente } from './api'
import { TIPI_CLIENTE_ORDER, TIPO_CLIENTE } from './constants'

const schema = z.object({
  ragione_sociale: z.string().trim().min(1, 'Inserisci la ragione sociale o il nominativo'),
  tipo: z.enum(['lead', 'prospect', 'cliente']),
  referente: z.string().trim().optional(),
  partita_iva: z.string().trim().optional(),
  codice_fiscale: z.string().trim().optional(),
  codice_sdi: z.string().trim().optional(),
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
  termini_pagamento: z.string().trim().optional(),
  cliente_dal: z.string().trim().optional(),
  note: z.string().trim().optional(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onClose: () => void
  cliente?: Cliente | null
}

function toFormValues(c?: Cliente | null): FormValues {
  return {
    ragione_sociale: c?.ragione_sociale ?? '',
    tipo: c?.tipo ?? 'lead',
    referente: c?.referente ?? '',
    partita_iva: c?.partita_iva ?? '',
    codice_fiscale: c?.codice_fiscale ?? '',
    codice_sdi: c?.codice_sdi ?? '',
    email: c?.email ?? '',
    pec: c?.pec ?? '',
    telefono: c?.telefono ?? '',
    indirizzo: c?.indirizzo ?? '',
    citta: c?.citta ?? '',
    provincia: c?.provincia ?? '',
    cap: c?.cap ?? '',
    termini_pagamento: c?.termini_pagamento ?? '',
    cliente_dal: c?.cliente_dal ?? '',
    note: c?.note ?? '',
  }
}

function toInput(v: FormValues): ClienteInput {
  const blank = (s?: string) => (s && s.length ? s : null)
  return {
    ragione_sociale: v.ragione_sociale.trim(),
    tipo: v.tipo,
    referente: blank(v.referente),
    partita_iva: blank(v.partita_iva),
    codice_fiscale: blank(v.codice_fiscale),
    codice_sdi: blank(v.codice_sdi),
    email: blank(v.email),
    pec: blank(v.pec),
    telefono: blank(v.telefono),
    indirizzo: blank(v.indirizzo),
    citta: blank(v.citta),
    provincia: blank(v.provincia),
    cap: blank(v.cap),
    termini_pagamento: blank(v.termini_pagamento),
    cliente_dal: blank(v.cliente_dal),
    attivo: true,
    note: blank(v.note),
  }
}

export function ClienteForm({ open, onClose, cliente }: Props) {
  const isEdit = !!cliente
  const toast = useToast()
  const createM = useCreateCliente()
  const updateM = useUpdateCliente()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: toFormValues(cliente),
  })

  const tipo = watch('tipo')

  const onSubmit = handleSubmit(async (values) => {
    const input = toInput(values)
    try {
      if (isEdit && cliente) {
        await updateM.mutateAsync({ id: cliente.id, input })
        toast.success('Cliente aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Cliente creato')
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
      title={isEdit ? 'Modifica cliente' : 'Nuovo cliente'}
      subtitle={
        isEdit ? cliente?.ragione_sociale : 'Inserisci i dati anagrafici'
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
            {isEdit ? 'Salva modifiche' : 'Crea cliente'}
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="grid grid-cols-12 gap-4">
        <Field label="Ragione sociale / Nominativo" required span={12} error={errors.ragione_sociale?.message}>
          <Input
            leftIcon="building"
            placeholder="es. Bianchi srl oppure Mario Rossi"
            {...register('ragione_sociale')}
          />
        </Field>

        <Field label="Classificazione" span={12}>
          <input type="hidden" {...register('tipo')} />
          <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-1 w-fit">
            {TIPI_CLIENTE_ORDER.map((t) => {
              const info = TIPO_CLIENTE[t]
              const active = tipo === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setValue('tipo', t, { shouldDirty: true })
                  }
                  className={`h-9 px-4 rounded-md text-sm font-medium transition inline-flex items-center gap-1.5 ${
                    active ? info.activeCls : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {info.label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Referente" span={6}>
          <Input leftIcon="user" placeholder="Nome referente" {...register('referente')} />
        </Field>
        <Field label="Telefono" span={6}>
          <Input leftIcon="phone" placeholder="+39 ..." {...register('telefono')} />
        </Field>

        <Field label="Partita IVA" span={6}>
          <Input leftIcon="hash" placeholder="01234567890" {...register('partita_iva')} />
        </Field>
        <Field label="Codice fiscale" span={6}>
          <Input leftIcon="hash" {...register('codice_fiscale')} />
        </Field>

        <Field label="Email" span={6} error={errors.email?.message}>
          <Input leftIcon="mail" type="email" placeholder="info@azienda.it" {...register('email')} />
        </Field>
        <Field label="PEC" span={6}>
          <Input leftIcon="mail" placeholder="azienda@pec.it" {...register('pec')} />
        </Field>

        <Field label="Codice SDI" span={6}>
          <Input leftIcon="file-text" placeholder="M5UXCR1" {...register('codice_sdi')} />
        </Field>
        <Field label="Termini pagamento" span={6}>
          <Input leftIcon="calendar-clock" placeholder="es. 30 gg DF" {...register('termini_pagamento')} />
        </Field>

        <Field label="Indirizzo" span={12}>
          <Input leftIcon="map-pin" placeholder="Via ..." {...register('indirizzo')} />
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

        <Field label="Cliente dal" span={6}>
          <Input type="date" {...register('cliente_dal')} />
        </Field>

        <Field label="Note" span={12}>
          <Textarea rows={2} placeholder="Note interne…" {...register('note')} />
        </Field>
      </form>
    </Drawer>
  )
}
