import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import type { DocumentoAltro } from '@/lib/types'
import { useDeleteDocumentoAltro, useDocumentiAltro } from './api'
import { DocumentoAltroForm } from './DocumentoAltroForm'
import { ScadenzaCell, StatoBadge } from './ScadenzaCell'
import { InviaAvvisiButton } from './InviaAvvisiButton'
import { prioritaStato, statoScadenza, type StatoScadenza } from './constants'

type Filtro = 'tutti' | 'scaduti' | 'in_scadenza' | 'ok'

type Riga = DocumentoAltro & { stato: StatoScadenza }

/** Proposti nel campo "Nome documento" anche prima del primo inserimento. */
const NOMI_SUGGERITI = ['DURC']

export function AltroScreen() {
  const toast = useToast()
  const { profile } = useAuth()
  const isAdmin = profile?.ruolo === 'admin'
  const { data: documenti = [], isLoading, isError, error } = useDocumentiAltro()
  const deleteM = useDeleteDocumentoAltro()

  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DocumentoAltro | null>(null)
  const [toDelete, setToDelete] = useState<DocumentoAltro | null>(null)

  const righe: Riga[] = useMemo(
    () => documenti.map((d) => ({ ...d, stato: statoScadenza(d.scadenza) })),
    [documenti]
  )

  const suggerimenti = useMemo(
    () =>
      [...new Set([...NOMI_SUGGERITI, ...documenti.map((d) => d.nome_documento)])].sort(
        (a, b) => a.localeCompare(b, 'it')
      ),
    [documenti]
  )

  const count = {
    tutti: righe.length,
    scaduti: righe.filter((r) => r.stato === 'scaduta').length,
    in_scadenza: righe.filter((r) => r.stato === 'urgente' || r.stato === 'in_scadenza').length,
    ok: righe.filter((r) => r.stato === 'ok').length,
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return righe
      .filter((r) => {
        if (filtro === 'scaduti') return r.stato === 'scaduta'
        if (filtro === 'in_scadenza') return r.stato === 'urgente' || r.stato === 'in_scadenza'
        if (filtro === 'ok') return r.stato === 'ok'
        return true
      })
      .filter((r) =>
        !q ? true : `${r.nome_documento} ${r.note ?? ''}`.toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          prioritaStato(a.stato) - prioritaStato(b.stato) || a.scadenza.localeCompare(b.scadenza)
      )
  }, [righe, search, filtro])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (d: DocumentoAltro) => {
    if (!isAdmin) return
    setEditing(d)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Documento eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<Riga>[] = [
    {
      key: 'nome_documento',
      label: 'Documento',
      render: (r) => (
        <div>
          <span className="font-medium text-ink">{r.nome_documento}</span>
          {r.note && <div className="text-xs text-ink-soft mt-0.5">{r.note}</div>}
        </div>
      ),
    },
    {
      key: 'scadenza',
      label: 'Scadenza',
      width: 160,
      render: (r) => <ScadenzaCell data={r.scadenza} />,
    },
    {
      key: 'stato',
      label: 'Stato',
      width: 140,
      render: (r) => <StatoBadge stato={r.stato} />,
    },
    ...(isAdmin
      ? [
          {
            key: '_act',
            label: '',
            align: 'right' as const,
            width: 90,
            render: (r: Riga) => (
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
      : []),
  ]

  const FILTRI: { id: Filtro; label: string }[] = [
    { id: 'tutti', label: 'Tutti' },
    { id: 'scaduti', label: 'Scaduti' },
    { id: 'in_scadenza', label: 'In scadenza' },
    { id: 'ok', label: 'In regola' },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb={['Calendario scadenze', 'Altro']}
        title="Altro"
        banner="DURC e altri documenti aziendali con scadenza. Gli avvisi partono a 14, 7, 3 e 1 giorno dalla scadenza."
        actions={
          isAdmin ? (
            <>
              <InviaAvvisiButton />
              <Button icon="plus" onClick={openNew}>
                Nuovo documento
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPI label="Documenti registrati" value={String(count.tutti)} icon="file-text" />
        <KPI
          label="Scaduti"
          value={String(count.scaduti)}
          icon="circle-x"
          tone={count.scaduti > 0 ? 'bad' : 'good'}
          hint="da rinnovare subito"
        />
        <KPI
          label="In scadenza entro 30 gg"
          value={String(count.in_scadenza)}
          icon="clock"
          tone={count.in_scadenza > 0 ? 'warn' : 'good'}
          hint="da rinnovare a breve"
        />
      </div>

      <Card noPad className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-0.5">
            {FILTRI.map((f) => (
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
                <span className="text-[11px] text-ink-soft">({count[f.id]})</span>
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
              className="h-9 pl-8 pr-3 text-sm border border-line rounded-lg w-72 focus:outline-none focus:border-navy-500"
              placeholder="Cerca per nome documento o note…"
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
            icon={documenti.length === 0 ? 'file-text' : 'search-x'}
            title={documenti.length === 0 ? 'Nessun documento registrato' : 'Nessun risultato'}
            description={
              documenti.length === 0
                ? 'Registra il DURC e gli altri documenti aziendali che hanno una scadenza.'
                : 'Nessun documento con questa ricerca o filtro.'
            }
            action={
              documenti.length === 0 && isAdmin ? (
                <Button icon="plus" onClick={openNew}>
                  Nuovo documento
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table columns={cols} rows={rows} onRowClick={isAdmin ? openEdit : undefined} />
        )}
      </Card>

      <DocumentoAltroForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        documento={editing}
        suggerimenti={suggerimenti}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina documento"
        message={
          <>
            Vuoi eliminare <strong>{toDelete?.nome_documento}</strong>? Se l'hai rinnovato,
            puoi anche solo aggiornare la data di scadenza.
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
