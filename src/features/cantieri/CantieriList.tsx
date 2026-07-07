import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Money, Pct } from '@/components/ui/Money'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import type { Cantiere, StatoCantiere } from '@/lib/types'
import {
  useCantieri,
  useDeleteCantiere,
  useToggleManutenzione,
  type CantiereConMargini,
} from './api'
import { CantiereForm } from './CantiereForm'
import { STATO_CANTIERE } from './constants'

type Filtro = 'tutti' | StatoCantiere

export function CantieriList() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: cantieri = [], isLoading, isError, error } = useCantieri()
  const deleteM = useDeleteCantiere()
  const toggleM = useToggleManutenzione()

  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Cantiere | null>(null)
  const [toDelete, setToDelete] = useState<Cantiere | null>(null)

  // Solo cantieri commessa (non in sola manutenzione? Qui mostriamo tutti i commessa)
  const base = cantieri

  const countByStato = (s: StatoCantiere) =>
    base.filter((c) => c.stato === s).length

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return base.filter((c) => {
      if (filtro !== 'tutti' && c.stato !== filtro) return false
      if (
        q &&
        !`${c.nome} ${c.cliente?.ragione_sociale ?? ''} ${c.codice}`
          .toLowerCase()
          .includes(q)
      )
        return false
      return true
    })
  }, [base, filtro, search])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (c: Cantiere) => {
    setEditing(c)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Cantiere eliminato')
      setToDelete(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'errore'
      toast.error(
        msg.includes('foreign') || msg.includes('violates')
          ? 'Impossibile eliminare: ci sono rapportini, materiali o ricavi collegati.'
          : 'Errore: ' + msg
      )
    }
  }

  const toggleManut = async (c: CantiereConMargini) => {
    try {
      await toggleM.mutateAsync({ id: c.id, manutenzione: !c.manutenzione })
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

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
      key: 'manutenzione',
      label: 'Manut.',
      align: 'center',
      width: 90,
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleManut(r)
          }}
          title={
            r.manutenzione
              ? 'Manutenzione attiva — clicca per disattivare'
              : 'Attiva manutenzione'
          }
          className="inline-flex items-center"
        >
          <span
            className={`relative w-9 h-5 rounded-full transition-colors ${
              r.manutenzione ? 'bg-good' : 'bg-line-strong'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                r.manutenzione ? 'translate-x-4' : ''
              }`}
            />
          </span>
        </button>
      ),
    },
    {
      key: 'avanzamento',
      label: 'Avanzamento',
      width: 160,
      render: (r) => {
        const ricavi = r.margini?.ricavi ?? 0
        const adv =
          r.valore_contratto > 0
            ? Math.min(100, (ricavi / r.valore_contratto) * 100)
            : 0
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-line-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-navy-600 rounded-full"
                style={{ width: `${adv}%` }}
              />
            </div>
            <span className="text-xs num text-ink-soft min-w-[34px] text-right">
              {adv.toFixed(0)}%
            </span>
          </div>
        )
      },
    },
    {
      key: 'valore_contratto',
      label: 'Contratto',
      align: 'right',
      width: 120,
      render: (r) => <Money value={r.valore_contratto} />,
    },
    {
      key: 'margine',
      label: 'Margine',
      align: 'right',
      width: 110,
      render: (r) => {
        const mp = r.margini?.margine_pieno ?? 0
        const ricavi = r.margini?.ricavi ?? 0
        const pct = ricavi > 0 ? (mp / ricavi) * 100 : 0
        return <Pct value={pct} />
      },
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
        title="Cantieri commessa"
        banner="Cantieri a commessa (lavori su contratto). Usa l'interruttore «Manut.» per segnalare un cantiere anche in gestione manutenzione."
        actions={
          <Button icon="plus" onClick={openNew}>
            Nuovo cantiere
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-line rounded-lg p-0.5">
          {(
            [
              { id: 'tutti', label: 'Tutti', count: base.length },
              { id: 'in_corso', label: 'In corso', count: countByStato('in_corso') },
              { id: 'in_ritardo', label: 'In ritardo', count: countByStato('in_ritardo') },
              { id: 'pianificato', label: 'Pianificati', count: countByStato('pianificato') },
              { id: 'chiuso', label: 'Chiusi', count: countByStato('chiuso') },
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
            icon={base.length === 0 ? 'hard-hat' : 'search-x'}
            title={base.length === 0 ? 'Nessun cantiere' : 'Nessun risultato'}
            description={
              base.length === 0
                ? 'Inizia creando il primo cantiere commessa.'
                : 'Nessun cantiere con questi filtri.'
            }
            action={
              base.length === 0 ? (
                <Button icon="plus" onClick={openNew}>
                  Nuovo cantiere
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
        cantiere={editing}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina cantiere"
        message={
          <>
            Vuoi eliminare <strong>{toDelete?.nome}</strong> ({toDelete?.codice})?
            L'azione non è reversibile.
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
