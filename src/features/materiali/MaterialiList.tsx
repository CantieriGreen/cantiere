import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Money } from '@/components/ui/Money'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import {
  useMateriali,
  useDeleteMateriale,
  type MaterialeConDettagli,
} from './api'
import { MaterialeForm } from './MaterialeForm'
import { FicInboxPassive } from '@/features/ricavi/FicInboxPassive'
import { useFicSync } from '@/features/ricavi/fic-api'

export function MaterialiList() {
  const toast = useToast()
  const { profile } = useAuth()
  const isAdmin = profile?.ruolo === 'admin'
  const { data: materiali = [], isLoading, isError, error } = useMateriali()
  const deleteM = useDeleteMateriale()
  const syncM = useFicSync()

  const sincronizza = async () => {
    try {
      const r = await syncM.mutateAsync()
      toast.success(
        `Sincronizzate · passive ${r.passive.importate} nuove, attive ${r.attive.importate} nuove`
      )
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MaterialeConDettagli | null>(null)
  const [toDelete, setToDelete] = useState<MaterialeConDettagli | null>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return materiali
    return materiali.filter((m) =>
      `${m.descrizione} ${m.cantiere?.codice ?? ''} ${m.cantiere?.nome ?? ''} ${
        m.fornitore?.ragione_sociale ?? ''
      }`
        .toLowerCase()
        .includes(q)
    )
  }, [materiali, search])

  const totale = useMemo(
    () => materiali.reduce((s, m) => s + m.importo_totale, 0),
    [materiali]
  )
  const fornitoriDistinti = useMemo(
    () => new Set(materiali.map((m) => m.fornitore_id).filter(Boolean)).size,
    [materiali]
  )

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (m: MaterialeConDettagli) => {
    setEditing(m)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Movimento eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<MaterialeConDettagli>[] = [
    {
      key: 'data',
      label: 'Data',
      width: 100,
      render: (r) => <span className="num text-ink-soft">{formatDate(r.data)}</span>,
    },
    {
      key: 'descrizione',
      label: 'Materiale',
      render: (r) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-ink">{r.descrizione}</span>
            {r.origine === 'fattureincloud' && (
              <Badge tone="navy" icon="cloud">
                FIC
              </Badge>
            )}
          </div>
          <div className="text-xs text-ink-soft">
            {r.tipo_materiale?.nome ?? '—'}
            {r.riferimento_documento ? ` · ${r.riferimento_documento}` : ''}
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
      key: 'fornitore',
      label: 'Fornitore',
      render: (r) => (
        <span className="text-ink-soft text-sm">
          {r.fornitore?.ragione_sociale ?? '—'}
        </span>
      ),
    },
    {
      key: 'quantita',
      label: 'Q.tà',
      align: 'right',
      width: 100,
      render: (r) => (
        <span className="num text-ink-soft">
          {r.quantita} {r.unita_misura ?? ''}
        </span>
      ),
    },
    {
      key: 'importo_totale',
      label: 'Importo',
      align: 'right',
      width: 120,
      render: (r) => <Money value={r.importo_totale} decimals={2} bold />,
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
        title="Materiali"
        banner="Acquisti di materiali imputati ai cantieri. L'importo contribuisce ai costi diretti della commessa."
        actions={
          <>
            {isAdmin && (
              <Button
                variant="secondary"
                icon={syncM.isPending ? 'loader-circle' : 'refresh-cw'}
                onClick={sincronizza}
                disabled={syncM.isPending}
              >
                Sincronizza fatture
              </Button>
            )}
            <Button icon="plus" onClick={openNew}>
              Nuovo materiale
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Movimenti"
          value={String(materiali.length)}
          icon="package"
          hint="registrati"
        />
        <KPI
          label="Spesa materiali"
          value={`€ ${totale.toLocaleString('it-IT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon="wallet"
          hint="totale imputato"
        />
        <KPI
          label="Fornitori coinvolti"
          value={String(fornitoriDistinti)}
          icon="truck"
          hint="distinti"
        />
      </div>

      {isAdmin && <FicInboxPassive />}

      <Card noPad className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Elenco movimenti
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
              placeholder="Cerca materiale, cantiere, fornitore…"
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
            icon={materiali.length === 0 ? 'package' : 'search-x'}
            title={materiali.length === 0 ? 'Nessun materiale' : 'Nessun risultato'}
            description={
              materiali.length === 0
                ? 'Registra il primo acquisto di materiale.'
                : 'Nessun movimento con questa ricerca.'
            }
            action={
              materiali.length === 0 ? (
                <Button icon="plus" onClick={openNew}>
                  Nuovo materiale
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table columns={cols} rows={rows} onRowClick={openEdit} />
        )}
      </Card>

      <MaterialeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        materiale={editing}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina movimento"
        message={
          <>
            Vuoi eliminare <strong>{toDelete?.descrizione}</strong>? Il costo
            verrà rimosso dal cantiere.
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
