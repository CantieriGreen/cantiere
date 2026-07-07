import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import type { Fornitore } from '@/lib/types'
import { useFornitori, useDeleteFornitore } from './api'
import { FornitoreForm } from './FornitoreForm'
import { StarRating } from './StarRating'

export function FornitoriList() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: fornitori = [], isLoading, isError, error } = useFornitori()
  const deleteM = useDeleteFornitore()

  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Fornitore | null>(null)
  const [toDelete, setToDelete] = useState<Fornitore | null>(null)

  const categorie = useMemo(() => {
    const set = new Set<string>()
    fornitori.forEach((f) => f.categoria && set.add(f.categoria))
    return Array.from(set).sort()
  }, [fornitori])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return fornitori.filter((f) => {
      if (categoria !== 'all' && f.categoria !== categoria) return false
      if (
        q &&
        !`${f.ragione_sociale} ${f.categoria ?? ''} ${f.referente ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false
      return true
    })
  }, [fornitori, search, categoria])

  const valutazioneMedia = useMemo(() => {
    const valued = fornitori.filter((f) => (f.valutazione ?? 0) > 0)
    if (!valued.length) return null
    return valued.reduce((s, f) => s + (f.valutazione ?? 0), 0) / valued.length
  }, [fornitori])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (f: Fornitore) => {
    setEditing(f)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Fornitore eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<Fornitore>[] = [
    {
      key: 'ragione_sociale',
      label: 'Fornitore',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-navy-50 text-navy-600 flex items-center justify-center shrink-0">
            <Icon name="truck" size={15} />
          </div>
          <div>
            <div className="font-medium text-ink">{r.ragione_sociale}</div>
            <div className="text-xs text-ink-soft">{r.categoria ?? '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'partita_iva',
      label: 'P. IVA',
      mono: true,
      width: 150,
      render: (r) => r.partita_iva ?? <span className="text-ink-faint">—</span>,
    },
    {
      key: 'condizioni_pagamento',
      label: 'Pagamento',
      width: 140,
      render: (r) =>
        r.condizioni_pagamento ? (
          <Badge tone="neutral">{r.condizioni_pagamento}</Badge>
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      key: 'valutazione',
      label: 'Valutazione',
      width: 140,
      render: (r) =>
        r.valutazione ? (
          <StarRating value={r.valutazione} size={13} />
        ) : (
          <span className="text-ink-faint text-xs">non valutato</span>
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
        breadcrumb={['Anagrafiche', 'Fornitori']}
        title="Fornitori"
        banner="Anagrafica fornitori con categoria, condizioni di pagamento e valutazione qualità/affidabilità."
        actions={
          <Button icon="plus" onClick={openNew}>
            Nuovo fornitore
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Fornitori"
          value={String(fornitori.length)}
          icon="truck"
          hint="record in anagrafica"
        />
        <KPI
          label="Categorie"
          value={String(categorie.length)}
          icon="tag"
          hint="merceologiche distinte"
        />
        <KPI
          label="Valutazione media"
          value={valutazioneMedia ? `${valutazioneMedia.toFixed(1)} / 5` : '—'}
          icon="star"
          tone={valutazioneMedia && valutazioneMedia >= 4 ? 'good' : 'neutral'}
          hint="sui fornitori valutati"
        />
      </div>

      <Card noPad className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-[15px] font-semibold text-ink">Elenco fornitori</h2>
          <div className="flex items-center gap-2">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="h-9 px-3 text-sm border border-line rounded-lg bg-white focus:outline-none focus:border-navy-500"
            >
              <option value="all">Tutte le categorie</option>
              {categorie.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="relative">
              <Icon
                name="search"
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 pr-3 text-sm border border-line rounded-lg w-52 focus:outline-none focus:border-navy-500"
                placeholder="Cerca fornitore…"
              />
            </div>
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
            icon={fornitori.length === 0 ? 'truck' : 'search-x'}
            title={fornitori.length === 0 ? 'Nessun fornitore' : 'Nessun risultato'}
            description={
              fornitori.length === 0
                ? 'Inizia creando il primo fornitore.'
                : 'Nessun fornitore con questi filtri.'
            }
            action={
              fornitori.length === 0 ? (
                <Button icon="plus" onClick={openNew}>
                  Nuovo fornitore
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            columns={cols}
            rows={rows}
            onRowClick={(r) => navigate(`/anagrafiche/fornitori/${r.id}`)}
          />
        )}
      </Card>

      <FornitoreForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        fornitore={editing}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina fornitore"
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
