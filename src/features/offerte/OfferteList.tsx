import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Money } from '@/components/ui/Money'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { eu, pct as fmtPct } from '@/lib/utils'
import type { StatoOfferta } from '@/lib/types'
import {
  useOfferte,
  useCambiaStatoOfferta,
  useDeleteOfferta,
  type OffertaConCliente,
} from './api'
import { StatoOffertaSelect } from './StatoOffertaSelect'

type Filtro = 'tutti' | StatoOfferta

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

export function OfferteList() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: offerte = [], isLoading, isError, error } = useOfferte()
  const cambiaStatoM = useCambiaStatoOfferta()
  const deleteM = useDeleteOfferta()

  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<OffertaConCliente | null>(null)

  const tot = offerte.reduce((s, o) => s + o.importo, 0)
  const vinte = offerte.filter((o) => o.stato === 'ok')
  const inviate = offerte.filter((o) => o.stato === 'inviata')
  const decise = offerte.filter((o) => o.stato !== 'inviata')
  const winRate = decise.length ? (vinte.length / decise.length) * 100 : 0

  const countByStato = (s: StatoOfferta) =>
    offerte.filter((o) => o.stato === s).length

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return offerte.filter((o) => {
      if (filtro !== 'tutti' && o.stato !== filtro) return false
      if (
        q &&
        !`${o.titolo} ${o.cliente?.ragione_sociale ?? o.cliente_nome ?? ''} ${o.numero}`
          .toLowerCase()
          .includes(q)
      )
        return false
      return true
    })
  }, [offerte, filtro, search])

  const changeStato = async (id: string, stato: StatoOfferta) => {
    try {
      await cambiaStatoM.mutateAsync({ id, stato })
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Offerta eliminata')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const cols: Column<OffertaConCliente>[] = [
    {
      key: 'numero',
      label: 'Offerta',
      width: 180,
      render: (r) => (
        <div>
          <div className="font-mono text-[12px] text-ink">{r.numero}</div>
          <div className="text-[11px] text-ink-faint mt-0.5">
            {formatDate(r.data)}
          </div>
        </div>
      ),
    },
    {
      key: 'titolo',
      label: 'Titolo',
      render: (r) => <span className="font-medium text-ink">{r.titolo}</span>,
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (r) => (
        <span className="text-ink-soft">
          {r.cliente?.ragione_sociale ?? r.cliente_nome ?? '—'}
        </span>
      ),
    },
    {
      key: 'importo',
      label: 'Importo',
      align: 'right',
      width: 130,
      render: (r) => <Money value={r.importo} bold />,
    },
    {
      key: 'stato',
      label: 'Stato',
      width: 200,
      render: (r) => (
        <StatoOffertaSelect
          value={r.stato}
          onChange={(s) => changeStato(r.id, s)}
        />
      ),
    },
    {
      key: '_act',
      label: '',
      align: 'right',
      width: 60,
      render: (r) => (
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
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Offerte"
        banner="Preventivi inviati ai clienti. Aggiorna lo stato della trattativa, genera il documento Word e converti l'offerta accettata in cantiere."
        actions={
          <Button icon="plus" onClick={() => navigate('/offerte/new')}>
            Nuova offerta
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Offerte totali"
          value={String(offerte.length)}
          icon="file-text"
          hint={`valore ${eu(tot)}`}
        />
        <KPI
          label="In trattativa"
          value={String(inviate.length)}
          tone="warn"
          icon="send"
          hint={`valore ${eu(inviate.reduce((s, o) => s + o.importo, 0))}`}
        />
        <KPI
          label="Accettate"
          value={String(vinte.length)}
          tone="good"
          icon="circle-check"
          hint={`valore ${eu(vinte.reduce((s, o) => s + o.importo, 0))}`}
        />
        <KPI
          label="Tasso di successo"
          value={fmtPct(winRate, 0)}
          tone={winRate >= 50 ? 'good' : 'warn'}
          icon="trending-up"
          hint="sulle offerte decise"
        />
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-line rounded-lg p-0.5">
          {(
            [
              { id: 'tutti', label: 'Tutte', count: offerte.length },
              { id: 'inviata', label: 'In trattativa', count: countByStato('inviata') },
              { id: 'ok', label: 'Accettate', count: countByStato('ok') },
              { id: 'ko', label: 'Rifiutate', count: countByStato('ko') },
            ] as { id: Filtro; label: string; count: number }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`h-8 px-3 rounded-md text-sm transition inline-flex items-center gap-1.5 ${
                filtro === f.id
                  ? 'bg-navy-600 text-white'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {f.label}
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded ${
                  filtro === f.id ? 'bg-white/20' : 'bg-line-soft text-ink-soft'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
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
            placeholder="Cerca offerta, cliente, numero…"
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
            icon={offerte.length === 0 ? 'file-pen' : 'search-x'}
            title={offerte.length === 0 ? 'Nessuna offerta' : 'Nessun risultato'}
            description={
              offerte.length === 0
                ? 'Crea la prima offerta commerciale.'
                : 'Nessuna offerta con questi filtri.'
            }
            action={
              offerte.length === 0 ? (
                <Button icon="plus" onClick={() => navigate('/offerte/new')}>
                  Nuova offerta
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            columns={cols}
            rows={rows}
            onRowClick={(r) => navigate(`/offerte/${r.id}`)}
          />
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina offerta"
        message={
          <>
            Vuoi eliminare l'offerta <strong>{toDelete?.numero}</strong>? Verranno
            eliminate anche le sue revisioni e voci.
          </>
        }
        confirmLabel="Elimina"
        loading={deleteM.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
