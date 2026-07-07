import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import type { Dipendente, DipendenteInput, TipoDipendente } from '@/lib/types'
import { useCreateDipendente, useUpdateDipendente } from './api'

const schema = z.object({
  nome: z.string().trim().min(1, 'Il nome è obbligatorio'),
  cognome: z.string().trim().min(1, 'Il cognome è obbligatorio'),
  tipo: z.enum(['operaio', 'ufficio']),
  mansione: z.string().trim().optional(),
  codice_fiscale: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email('Email non valida')
    .optional()
    .or(z.literal('')),
  telefono: z.string().trim().optional(),
  data_assunzione: z.string().trim().optional(),
  attivo: z.boolean(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onClose: () => void
  dipendente?: Dipendente | null
}

function toFormValues(d?: Dipendente | null): FormValues {
  return {
    nome: d?.nome ?? '',
    cognome: d?.cognome ?? '',
    tipo: d?.tipo ?? 'operaio',
    mansione: d?.mansione ?? '',
    codice_fiscale: d?.codice_fiscale ?? '',
    email: d?.email ?? '',
    telefono: d?.telefono ?? '',
    data_assunzione: d?.data_assunzione ?? '',
    attivo: d?.attivo ?? true,
  }
}

function toInput(v: FormValues): DipendenteInput {
  const blank = (s?: string) => (s && s.length ? s : null)
  return {
    nome: v.nome.trim(),
    cognome: v.cognome.trim(),
    tipo: v.tipo,
    mansione: blank(v.mansione),
    codice_fiscale: blank(v.codice_fiscale),
    email: blank(v.email),
    telefono: blank(v.telefono),
    data_assunzione: blank(v.data_assunzione),
    attivo: v.attivo,
  }
}

const TIPI: { id: TipoDipendente; label: string }[] = [
  { id: 'operaio', label: 'Operaio' },
  { id: 'ufficio', label: 'Ufficio' },
]

export function DipendenteForm({ open, onClose, dipendente }: Props) {
  const isEdit = !!dipendente
  const toast = useToast()
  const createM = useCreateDipendente()
  const updateM = useUpdateDipendente()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: toFormValues(dipendente),
  })

  const tipo = watch('tipo')
  const attivo = watch('attivo')

  const onSubmit = handleSubmit(async (values) => {
    const input = toInput(values)
    try {
      if (isEdit && dipendente) {
        await updateM.mutateAsync({ id: dipendente.id, input })
        toast.success('Dipendente aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Dipendente creato')
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
      title={isEdit ? 'Modifica dipendente' : 'Nuovo dipendente'}
      subtitle={
        isEdit
          ? `${dipendente?.nome} ${dipendente?.cognome}`
          : 'Dati anagrafici. Le tariffe orarie si gestiscono nella scheda.'
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
            {isEdit ? 'Salva modifiche' : 'Crea dipendente'}
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="grid grid-cols-12 gap-4">
        <Field label="Nome" required span={6} error={errors.nome?.message}>
          <Input leftIcon="user" {...register('nome')} />
        </Field>
        <Field label="Cognome" required span={6} error={errors.cognome?.message}>
          <Input {...register('cognome')} />
        </Field>

        <Field label="Tipo" span={6}>
          <input type="hidden" {...register('tipo')} />
          <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-1 w-fit">
            {TIPI.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setValue('tipo', t.id, { shouldDirty: true })}
                className={`h-9 px-4 rounded-md text-sm font-medium transition ${
                  tipo === t.id
                    ? 'bg-navy-600 text-white'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Mansione" span={6}>
          <Input leftIcon="briefcase" placeholder="es. Capo cantiere" {...register('mansione')} />
        </Field>

        <Field label="Codice fiscale" span={6}>
          <Input leftIcon="hash" {...register('codice_fiscale')} />
        </Field>
        <Field label="In azienda dal" span={6}>
          <Input type="date" {...register('data_assunzione')} />
        </Field>

        <Field label="Email" span={6} error={errors.email?.message}>
          <Input leftIcon="mail" type="email" {...register('email')} />
        </Field>
        <Field label="Telefono" span={6}>
          <Input leftIcon="phone" {...register('telefono')} />
        </Field>

        <Field label="Stato" span={12}>
          <input type="hidden" {...register('attivo')} />
          <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-1 w-fit">
            <button
              type="button"
              onClick={() => setValue('attivo', true, { shouldDirty: true })}
              className={`h-9 px-4 rounded-md text-sm font-medium transition ${
                attivo ? 'bg-good text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Attivo
            </button>
            <button
              type="button"
              onClick={() => setValue('attivo', false, { shouldDirty: true })}
              className={`h-9 px-4 rounded-md text-sm font-medium transition ${
                !attivo ? 'bg-ink-soft text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Sospeso
            </button>
          </div>
        </Field>
      </form>
    </Drawer>
  )
}
