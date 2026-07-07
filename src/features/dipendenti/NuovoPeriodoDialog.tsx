import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import type { TariffaOraria } from '@/lib/types'
import { useAggiungiTariffa } from './api'

type Props = {
  open: boolean
  onClose: () => void
  dipendenteId: string
  dipendenteNome: string
  tariffaCorrente?: TariffaOraria
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function addDayISO(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return `${String(dt.getDate()).padStart(2, '0')}/${String(
    dt.getMonth() + 1
  ).padStart(2, '0')}/${dt.getFullYear()}`
}

export function NuovoPeriodoDialog({
  open,
  onClose,
  dipendenteId,
  dipendenteNome,
  tariffaCorrente,
}: Props) {
  const toast = useToast()
  const aggiungiM = useAggiungiTariffa()
  const [validoDa, setValidoDa] = useState(todayISO())
  const [costoOrd, setCostoOrd] = useState('')
  const [costoStr, setCostoStr] = useState('')
  const [errore, setErrore] = useState<string | null>(null)

  if (!open) return null

  const submit = async () => {
    setErrore(null)
    const ord = Number(costoOrd.replace(',', '.'))
    const str = Number(costoStr.replace(',', '.'))
    if (!validoDa) return setErrore('Indica la data di decorrenza')
    if (!Number.isFinite(ord) || ord < 0)
      return setErrore('Tariffa ordinaria non valida')
    if (!Number.isFinite(str) || str < 0)
      return setErrore('Tariffa straordinaria non valida')
    if (tariffaCorrente && validoDa <= tariffaCorrente.valido_da)
      return setErrore(
        'La decorrenza deve essere successiva all’inizio del periodo corrente'
      )

    try {
      await aggiungiM.mutateAsync({
        dipendente_id: dipendenteId,
        costo_ord: ord,
        costo_str: str,
        valido_da: validoDa,
      })
      toast.success('Nuovo periodo tariffario creato')
      setCostoOrd('')
      setCostoStr('')
      onClose()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore sconosciuto')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-card-lg w-full max-w-xl">
        <div className="px-6 py-5 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Nuovo periodo tariffario
            </h2>
            <p className="text-sm text-ink-soft mt-0.5">{dipendenteNome}</p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-12 gap-4">
            <Field
              label="Data di decorrenza"
              required
              span={12}
              hint="Il periodo precedente verrà chiuso automaticamente il giorno prima."
            >
              <Input
                size="lg"
                type="date"
                value={validoDa}
                onChange={(e) => setValidoDa(e.target.value)}
              />
            </Field>
            <Field label="Tariffa ordinaria" required span={6}>
              <Input
                size="lg"
                inputMode="decimal"
                value={costoOrd}
                onChange={(e) => setCostoOrd(e.target.value)}
                rightAddon="€/h"
                placeholder="20,00"
              />
            </Field>
            <Field label="Tariffa straordinaria" required span={6}>
              <Input
                size="lg"
                inputMode="decimal"
                value={costoStr}
                onChange={(e) => setCostoStr(e.target.value)}
                rightAddon="€/h"
                placeholder="26,50"
              />
            </Field>
          </div>

          {tariffaCorrente && (
            <div className="mt-5 p-4 bg-navy-50/60 border border-navy-100 rounded-lg flex items-start gap-3">
              <Icon
                name="info"
                size={18}
                className="text-navy-600 mt-0.5 shrink-0"
              />
              <div className="text-sm text-navy-700">
                <strong>Periodo corrente</strong> (dal{' '}
                <span className="num">
                  {addDayISO(tariffaCorrente.valido_da, 0)}
                </span>
                ) verrà chiuso al{' '}
                <span className="num">{addDayISO(validoDa, -1)}</span>.<br />I
                rapportini già inseriti con la vecchia tariffa{' '}
                <strong>non vengono ricalcolati</strong>.
              </div>
            </div>
          )}

          {errore && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-bad-soft/60 border border-bad/20 rounded-lg text-sm text-bad-deep">
              <Icon name="circle-alert" size={16} className="mt-0.5 shrink-0" />
              <span>{errore}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-3 bg-canvas">
          <Button
            variant="secondary"
            size="lg"
            onClick={onClose}
            disabled={aggiungiM.isPending}
          >
            Annulla
          </Button>
          <Button
            size="lg"
            icon={aggiungiM.isPending ? 'loader-circle' : 'check'}
            onClick={submit}
            disabled={aggiungiM.isPending}
          >
            Crea periodo
          </Button>
        </div>
      </div>
    </div>
  )
}
