import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Money } from '@/components/ui/Money'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { eu } from '@/lib/utils'
import { exportToExcel, exportToPdf, euExport, type ExportColumn } from '@/lib/export'
import { useCantieri, type CantiereConMargini } from '@/features/cantieri/api'
import { useAzienda } from '@/features/azienda/api'

type Ambito = 'commessa' | 'manutenzione' | 'tutti'

const AMBITO_LABEL: Record<Ambito, string> = {
  commessa: 'Cantieri commessa',
  manutenzione: 'Cantieri manutenzione',
  tutti: 'Tutti i cantieri',
}

type Riga = {
  codice: string
  nome: string
  manutenzione: boolean
  ricavi: number
  costi: number
  margine: number
  stato: 'attivo' | 'passivo'
}

export function ReportScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: cantieri = [], isLoading } = useCantieri()
  const { data: azienda } = useAzienda()
  const [ambito, setAmbito] = useState<Ambito>('commessa')

  const righe: Riga[] = useMemo(() => {
    return cantieri
      .filter((c) => {
        if (ambito === 'commessa') return !c.manutenzione
        if (ambito === 'manutenzione') return c.manutenzione
        return true
      })
      .map((c: CantiereConMargini) => {
        const ricavi = c.margini?.ricavi ?? 0
        const costi =
          (c.margini?.costi_diretti ?? 0) + (c.margini?.indiretti ?? 0)
        const margine = ricavi - costi
        return {
          codice: c.codice,
          nome: c.nome,
          manutenzione: c.manutenzione,
          ricavi,
          costi,
          margine,
          stato: (margine >= 0 ? 'attivo' : 'passivo') as 'attivo' | 'passivo',
        }
      })
  }, [cantieri, ambito])

  const totRicavi = righe.reduce((s, r) => s + r.ricavi, 0)
  const totCosti = righe.reduce((s, r) => s + r.costi, 0)
  const totMargine = righe.reduce((s, r) => s + r.margine, 0)
  const attivi = righe.filter((r) => r.stato === 'attivo').length
  const passivi = righe.filter((r) => r.stato === 'passivo').length

  const exportColumns: ExportColumn[] = [
    { header: 'Codice', key: 'codice' },
    { header: 'Cantiere', key: 'nome' },
    { header: 'Ricavi', key: 'ricavi', align: 'right', format: (v) => euExport(Number(v)) },
    { header: 'Costi', key: 'costi', align: 'right', format: (v) => euExport(Number(v)) },
    { header: 'Margine', key: 'margine', align: 'right', format: (v) => euExport(Number(v)) },
    {
      header: 'Stato',
      key: 'stato',
      format: (v) => (v === 'attivo' ? 'Attivo' : 'Passivo'),
    },
  ]

  const fileBase = `report-${ambito}-${new Date().toISOString().slice(0, 10)}`
  const sottotitolo = `${AMBITO_LABEL[ambito]} · stato attuale`

  const onExcel = async () => {
    if (righe.length === 0) return toast.error('Nessun dato da esportare')
    try {
      await exportToExcel(
        righe as unknown as Record<string, unknown>[],
        exportColumns,
        fileBase,
        'Marginalità'
      )
      toast.success('Excel esportato')
    } catch (e) {
      toast.error('Errore export: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const onPdf = async () => {
    if (righe.length === 0) return toast.error('Nessun dato da esportare')
    try {
      await exportToPdf(
        righe as unknown as Record<string, unknown>[],
        exportColumns,
        fileBase,
        {
          title: 'Report marginalità cantieri',
          subtitle: sottotitolo,
          azienda: azienda?.ragione_sociale,
          totals: {
            Codice: '',
            Cantiere: `Totale ${righe.length}`,
            Ricavi: euExport(totRicavi),
            Costi: euExport(totCosti),
            Margine: euExport(totMargine),
            Stato: totMargine >= 0 ? 'Attivo' : 'Passivo',
          },
        }
      )
      toast.success('PDF esportato')
    } catch (e) {
      toast.error('Errore export: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const cols: Column<Riga>[] = [
    { key: 'codice', label: 'Codice', mono: true, width: 140, render: (r) => <span className="text-ink-soft">{r.codice}</span> },
    {
      key: 'nome',
      label: 'Cantiere',
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.nome}</div>
          {r.manutenzione && (
            <Badge tone="navy" icon="wrench">
              Manutenzione
            </Badge>
          )}
        </div>
      ),
    },
    { key: 'ricavi', label: 'Ricavi', align: 'right', width: 130, render: (r) => <Money value={r.ricavi} /> },
    { key: 'costi', label: 'Costi', align: 'right', width: 130, render: (r) => <Money value={r.costi} /> },
    { key: 'margine', label: 'Margine', align: 'right', width: 140, render: (r) => <Money value={r.margine} signed bold /> },
    {
      key: 'stato',
      label: 'Stato',
      width: 120,
      render: (r) =>
        r.stato === 'attivo' ? (
          <Badge tone="good" icon="trending-up">Attivo</Badge>
        ) : (
          <Badge tone="bad" icon="trending-down">Passivo</Badge>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Report"
        banner="Report economico sui cantieri: ricavi, costi (diretti + indiretti) e marginalità con stato attivo/passivo. Esportabile in Excel e PDF."
        actions={
          <>
            <Button variant="secondary" icon="file-spreadsheet" onClick={onExcel}>
              Excel
            </Button>
            <Button icon="download" onClick={onPdf}>
              PDF
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-1.5 bg-white border border-line rounded-lg p-0.5 mb-5 w-fit">
        {(['commessa', 'manutenzione', 'tutti'] as Ambito[]).map((a) => (
          <button
            key={a}
            onClick={() => setAmbito(a)}
            className={`h-8 px-3 rounded-md text-sm transition ${
              ambito === a
                ? 'bg-navy-600 text-white'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {AMBITO_LABEL[a]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Ricavi" value={eu(totRicavi)} icon="receipt" />
        <KPI label="Costi" value={eu(totCosti)} icon="trending-down" hint="diretti + indiretti" />
        <KPI
          label="Margine complessivo"
          value={eu(totMargine)}
          tone={totMargine >= 0 ? 'good' : 'bad'}
          icon="wallet"
          delta={totMargine >= 0 ? 'In attivo' : 'In passivo'}
        />
        <KPI
          label="Attivi / Passivi"
          value={`${attivi} / ${passivi}`}
          tone={passivi === 0 ? 'good' : 'warn'}
          icon="scale"
          hint="cantieri in utile / perdita"
        />
      </div>

      <Card noPad className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">
            Dettaglio per cantiere
          </h2>
          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-good" /> Attivo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-bad" /> Passivo
            </span>
          </div>
        </div>
        {isLoading ? (
          <div className="p-12 text-center">
            <Icon name="loader-circle" size={24} className="animate-spin text-navy-600 mx-auto" />
          </div>
        ) : righe.length === 0 ? (
          <EmptyState
            icon="chart-column"
            title="Nessun cantiere"
            description="Non ci sono cantieri per questo ambito."
          />
        ) : (
          <Table
            columns={cols}
            rows={righe}
            onRowClick={(r) => {
              const c = cantieri.find((x) => x.codice === r.codice)
              if (c) navigate(`/cantieri/${c.id}`)
            }}
            footer={{
              codice: (
                <span className="text-ink-soft text-xs uppercase tracking-wide">
                  Totale {righe.length}
                </span>
              ),
              ricavi: <Money value={totRicavi} bold />,
              costi: <Money value={totCosti} bold />,
              margine: <Money value={totMargine} signed bold />,
              stato: (
                <span
                  className={`text-xs font-medium ${
                    totMargine >= 0 ? 'text-good-deep' : 'text-bad-deep'
                  }`}
                >
                  {totMargine >= 0 ? 'Attivo' : 'Passivo'}
                </span>
              ),
            }}
          />
        )}
      </Card>
    </div>
  )
}
