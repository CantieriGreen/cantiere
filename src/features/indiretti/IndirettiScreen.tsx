import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Money } from '@/components/ui/Money'
import { Radio } from '@/components/ui/Toggle'
import { Field, Select, Input } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { eu, pct as fmtPct } from '@/lib/utils'
import type {
  AnteprimaRipartizione,
  CostoIndiretto,
  DriverRipartizione,
} from '@/lib/types'
import {
  useCostiIndiretti,
  useDeleteCostoIndiretto,
  useEliminaAmmortamento,
  useAnteprimaRipartizione,
  useCantieriRipartibili,
  useRipartizionePeriodo,
  useApplicaRipartizione,
  type CostoIndirettoConCategoria,
} from './api'
import { CostoIndirettoForm } from './CostoIndirettoForm'

// ---- helper periodo (mese) ----
function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthToRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const inizio = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const fine = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { inizio, fine }
}
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

const DRIVER_LABEL: Record<DriverRipartizione, string> = {
  percentuale_manuale: 'Percentuale manuale',
  ore_lavorate: 'Ore lavorate',
  costi_diretti: 'Costi diretti',
  ricavi: 'Ricavi',
}

type PreviewRow = AnteprimaRipartizione & {
  pesoPct: number
  quota: number
}

export function IndirettiScreen() {
  const toast = useToast()
  const [month, setMonth] = useState(currentMonth())
  const periodo = useMemo(() => monthToRange(month), [month])

  const [mode, setMode] = useState<'manual' | 'driver'>('driver')
  const [driver, setDriver] = useState<Exclude<DriverRipartizione, 'percentuale_manuale'>>('ore_lavorate')
  const [manualPct, setManualPct] = useState<Record<string, string>>({})

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CostoIndiretto | null>(null)
  const [toDelete, setToDelete] = useState<CostoIndiretto | null>(null)

  const { data: costi = [], isLoading: loadingCosti } = useCostiIndiretti(periodo)
  const deleteCostoM = useDeleteCostoIndiretto()
  const eliminaAmmM = useEliminaAmmortamento()
  const { data: anteprima = [] } = useAnteprimaRipartizione(
    periodo,
    driver,
    mode === 'driver'
  )
  const { data: cantieriManual = [] } = useCantieriRipartibili(periodo)
  const { data: ripApplicata } = useRipartizionePeriodo(periodo)
  const applicaM = useApplicaRipartizione()

  const totaleIndiretti = useMemo(
    () => costi.reduce((s, c) => s + c.importo, 0),
    [costi]
  )

  // ---- calcolo preview ----
  const preview: PreviewRow[] = useMemo(() => {
    if (mode === 'driver') {
      const sommaBasis = anteprima.reduce((s, r) => s + Number(r.basis), 0)
      return anteprima.map((r) => {
        const peso = sommaBasis > 0 ? Number(r.basis) / sommaBasis : 0
        return {
          ...r,
          pesoPct: peso * 100,
          quota: Math.round(peso * totaleIndiretti * 100) / 100,
        }
      })
    }
    // manuale
    return cantieriManual.map((r) => {
      const p = Number((manualPct[r.cantiere_id] ?? '').replace(',', '.')) || 0
      return {
        ...r,
        pesoPct: p,
        quota: Math.round((p / 100) * totaleIndiretti * 100) / 100,
      }
    })
  }, [mode, anteprima, cantieriManual, manualPct, totaleIndiretti])

  const sommaPct = preview.reduce((s, r) => s + r.pesoPct, 0)
  const sommaQuota = preview.reduce((s, r) => s + r.quota, 0)
  const sommaBasisDriver = anteprima.reduce((s, r) => s + Number(r.basis), 0)

  // reset percentuali manuali quando cambia periodo
  useEffect(() => {
    setManualPct({})
  }, [month])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (c: CostoIndiretto) => {
    setEditing(c)
    setFormOpen(true)
  }
  const confirmDelete = async () => {
    if (!toDelete) return
    const amm = toDelete.ammortamento_id
    try {
      if (amm) {
        await eliminaAmmM.mutateAsync(amm)
        toast.success('Ammortamento eliminato (tutte le rate)')
      } else {
        await deleteCostoM.mutateAsync(toDelete.id)
        toast.success('Costo eliminato')
      }
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const applica = async () => {
    if (totaleIndiretti <= 0)
      return toast.error('Nessun costo indiretto da ripartire nel periodo')
    if (mode === 'driver' && sommaBasisDriver <= 0)
      return toast.error(
        'Il driver scelto è a zero per tutti i cantieri (nessun dato nel periodo)'
      )
    if (mode === 'manual' && Math.abs(sommaPct - 100) > 0.5)
      return toast.error('Le percentuali devono sommare 100%')

    const righe = preview
      .filter((r) => r.quota > 0)
      .map((r) => ({
        cantiere_id: r.cantiere_id,
        percentuale: Math.round(r.pesoPct * 100) / 100,
        importo: r.quota,
      }))
    if (righe.length === 0)
      return toast.error('Nessuna quota da assegnare')

    try {
      await applicaM.mutateAsync({
        inizio: periodo.inizio,
        fine: periodo.fine,
        driver: mode === 'manual' ? 'percentuale_manuale' : driver,
        righe,
      })
      toast.success('Ripartizione applicata ai cantieri')
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  // ---- colonne ----
  const colsCosti: Column<CostoIndirettoConCategoria>[] = [
    {
      key: 'data',
      label: 'Data',
      width: 100,
      render: (r) => <span className="num text-ink-soft text-xs">{formatDate(r.data)}</span>,
    },
    {
      key: 'categoria',
      label: 'Categoria',
      width: 150,
      render: (r) =>
        r.categoria?.nome ? (
          <Badge tone="navy">{r.categoria.nome}</Badge>
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      key: 'descrizione',
      label: 'Descrizione',
      render: (r) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-ink">{r.descrizione}</span>
            {r.rate_totali ? (
              <Badge tone="navy" icon="calendar-clock">
                rata {r.rata_n}/{r.rate_totali}
              </Badge>
            ) : null}
            {r.origine === 'fattureincloud' && (
              <Badge tone="navy" icon="cloud">
                FIC
              </Badge>
            )}
          </div>
          {r.fornitore?.ragione_sociale && (
            <div className="text-xs text-ink-soft mt-0.5">
              {r.fornitore.ragione_sociale}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'importo',
      label: 'Importo',
      align: 'right',
      width: 120,
      render: (r) => <Money value={r.importo} bold />,
    },
    {
      key: '_act',
      label: '',
      align: 'right',
      width: 80,
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              openEdit(r)
            }}
            className="text-ink-faint hover:text-ink p-1.5 rounded-md hover:bg-line-soft"
          >
            <Icon name="pencil" size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setToDelete(r)
            }}
            className="text-ink-faint hover:text-bad p-1.5 rounded-md hover:bg-bad-soft/40"
          >
            <Icon name="trash-2" size={14} />
          </button>
        </div>
      ),
    },
  ]

  const colsRip: Column<PreviewRow>[] = [
    {
      key: 'codice',
      label: 'Cantiere',
      render: (r) => (
        <div>
          <div className="font-mono text-[12px] text-ink-soft">{r.codice}</div>
          <div className="text-sm font-medium text-ink">{r.nome}</div>
        </div>
      ),
    },
    {
      key: 'basis',
      label: mode === 'driver' ? DRIVER_LABEL[driver] : 'Driver',
      align: 'right',
      width: 130,
      render: (r) =>
        mode === 'driver' ? (
          <span className="num text-ink-soft">
            {driver === 'ore_lavorate'
              ? `${r.basis} h`
              : eu(Number(r.basis))}
          </span>
        ) : (
          <span className="text-ink-faint text-xs">manuale</span>
        ),
    },
    {
      key: 'pct',
      label: '%',
      align: 'right',
      width: 150,
      render: (r) =>
        mode === 'manual' ? (
          <Input
            inputMode="decimal"
            className="w-24 ml-auto"
            value={manualPct[r.cantiere_id] ?? ''}
            onChange={(e) =>
              setManualPct((s) => ({ ...s, [r.cantiere_id]: e.target.value }))
            }
            rightAddon="%"
          />
        ) : (
          <div className="inline-flex items-center gap-2 justify-end">
            <div className="w-16 h-1.5 bg-line-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-navy-500"
                style={{ width: `${Math.min(100, r.pesoPct)}%` }}
              />
            </div>
            <span className="num">{fmtPct(r.pesoPct, 1)}</span>
          </div>
        ),
    },
    {
      key: 'quota',
      label: 'Quota indiretti',
      align: 'right',
      width: 140,
      render: (r) => <Money value={r.quota} decimals={2} bold />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Costi indiretti"
        banner="Registra i costi di struttura del periodo e configura come ripartirli sui cantieri attivi (per % manuale o per driver)."
        actions={
          <Button icon="plus" onClick={openNew}>
            Nuovo costo
          </Button>
        }
      />

      {/* Selettore periodo */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-ink-soft">Periodo</span>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 px-3 text-sm border border-line rounded-lg bg-white focus:outline-none focus:border-navy-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Totale indiretti"
          value={eu(totaleIndiretti)}
          icon="building-2"
          hint={`${costi.length} voci nel periodo`}
        />
        <KPI
          label="Cantieri destinatari"
          value={String(preview.length)}
          icon="hard-hat"
          hint="cantieri non chiusi"
        />
        <KPI
          label="Stato ripartizione"
          value={ripApplicata ? 'Applicata' : 'Da applicare'}
          tone={ripApplicata ? 'good' : 'warn'}
          icon={ripApplicata ? 'circle-check' : 'circle-alert'}
          hint={
            ripApplicata
              ? `Driver: ${DRIVER_LABEL[ripApplicata.driver]}`
              : 'Conferma prima della chiusura mese'
          }
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* A — Costi del periodo */}
        <div className="col-span-12 xl:col-span-6">
          <Card noPad className="overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">
                  A — Costi indiretti del periodo
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Affitti, utenze, personale ufficio, mezzi
                </p>
              </div>
              <Badge tone="neutral">Tot. {eu(totaleIndiretti)}</Badge>
            </div>
            {loadingCosti ? (
              <div className="p-10 text-center">
                <Icon name="loader-circle" size={22} className="animate-spin text-navy-600 mx-auto" />
              </div>
            ) : costi.length === 0 ? (
              <EmptyState
                icon="building-2"
                title="Nessun costo nel periodo"
                description="Aggiungi i costi di struttura di questo mese."
                action={
                  <Button icon="plus" size="sm" onClick={openNew}>
                    Nuovo costo
                  </Button>
                }
              />
            ) : (
              <Table
                columns={colsCosti}
                rows={costi}
                onRowClick={openEdit}
                footer={{
                  data: (
                    <span className="text-ink-soft text-xs uppercase tracking-wide">
                      Totale
                    </span>
                  ),
                  importo: <Money value={totaleIndiretti} bold />,
                }}
              />
            )}
          </Card>
        </div>

        {/* B — Configurazione */}
        <div className="col-span-12 xl:col-span-6">
          <Card noPad className="overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="text-[15px] font-semibold text-ink">
                B — Configurazione ripartizione
              </h2>
              <p className="text-xs text-ink-soft mt-0.5">
                Come distribuire i costi sui cantieri attivi
              </p>
            </div>
            <div className="p-5 space-y-3">
              <Radio
                checked={mode === 'driver'}
                onChange={() => setMode('driver')}
                label="Per driver automatico"
                description="Il sistema calcola la quota in base al driver scelto. Consigliato."
              />
              {mode === 'driver' && (
                <div className="pl-3 ml-2 border-l-2 border-navy-200">
                  <Field label="Driver di ripartizione" hint="determina il peso di ciascun cantiere">
                    <Select
                      leftIcon="sigma"
                      value={driver}
                      onChange={(e) =>
                        setDriver(e.target.value as typeof driver)
                      }
                    >
                      <option value="ore_lavorate">Ore lavorate sul cantiere</option>
                      <option value="costi_diretti">Costi diretti del cantiere</option>
                      <option value="ricavi">Ricavi del cantiere</option>
                    </Select>
                  </Field>
                </div>
              )}
              <Radio
                checked={mode === 'manual'}
                onChange={() => setMode('manual')}
                label="Per percentuale manuale"
                description="Imposti tu la % per ogni cantiere nella tabella sotto."
              />
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div className="col-span-12">
          <Card noPad className="overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">
                  Anteprima ripartizione
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Distribuzione di{' '}
                  <span className="text-ink font-medium">
                    {eu(totaleIndiretti)}
                  </span>{' '}
                  ·{' '}
                  <span className="text-navy-700 font-medium">
                    {mode === 'manual'
                      ? 'percentuale manuale'
                      : DRIVER_LABEL[driver]}
                  </span>
                </p>
              </div>
              <Button
                icon={applicaM.isPending ? 'loader-circle' : 'check'}
                onClick={applica}
                disabled={applicaM.isPending || preview.length === 0}
              >
                Applica ripartizione al periodo
              </Button>
            </div>

            {preview.length === 0 ? (
              <EmptyState
                icon="hard-hat"
                title="Nessun cantiere ripartibile"
                description="Servono cantieri non chiusi per ripartire i costi."
              />
            ) : (
              <>
                <Table
                  columns={colsRip}
                  rows={preview}
                  footer={{
                    codice: (
                      <span className="text-ink-soft text-xs uppercase tracking-wide">
                        Totale
                      </span>
                    ),
                    pct: (
                      <span
                        className={`num font-medium ${
                          mode === 'manual' && Math.abs(sommaPct - 100) > 0.5
                            ? 'text-bad-deep'
                            : 'text-ink'
                        }`}
                      >
                        {fmtPct(sommaPct, 1)}
                      </span>
                    ),
                    quota: <Money value={sommaQuota} decimals={2} bold />,
                  }}
                />
                {mode === 'manual' && Math.abs(sommaPct - 100) > 0.5 && (
                  <div className="px-5 py-3 bg-warn-soft/40 border-t border-warn/20 text-sm text-warn-deep flex items-center gap-2">
                    <Icon name="circle-alert" size={15} />
                    Le percentuali devono sommare 100% (attuale: {fmtPct(sommaPct, 1)})
                  </div>
                )}
              </>
            )}
          </Card>

          {ripApplicata && (
            <div className="mt-4 flex items-start gap-3 p-3 bg-good-soft/70 border border-good/20 rounded-lg">
              <Icon name="circle-check" size={18} className="text-good-deep mt-0.5" />
              <div className="text-sm text-good-deep">
                <strong>Ripartizione applicata</strong> per questo periodo
                (driver: {DRIVER_LABEL[ripApplicata.driver]}). Le quote sono
                visibili nella scheda di ciascun cantiere e nel margine pieno.
                Riapplicando, la precedente viene sostituita.
              </div>
            </div>
          )}
        </div>
      </div>

      <CostoIndirettoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        costo={editing}
        defaultData={periodo.inizio}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title={toDelete?.ammortamento_id ? 'Elimina ammortamento' : 'Elimina costo indiretto'}
        message={
          toDelete?.ammortamento_id
            ? `Questo costo fa parte di un ammortamento (${toDelete.rate_totali} rate): verranno eliminate tutte le rate, non solo questa. Se hai già applicato la ripartizione, riapplicala per aggiornare le quote.`
            : 'Vuoi eliminare questo costo? Se hai già applicato la ripartizione, riapplicala per aggiornare le quote.'
        }
        confirmLabel="Elimina"
        loading={deleteCostoM.isPending || eliminaAmmM.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
