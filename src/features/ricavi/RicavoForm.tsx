import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import { useCantieri } from '@/features/cantieri/api'
import type { Ricavo, RicavoInput, StatoRicavo, TipoRicavo } from '@/lib/types'
import { useCreateRicavo, useUpdateRicavo } from './api'
import { STATI_RICAVO_ORDER, STATO_RICAVO, TIPO_RICAVO_LABEL } from './constants'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

type Props = {
  open: boolean
  onClose: () => void
  ricavo?: Ricavo | null
  defaultCantiereId?: string
}

export function RicavoForm({ open, onClose, ricavo, defaultCantiereId }: Props) {
  const isEdit = !!ricavo
  const toast = useToast()
  const { data: cantieri = [] } = useCantieri()
  const createM = useCreateRicavo()
  const updateM = useUpdateRicavo()

  const [tipo, setTipo] = useState<TipoRicavo>('sal')
  const [cantiereId, setCantiereId] = useState(defaultCantiereId ?? '')
  const [numeroDoc, setNumeroDoc] = useState('')
  const [data, setData] = useState(todayISO())
  const [scadenza, setScadenza] = useState('')
  const [importo, setImporto] = useState('')
  const [stato, setStato] = useState<StatoRicavo>('in_attesa')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      if (ricavo) {
        setTipo(ricavo.tipo)
        setCantiereId(ricavo.cantiere_id)
        setNumeroDoc(ricavo.numero_documento ?? '')
        setData(ricavo.data)
        setScadenza(ricavo.scadenza ?? '')
        setImporto(String(ricavo.importo))
        setStato(ricavo.stato)
        setNote(ricavo.note ?? '')
      } else {
        setTipo('sal')
        setCantiereId(defaultCantiereId ?? '')
        setNumeroDoc('')
        setData(todayISO())
        setScadenza('')
        setImporto('')
        setStato('in_attesa')
        setNote('')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ricavo])

  const saving = createM.isPending || updateM.isPending

  const submit = async () => {
    if (!cantiereId) return toast.error('Seleziona un cantiere')
    const imp = Number(importo.replace(',', '.'))
    if (!Number.isFinite(imp) || imp < 0)
      return toast.error('Importo non valido')

    const input: RicavoInput = {
      cantiere_id: cantiereId,
      tipo,
      numero_documento: numeroDoc.trim() || null,
      data,
      importo: imp,
      stato,
      scadenza: scadenza || null,
      note: note.trim() || null,
    }
    try {
      if (isEdit && ricavo) {
        await updateM.mutateAsync({ id: ricavo.id, input })
        toast.success('Ricavo aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Ricavo registrato')
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
      title={isEdit ? 'Modifica ricavo' : 'Nuovo ricavo'}
      subtitle="SAL o fattura attiva associata al cantiere"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            icon={saving ? 'loader-circle' : 'save'}
          >
            {isEdit ? 'Salva' : 'Registra ricavo'}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <Field label="Tipo documento" span={12}>
          <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-1 w-fit">
            {(['sal', 'fattura'] as TipoRicavo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`h-9 px-4 rounded-md text-sm font-medium transition ${
                  tipo === t
                    ? 'bg-navy-600 text-white'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {TIPO_RICAVO_LABEL[t]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cantiere" required span={12}>
          <Select
            leftIcon="hard-hat"
            value={cantiereId}
            onChange={(e) => setCantiereId(e.target.value)}
          >
            <option value="">— Seleziona cantiere —</option>
            {cantieri.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codice} — {c.nome}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Numero documento" span={6} hint="es. F-2026-042">
          <Input
            leftIcon="hash"
            value={numeroDoc}
            onChange={(e) => setNumeroDoc(e.target.value)}
          />
        </Field>
        <Field label="Importo" required span={6}>
          <Input
            inputMode="decimal"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            rightAddon="€"
            placeholder="0,00"
          />
        </Field>

        <Field label="Data" required span={6}>
          <Input
            type="date"
            leftIcon="calendar"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </Field>
        <Field label="Scadenza" span={6}>
          <Input
            type="date"
            leftIcon="calendar-clock"
            value={scadenza}
            onChange={(e) => setScadenza(e.target.value)}
          />
        </Field>

        <Field label="Stato incasso" span={12}>
          <div className="flex items-center gap-1.5">
            {STATI_RICAVO_ORDER.map((s) => {
              const info = STATO_RICAVO[s]
              const active = stato === s
              const cls = active
                ? s === 'pagato'
                  ? 'bg-good text-white border-good'
                  : s === 'scaduto'
                  ? 'bg-bad text-white border-bad'
                  : 'bg-warn text-white border-warn'
                : 'bg-white text-ink-soft border-line hover:text-ink'
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStato(s)}
                  className={`h-9 px-3 rounded-lg text-sm font-medium border transition ${cls}`}
                >
                  {info.label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Note" span={12}>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Drawer>
  )
}
