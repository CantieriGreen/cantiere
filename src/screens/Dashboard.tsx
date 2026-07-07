import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Money, Pct } from '@/components/ui/Money'
import { MarginBar } from '@/components/ui/MarginBar'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { eu } from '@/lib/utils'
import { useCantieri, type CantiereConMargini } from '@/features/cantieri/api'

export function Dashboard() {
  const navigate = useNavigate()
  const { data: cantieri = [], isLoading, isError, error } = useCantieri()

  const attivi = useMemo(
    () => cantieri.filter((c) => c.stato !== 'chiuso'),
    [cantieri]
  )

  const totals = useMemo(() => {
    return attivi.reduce(
      (s, c) => ({
        ricavi: s.ricavi + (c.margini?.ricavi ?? 0),
        costiDiretti: s.costiDiretti + (c.margini?.costi_diretti ?? 0),
        indiretti: s.indiretti + (c.margini?.indiretti ?? 0),
        marginePieno: s.marginePieno + (c.margini?.margine_pieno ?? 0),
      }),
      { ricavi: 0, costiDiretti: 0, indiretti: 0, marginePieno: 0 }
    )
  }, [attivi])

  const totalMarginPct =
    totals.ricavi > 0 ? (totals.marginePieno / totals.ricavi) * 100 : 0

  const ordered = useMemo(
    () =>
      [...attivi].sort(
        (a, b) =>
          (b.margini?.margine_pieno ?? 0) - (a.margini?.margine_pieno ?? 0)
      ),
    [attivi]
  )

  const maxAbsMargine = Math.max(
    1,
    ...attivi.map((c) => Math.abs(c.margini?.margine_pieno ?? 0))
  )

  const cols: Column<CantiereConMargini>[] = [
    {
      key: 'codice',
      label: 'Codice',
      width: 140,
      mono: true,
      render: (r) => <span className="text-ink-soft">{r.codice}</span>,
    },
    {
      key: 'nome',
      label: 'Cantiere',
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.nome}</div>
          <div className="text-xs text-ink-soft">
            {r.cliente?.ragione_sociale ?? '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'ricavi',
      label: 'Ricavi',
      align: 'right',
      width: 110,
      render: (r) => <Money value={r.margini?.ricavi ?? 0} />,
    },
    {
      key: 'costiDiretti',
      label: 'Costi diretti',
      align: 'right',
      width: 120,
      render: (r) => <Money value={r.margini?.costi_diretti ?? 0} />,
    },
    {
      key: 'indiretti',
      label: 'Indiretti',
      align: 'right',
      width: 110,
      render: (r) => <Money value={r.margini?.indiretti ?? 0} />,
    },
    {
      key: 'marginePieno',
      label: 'Margine',
      align: 'right',
      width: 120,
      render: (r) => (
        <Money value={r.margini?.margine_pieno ?? 0} signed bold />
      ),
    },
    {
      key: 'marginePct',
      label: '%',
      align: 'right',
      width: 80,
      render: (r) => {
        const ricavi = r.margini?.ricavi ?? 0
        const mp = r.margini?.margine_pieno ?? 0
        return <Pct value={ricavi > 0 ? (mp / ricavi) * 100 : 0} />
      },
    },
    {
      key: 'bar',
      label: '',
      width: 160,
      render: (r) => (
        <MarginBar value={r.margini?.margine_pieno ?? 0} max={maxAbsMargine} />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        banner="Marginalità complessiva dei cantieri attivi. I cantieri in perdita sono evidenziati in rosso."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Ricavi" value={eu(totals.ricavi)} icon="trending-up" />
        <KPI label="Costi diretti" value={eu(totals.costiDiretti)} icon="hammer" />
        <KPI
          label="Indiretti ripartiti"
          value={eu(totals.indiretti)}
          icon="building-2"
        />
        <KPI
          label="Margine pieno"
          value={eu(totals.marginePieno)}
          tone={totals.marginePieno >= 0 ? 'good' : 'bad'}
          icon="wallet"
          hint={totals.ricavi > 0 ? `${totalMarginPct.toFixed(1)}% sui ricavi` : undefined}
        />
      </div>

      <Card noPad className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Cantieri attivi</h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Ordinati per margine pieno
            </p>
          </div>
          <button
            onClick={() => navigate('/cantieri')}
            className="text-sm text-navy-700 hover:underline"
          >
            Vedi tutti
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Icon name="loader-circle" size={24} className="animate-spin text-navy-600 mx-auto" />
          </div>
        ) : isError ? (
          <EmptyState
            icon="circle-alert"
            title="Errore di caricamento"
            description={error instanceof Error ? error.message : 'Errore'}
          />
        ) : ordered.length === 0 ? (
          <EmptyState
            icon="hard-hat"
            title="Nessun cantiere attivo"
            description="Crea un cantiere per vederne la marginalità qui."
            action={
              <button
                onClick={() => navigate('/cantieri')}
                className="text-sm text-navy-700 hover:underline"
              >
                Vai ai cantieri
              </button>
            }
          />
        ) : (
          <Table
            columns={cols}
            rows={ordered}
            onRowClick={(r) => navigate(`/cantieri/${r.id}`)}
            footer={{
              codice: (
                <span className="text-ink-soft text-xs uppercase tracking-wide">
                  Totale
                </span>
              ),
              ricavi: <Money value={totals.ricavi} />,
              costiDiretti: <Money value={totals.costiDiretti} />,
              indiretti: <Money value={totals.indiretti} />,
              marginePieno: <Money value={totals.marginePieno} signed bold />,
            }}
          />
        )}
      </Card>
    </div>
  )
}
