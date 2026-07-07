import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { Money } from '@/components/ui/Money'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { useRapportini, useDeleteRapportino, type RapportinoConDettagli } from './api'

export function RapportiniList() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: rapportini = [], isLoading, isError, error } = useRapportini()
  const deleteM = useDeleteRapportino()

  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<RapportinoConDettagli | null>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rapportini
    return rapportini.filter((r) =>
      `${r.cantiere?.codice ?? ''} ${r.cantiere?.nome ?? ''} ${
        r.dipendente?.nome ?? ''
      } ${r.dipendente?.cognome ?? ''}`
        .toLowerCase()
        .includes(q)
    )
  }, [rapportini, search])

  const totals = useMemo(() => {
    const oreOrd = rapportini.reduce((s, r) => s + r.ore_ord, 0)
    const oreStr = rapportini.reduce((s, r) => s + r.ore_str, 0)
    const costo = rapportini.reduce((s, r) => s + (r.costo_totale ?? 0), 0)
    return { oreOrd, oreStr, costo, count: rapportini.length }
  }, [rapportini])

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Rapportino eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<RapportinoConDettagli>[] = [
    {
      key: 'data',
      label: 'Data',
      width: 110,
      render: (r) => <span className="num text-ink-soft">{formatDate(r.data)}</span>,
    },
    {
      key: 'dipendente',
      label: 'Dipendente',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar
            name={`${r.dipendente?.nome ?? ''} ${r.dipendente?.cognome ?? ''}`}
            size={30}
          />
          <div>
            <div className="font-medium text-ink">
              {r.dipendente?.nome} {r.dipendente?.cognome}
            </div>
            <div className="text-xs text-ink-soft">
              {r.dipendente?.mansione ?? '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'cantiere',
      label: 'Cantiere',
      render: (r) => (
        <div>
          <div className="font-mono text-[12px] text-ink-soft">
            {r.cantiere?.codice}
          </div>
          <div className="text-sm text-ink">{r.cantiere?.nome}</div>
        </div>
      ),
    },
    {
      key: 'ore_ord',
      label: 'Ord.',
      align: 'right',
      width: 70,
      render: (r) => <span className="num">{r.ore_ord}h</span>,
    },
    {
      key: 'ore_str',
      label: 'Str.',
      align: 'right',
      width: 70,
      render: (r) =>
        r.ore_str > 0 ? (
          <span className="num text-warn-deep">{r.ore_str}h</span>
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      key: 'trasferta',
      label: 'Trasferta',
      width: 110,
      render: (r) =>
        r.trasferta ? (
          <Badge tone="navy" icon="map">
            {r.costo_trasferta > 0 ? `€ ${r.costo_trasferta}` : 'sì'}
          </Badge>
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      key: 'costo_totale',
      label: 'Costo',
      align: 'right',
      width: 120,
      render: (r) =>
        r.costo_totale !== undefined ? (
          <Money value={r.costo_totale} decimals={2} bold />
        ) : (
          <span className="text-ink-faint text-xs">n/d</span>
        ),
    },
    {
      key: '_act',
      label: '',
      align: 'right',
      width: 90,
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/rapportini/${r.id}/edit`)
            }}
            className="text-ink-faint hover:text-ink p-1.5 rounded-md hover:bg-line-soft"
            title="Modifica"
          >
            <Icon name="pencil" size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setToDelete(r)
            }}
            className="text-ink-faint hover:text-bad p-1.5 rounded-md hover:bg-bad-soft/40"
            title="Elimina"
          >
            <Icon name="trash-2" size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Rapportini ore"
        banner="Registrazione delle ore lavorate dai dipendenti sui cantieri. Il costo è calcolato sulla tariffa valida alla data."
        actions={
          <Button icon="plus" onClick={() => navigate('/rapportini/new')}>
            Nuovo rapportino
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Rapportini"
          value={String(totals.count)}
          icon="clipboard-list"
          hint="registrati"
        />
        <KPI
          label="Ore totali"
          value={`${totals.oreOrd + totals.oreStr} h`}
          icon="clock"
          hint={`ord. ${totals.oreOrd}h · str. ${totals.oreStr}h`}
        />
        <KPI
          label="Costo manodopera"
          value={`€ ${totals.costo.toLocaleString('it-IT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon="wallet"
          hint="totale registrato"
        />
      </div>

      <Card noPad className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Elenco rapportini
          </h2>
          <div className="relative">
            <Icon
              name="search"
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 pr-3 text-sm border border-line rounded-lg w-64 focus:outline-none focus:border-navy-500"
              placeholder="Cerca dipendente, cantiere…"
            />
          </div>
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
        ) : rows.length === 0 ? (
          <EmptyState
            icon={rapportini.length === 0 ? 'clipboard-list' : 'search-x'}
            title={rapportini.length === 0 ? 'Nessun rapportino' : 'Nessun risultato'}
            description={
              rapportini.length === 0
                ? 'Registra il primo rapportino ore.'
                : 'Nessun rapportino con questa ricerca.'
            }
            action={
              rapportini.length === 0 ? (
                <Button icon="plus" onClick={() => navigate('/rapportini/new')}>
                  Nuovo rapportino
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            columns={cols}
            rows={rows}
            onRowClick={(r) => navigate(`/rapportini/${r.id}/edit`)}
          />
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina rapportino"
        message="Vuoi eliminare questo rapportino? Il costo verrà rimosso dal cantiere."
        confirmLabel="Elimina"
        loading={deleteM.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
