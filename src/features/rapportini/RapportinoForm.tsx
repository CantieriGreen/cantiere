import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Toggle } from '@/components/ui/Toggle'
import { Icon } from '@/components/ui/Icon'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { useToast } from '@/components/ui/toast'
import { eu } from '@/lib/utils'
import { useCantieri } from '@/features/cantieri/api'
import { useDipendenti } from '@/features/dipendenti/api'
import {
  useCreateRapportino,
  useRapportino,
  useTariffaAllaData,
  useUpdateRapportino,
} from './api'

// Diaria giornaliera di trasferta con pernottamento (dorme fuori)
const DIARIA_TRASFERTA = 46.48

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

export function RapportinoForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const { data: cantieri = [] } = useCantieri()
  const { data: dipendenti = [] } = useDipendenti()
  const { data: existing } = useRapportino(id)
  const createM = useCreateRapportino()
  const updateM = useUpdateRapportino()

  const [data, setData] = useState(todayISO())
  const [cantiereId, setCantiereId] = useState(
    searchParams.get('cantiere') ?? ''
  )
  const [dipendenteId, setDipendenteId] = useState('')
  const [oreOrd, setOreOrd] = useState(8)
  const [oreStr, setOreStr] = useState(0)
  const [pernottamento, setPernottamento] = useState(false)
  const [diariaVal, setDiariaVal] = useState(String(DIARIA_TRASFERTA).replace('.', ','))
  const [oreViaggio, setOreViaggio] = useState(0)
  const [costoViaggio, setCostoViaggio] = useState('')
  const [note, setNote] = useState('')

  // Precompila in modifica
  useEffect(() => {
    if (existing) {
      setData(existing.data)
      setCantiereId(existing.cantiere_id)
      setDipendenteId(existing.dipendente_id)
      setOreOrd(existing.ore_ord)
      setOreStr(existing.ore_str)
      setPernottamento(existing.pernottamento)
      setDiariaVal(
        existing.diaria
          ? String(existing.diaria).replace('.', ',')
          : String(DIARIA_TRASFERTA).replace('.', ',')
      )
      setOreViaggio(existing.ore_viaggio)
      setCostoViaggio(existing.costo_viaggio ? String(existing.costo_viaggio) : '')
      setNote(existing.note ?? '')
    }
  }, [existing])

  const { data: tariffa } = useTariffaAllaData(dipendenteId, data)

  const cantiereSel = cantieri.find((c) => c.id === cantiereId)
  const diaria = pernottamento ? Number(diariaVal.replace(',', '.')) || 0 : 0
  const costoViag = Number(costoViaggio.replace(',', '.')) || 0

  const costoOre = tariffa
    ? oreOrd * tariffa.costo_ord + oreStr * tariffa.costo_str
    : null
  const costoTot = costoOre !== null ? costoOre + diaria + costoViag : null

  const saving = createM.isPending || updateM.isPending

  const submit = async () => {
    if (!cantiereId) return toast.error('Seleziona un cantiere')
    if (!dipendenteId) return toast.error('Seleziona un dipendente')
    if (!data) return toast.error('Indica la data')

    const input = {
      cantiere_id: cantiereId,
      dipendente_id: dipendenteId,
      data,
      ore_ord: oreOrd,
      ore_str: oreStr,
      pernottamento,
      diaria,
      ore_viaggio: oreViaggio,
      costo_viaggio: costoViag,
      note: note.trim() || null,
    }
    try {
      if (isEdit && id) {
        await updateM.mutateAsync({ id, input })
        toast.success('Rapportino aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Rapportino salvato')
      }
      navigate('/rapportini')
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        breadcrumb={['Rapportini ore', isEdit ? 'Modifica' : 'Nuovo']}
        title={isEdit ? 'Modifica rapportino' : 'Nuovo rapportino ore'}
        banner="Registra le ore lavorate da un dipendente su un cantiere. Il costo è calcolato in tempo reale sulla tariffa valida alla data."
        actions={
          <Button
            variant="secondary"
            icon="arrow-left"
            onClick={() => navigate('/rapportini')}
          >
            Indietro
          </Button>
        }
      />

      <Card noPad className="overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-12 gap-5">
            <Field label="Data" required span={4}>
              <Input
                size="lg"
                type="date"
                leftIcon="calendar"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </Field>

            <Field
              label="Cantiere"
              required
              span={8}
              hint={
                cantiereSel
                  ? `${cantiereSel.cliente?.ragione_sociale ?? ''} ${
                      cantiereSel.indirizzo ? '· ' + cantiereSel.indirizzo : ''
                    }`
                  : undefined
              }
            >
              <Select
                size="lg"
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

            <Field
              label="Dipendente"
              required
              span={8}
              hint={
                dipendenteId
                  ? tariffa
                    ? `Tariffa alla data — ordinaria ${eu(tariffa.costo_ord, {
                        decimals: 2,
                      })}/h · straordinaria ${eu(tariffa.costo_str, {
                        decimals: 2,
                      })}/h`
                    : '⚠ Nessuna tariffa valida a questa data per il dipendente'
                  : undefined
              }
            >
              <Select
                size="lg"
                leftIcon="user"
                value={dipendenteId}
                onChange={(e) => setDipendenteId(e.target.value)}
              >
                <option value="">— Seleziona dipendente —</option>
                {dipendenti.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome} {d.cognome}
                    {d.mansione ? ` — ${d.mansione}` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Ore ordinarie" required span={4}>
              <NumberStepper value={oreOrd} onChange={setOreOrd} suffix="h" step={0.5} />
            </Field>
            <Field label="Ore straordinarie" span={4}>
              <NumberStepper value={oreStr} onChange={setOreStr} suffix="h" step={0.5} />
            </Field>
            <Field
              label="Pernottamento"
              span={4}
              hint="dorme fuori → diaria"
            >
              <div className="h-12 flex items-center px-4 bg-white border border-line rounded-lg">
                <Toggle
                  size="lg"
                  checked={pernottamento}
                  onChange={setPernottamento}
                  label={pernottamento ? 'Dorme fuori' : 'No'}
                />
              </div>
            </Field>

            {pernottamento && (
              <Field
                label="Diaria trasferta"
                span={4}
                hint={`predefinita ${eu(DIARIA_TRASFERTA, { decimals: 2 })} · modificabile`}
              >
                <Input
                  size="lg"
                  inputMode="decimal"
                  value={diariaVal}
                  onChange={(e) => setDiariaVal(e.target.value)}
                  rightAddon="€"
                  placeholder="0,00"
                />
              </Field>
            )}

            <Field
              label="Ore di viaggio"
              span={4}
              hint="tempo di viaggio (anche senza pernottamento)"
            >
              <NumberStepper value={oreViaggio} onChange={setOreViaggio} suffix="h" step={0.5} />
            </Field>
            <Field
              label="Costo viaggio"
              span={4}
              hint="importo da riconoscere per il viaggio (manuale)"
            >
              <Input
                size="lg"
                inputMode="decimal"
                value={costoViaggio}
                onChange={(e) => setCostoViaggio(e.target.value)}
                rightAddon="€"
                placeholder="0,00"
              />
            </Field>

            <Field label="Note (opzionale)" span={12}>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Es. Getto solaio piano primo, posa armatura completata…"
              />
            </Field>
          </div>
        </div>

        {/* Riepilogo costo */}
        <div className="border-t border-line bg-navy-50/40 px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <Icon name="calculator" size={16} className="text-navy-600" />
              Costo registrato sul cantiere
            </div>
            <div className="flex-1 flex items-center gap-5 text-sm text-ink-soft flex-wrap">
              {tariffa ? (
                <>
                  <span>
                    <span className="num text-ink">{oreOrd}h</span> ×{' '}
                    {eu(tariffa.costo_ord, { decimals: 2 })} ={' '}
                    <span className="num text-ink">
                      {eu(oreOrd * tariffa.costo_ord, { decimals: 2 })}
                    </span>
                  </span>
                  {oreStr > 0 && (
                    <span>
                      <span className="num text-ink">{oreStr}h</span> ×{' '}
                      {eu(tariffa.costo_str, { decimals: 2 })} ={' '}
                      <span className="num text-warn-deep font-medium">
                        {eu(oreStr * tariffa.costo_str, { decimals: 2 })}
                      </span>
                    </span>
                  )}
                  {pernottamento && (
                    <span>
                      + diaria{' '}
                      <span className="num text-ink">
                        {eu(diaria, { decimals: 2 })}
                      </span>
                    </span>
                  )}
                  {costoViag > 0 && (
                    <span>
                      + viaggio{oreViaggio > 0 ? ` (${oreViaggio}h)` : ''}{' '}
                      <span className="num text-ink">
                        {eu(costoViag, { decimals: 2 })}
                      </span>
                    </span>
                  )}
                </>
              ) : (
                <span className="text-ink-faint">
                  Seleziona dipendente e data per calcolare il costo
                </span>
              )}
            </div>
            <div className="text-2xl font-semibold num text-navy-700 tracking-tight">
              {costoTot !== null ? eu(costoTot, { decimals: 2 }) : '—'}
            </div>
          </div>
        </div>

        {/* Footer azioni */}
        <div className="border-t border-line px-6 py-4 flex items-center justify-between gap-3 bg-white">
          <div className="text-xs text-ink-soft">
            <Icon name="lock" size={12} className="inline mr-1" />
            La tariffa è quella valida alla data del rapportino; cambiare le
            tariffe future non altera questo costo.
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/rapportini')}
              disabled={saving}
            >
              Annulla
            </Button>
            <Button
              size="lg"
              icon={saving ? 'loader-circle' : 'check'}
              onClick={submit}
              disabled={saving}
            >
              {isEdit ? 'Salva modifiche' : 'Salva rapportino'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
