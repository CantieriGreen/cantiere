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
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import type { Cliente, TipoCliente } from '@/lib/types'
import { useClienti, useDeleteCliente } from './api'
import { ClienteForm } from './ClienteForm'
import { TIPO_CLIENTE } from './constants'

type Filtro = 'tutti' | TipoCliente

export function ClientiList() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: clienti = [], isLoading, isError, error } = useClienti()
  const deleteM = useDeleteCliente()

  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [toDelete, setToDelete] = useState<Cliente | null>(null)

  const countByTipo = (t: TipoCliente) =>
    clienti.filter((c) => c.tipo === t).length

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clienti.filter((c) => {
      if (filtro !== 'tutti' && c.tipo !== filtro) return false
      if (
        q &&
        !`${c.ragione_sociale} ${c.referente ?? ''} ${c.citta ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false
      return true
    })
  }, [clienti, filtro, search])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (c: Cliente) => {
    setEditing(c)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Cliente eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error(
        'Impossibile eliminare: ' +
          (e instanceof Error ? e.message : 'errore') +
          (e instanceof Error && e.message.includes('foreign')
            ? ' (ha cantieri collegati)'
            : '')
      )
    }
  }

  const cols: Column<Cliente>[] = [
    {
      key: 'ragione_sociale',
      label: 'Ragione sociale / Nominativo',
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.ragione_sociale} size={32} />
          <div>
            <div className="font-medium text-ink">{r.ragione_sociale}</div>
            <div className="text-xs text-ink-soft">
              {[r.citta, r.provincia].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipologia',
      width: 130,
      render: (r) => {
        const t = TIPO_CLIENTE[r.tipo]
        return (
          <Badge tone={t.tone} icon={t.icon}>
            {t.label}
          </Badge>
        )
      },
    },
    {
      key: 'partita_iva',
      label: 'P. IVA',
      mono: true,
      width: 150,
      render: (r) => r.partita_iva ?? <span className="text-ink-faint">—</span>,
    },
    {
      key: 'referente',
      label: 'Referente',
      render: (r) => (
        <span className="text-ink-soft">{r.referente ?? '—'}</span>
      ),
    },
    {
      key: 'telefono',
      label: 'Telefono',
      width: 150,
      render: (r) => (
        <span className="text-ink-soft text-[13px]">{r.telefono ?? '—'}</span>
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
              openEdit(r)
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
        breadcrumb={['Anagrafiche', 'Clienti']}
        title="Clienti"
        banner="Anagrafica clienti classificati per fase commerciale: Lead (interesse), Prospect (offerta inviata) e Cliente acquisito."
        actions={
          <Button icon="plus" onClick={openNew}>
            Nuovo cliente
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Lead"
          value={String(countByTipo('lead'))}
          tone="warn"
          icon="sparkles"
          hint="interesse manifestato"
        />
        <KPI
          label="Prospect"
          value={String(countByTipo('prospect'))}
          icon="send"
          hint="offerta inviata"
        />
        <KPI
          label="Clienti acquisiti"
          value={String(countByTipo('cliente'))}
          tone="good"
          icon="circle-check"
          hint="con cantieri o storico"
        />
        <KPI
          label="Totale anagrafica"
          value={String(clienti.length)}
          icon="users"
          hint="record presenti"
        />
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-line rounded-lg p-0.5">
          {(
            [
              { id: 'tutti', label: 'Tutti', count: clienti.length },
              { id: 'lead', label: 'Lead', count: countByTipo('lead') },
              { id: 'prospect', label: 'Prospect', count: countByTipo('prospect') },
              { id: 'cliente', label: 'Clienti', count: countByTipo('cliente') },
            ] as { id: Filtro; label: string; count: number }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFiltro(t.id)}
              className={`h-8 px-3 rounded-md text-sm transition inline-flex items-center gap-1.5 ${
                filtro === t.id
                  ? 'bg-navy-600 text-white'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded ${
                  filtro === t.id
                    ? 'bg-white/20'
                    : 'bg-line-soft text-ink-soft'
                }`}
              >
                {t.count}
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
            placeholder="Cerca cliente…"
          />
        </div>
      </div>

      <Card noPad className="overflow-hidden">
        {isLoading ? (
          <LoadingRows />
        ) : isError ? (
          <EmptyState
            icon="circle-alert"
            title="Errore di caricamento"
            description={error instanceof Error ? error.message : 'Errore'}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={clienti.length === 0 ? 'users' : 'search-x'}
            title={
              clienti.length === 0
                ? 'Nessun cliente'
                : 'Nessun risultato'
            }
            description={
              clienti.length === 0
                ? 'Inizia creando il primo cliente.'
                : 'Nessun cliente con questi filtri.'
            }
            action={
              clienti.length === 0 ? (
                <Button icon="plus" onClick={openNew}>
                  Nuovo cliente
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            columns={cols}
            rows={rows}
            onRowClick={(r) => navigate(`/anagrafiche/clienti/${r.id}`)}
          />
        )}
      </Card>

      <ClienteForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        cliente={editing}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina cliente"
        message={
          <>
            Vuoi eliminare <strong>{toDelete?.ragione_sociale}</strong>? L'azione
            non è reversibile.
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

function LoadingRows() {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-line-soft" />
          <div className="flex-1 h-4 bg-line-soft rounded" />
          <div className="w-24 h-4 bg-line-soft rounded" />
        </div>
      ))}
    </div>
  )
}
