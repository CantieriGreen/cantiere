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
import { eu } from '@/lib/utils'
import type { Dipendente, TipoDipendente } from '@/lib/types'
import {
  useDipendenti,
  useDeleteDipendente,
  type DipendenteConTariffa,
} from './api'
import { DipendenteForm } from './DipendenteForm'

type Filtro = 'tutti' | TipoDipendente

export function DipendentiList() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: dipendenti = [], isLoading, isError, error } = useDipendenti()
  const deleteM = useDeleteDipendente()

  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Dipendente | null>(null)
  const [toDelete, setToDelete] = useState<Dipendente | null>(null)

  const countByTipo = (t: TipoDipendente) =>
    dipendenti.filter((d) => d.tipo === t).length
  const countAttivi = dipendenti.filter((d) => d.attivo).length

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return dipendenti.filter((d) => {
      if (filtro !== 'tutti' && d.tipo !== filtro) return false
      if (
        q &&
        !`${d.nome} ${d.cognome} ${d.mansione ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false
      return true
    })
  }, [dipendenti, filtro, search])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (d: Dipendente) => {
    setEditing(d)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Dipendente eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<DipendenteConTariffa>[] = [
    {
      key: 'nome',
      label: 'Dipendente',
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${r.nome} ${r.cognome}`} size={34} />
          <div>
            <div className="font-medium text-ink">
              {r.nome} {r.cognome}
            </div>
            <div className="text-xs text-ink-soft">{r.mansione ?? '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      width: 110,
      render: (r) => (
        <Badge tone={r.tipo === 'ufficio' ? 'info' : 'navy'}>
          {r.tipo === 'ufficio' ? 'Ufficio' : 'Operaio'}
        </Badge>
      ),
    },
    {
      key: 'data_assunzione',
      label: 'In azienda dal',
      width: 140,
      render: (r) => (
        <span className="num text-ink-soft text-xs">
          {r.data_assunzione ? formatDate(r.data_assunzione) : '—'}
        </span>
      ),
    },
    {
      key: 'tariffa',
      label: 'Tariffa ord.',
      align: 'right',
      width: 130,
      render: (r) =>
        r.tariffa ? (
          <span className="num text-ink">
            {eu(r.tariffa.costo_ord, { decimals: 2 })}
            <span className="text-ink-faint">/h</span>
          </span>
        ) : (
          <span className="text-ink-faint text-xs">non impostata</span>
        ),
    },
    {
      key: 'attivo',
      label: 'Stato',
      width: 110,
      render: (r) =>
        r.attivo ? (
          <Badge tone="good" icon="circle-check">
            Attivo
          </Badge>
        ) : (
          <Badge tone="neutral">Sospeso</Badge>
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
        breadcrumb={['Anagrafiche', 'Dipendenti']}
        title="Dipendenti"
        banner="Anagrafica dipendenti con tariffa oraria corrente. Clicca per la scheda con lo storico delle tariffe."
        actions={
          <Button icon="user-plus" onClick={openNew}>
            Nuovo dipendente
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Dipendenti attivi"
          value={String(countAttivi)}
          icon="users"
          hint={`${dipendenti.length} totali in organico`}
        />
        <KPI
          label="Operai"
          value={String(countByTipo('operaio'))}
          icon="hard-hat"
          hint="in cantiere"
        />
        <KPI
          label="Personale ufficio"
          value={String(countByTipo('ufficio'))}
          icon="briefcase"
          hint="amministrativo"
        />
      </div>

      <Card noPad className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-0.5">
            {(
              [
                { id: 'tutti', label: 'Tutti', count: dipendenti.length },
                { id: 'operaio', label: 'Operai', count: countByTipo('operaio') },
                { id: 'ufficio', label: 'Ufficio', count: countByTipo('ufficio') },
              ] as { id: Filtro; label: string; count: number }[]
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`h-8 px-3 rounded-md text-sm transition inline-flex items-center gap-1.5 ${
                  filtro === f.id
                    ? 'bg-white text-ink shadow-card font-medium'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {f.label}
                <span className="text-[11px] text-ink-soft">({f.count})</span>
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
              className="h-9 pl-8 pr-3 text-sm border border-line rounded-lg w-64 focus:outline-none focus:border-navy-500"
              placeholder="Cerca dipendente, mansione…"
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
            icon={dipendenti.length === 0 ? 'users' : 'search-x'}
            title={dipendenti.length === 0 ? 'Nessun dipendente' : 'Nessun risultato'}
            description={
              dipendenti.length === 0
                ? 'Inizia creando il primo dipendente.'
                : 'Nessun dipendente con questi filtri.'
            }
            action={
              dipendenti.length === 0 ? (
                <Button icon="user-plus" onClick={openNew}>
                  Nuovo dipendente
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            columns={cols}
            rows={rows}
            onRowClick={(r) => navigate(`/anagrafiche/dipendenti/${r.id}`)}
          />
        )}
      </Card>

      <DipendenteForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        dipendente={editing}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina dipendente"
        message={
          <>
            Vuoi eliminare{' '}
            <strong>
              {toDelete?.nome} {toDelete?.cognome}
            </strong>
            ? Verranno eliminate anche le sue tariffe. L'azione non è reversibile.
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

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
