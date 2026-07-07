import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Money, Pct } from '@/components/ui/Money'
import { EmptyState } from '@/components/ui/EmptyState'
import { eu } from '@/lib/utils'
import { useCantieri, type CantiereConMargini } from './api'
import { CantiereForm } from './CantiereForm'
import { STATO_CANTIERE } from './constants'

export function CantieriManutenzioneList() {
  const navigate = useNavigate()
  const { data: cantieri = [], isLoading, isError, error } = useCantieri()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const manutenzione = useMemo(
    () => cantieri.filter((c) => c.manutenzione),
    [cantieri]
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return manutenzione
    return manutenzione.filter((c) =>
      `${c.nome} ${c.cliente?.ragione_sociale ?? ''} ${c.codice}`
        .toLowerCase()
        .includes(q)
    )
  }, [manutenzione, search])

  const totValore = manutenzione.reduce((s, c) => s + c.valore_contratto, 0)
  const totRicavi = manutenzione.reduce((s, c) => s + (c.margini?.ricavi ?? 0), 0)
  const totMargine = manutenzione.reduce(
    (s, c) => s + (c.margini?.margine_pieno ?? 0),
    0
  )

  const cols: Column<CantiereConMargini>[] = [
    {
      key: 'codice',
      label: 'Codice',
      mono: true,
      width: 140,
      render: (r) => <span className="text-ink-soft">{r.codice}</span>,
    },
    {
      key: 'nome',
      label: 'Cantiere',
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.nome}</div>
          {r.indirizzo && (
            <div className="text-xs text-ink-soft mt-0.5 flex items-center gap-1">
              <Icon name="map-pin" size={11} /> {r.indirizzo}
              {r.citta ? `, ${r.citta}` : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (r) => (
        <span className="text-ink">{r.cliente?.ragione_sociale ?? '—'}</span>
      ),
    },
    {
      key: 'stato',
      label: 'Stato',
      width: 130,
      render: (r) => {
        const s = STATO_CANTIERE[r.stato]
        return (
          <Badge tone={s.tone} icon={s.icon}>
            {s.label}
          </Badge>
        )
      },
    },
    {
      key: 'valore_contratto',
      label: 'Valore',
      align: 'right',
      width: 120,
      render: (r) => <Money value={r.valore_contratto} />,
    },
    {
      key: 'ricavi',
      label: 'Ricavi',
      align: 'right',
      width: 120,
      render: (r) => <Money value={r.margini?.ricavi ?? 0} />,
    },
    {
      key: 'margine',
      label: 'Margine',
      align: 'right',
      width: 110,
      render: (r) => {
        const mp = r.margini?.margine_pieno ?? 0
        const ricavi = r.margini?.ricavi ?? 0
        return <Pct value={ricavi > 0 ? (mp / ricavi) * 100 : 0} />
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Cantieri manutenzione"
        banner="Cantieri in gestione manutenzione. Puoi crearne di nuovi qui oppure attivare l'interruttore «Manut.» su un cantiere commessa."
        actions={
          <Button icon="plus" onClick={() => setFormOpen(true)}>
            Nuovo cantiere manutenzione
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Cantieri manutenzione"
          value={String(manutenzione.length)}
          icon="wrench"
          hint="con flag manutenzione attivo"
        />
        <KPI
          label="Valore contratti"
          value={eu(totValore)}
          icon="file-text"
        />
        <KPI label="Ricavi" value={eu(totRicavi)} icon="receipt" />
        <KPI
          label="Margine pieno"
          value={eu(totMargine)}
          tone={totMargine >= 0 ? 'good' : 'bad'}
          icon="wallet"
        />
      </div>

      <div className="flex items-center justify-end gap-3 mb-4">
        <div className="relative">
          <Icon
            name="search"
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 pr-3 text-sm border border-line rounded-lg w-64 bg-white focus:outline-none focus:border-navy-500"
            placeholder="Cerca cantiere, cliente, codice…"
          />
        </div>
      </div>

      <Card noPad className="overflow-hidden">
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
        ) : rows.length === 0 ? (
          <EmptyState
            icon="wrench"
            title={
              manutenzione.length === 0
                ? 'Nessun cantiere in manutenzione'
                : 'Nessun risultato'
            }
            description={
              manutenzione.length === 0
                ? 'Crea un cantiere manutenzione o attiva il flag «Manut.» su un cantiere commessa.'
                : 'Nessun cantiere con questa ricerca.'
            }
            action={
              manutenzione.length === 0 ? (
                <Button icon="plus" onClick={() => setFormOpen(true)}>
                  Nuovo cantiere manutenzione
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            columns={cols}
            rows={rows}
            onRowClick={(r) => navigate(`/cantieri/${r.id}`)}
          />
        )}
      </Card>

      <CantiereForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaultManutenzione
      />
    </div>
  )
}
