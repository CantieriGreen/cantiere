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
import { eu } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import type { StatoRicavo } from '@/lib/types'
import { useRicavi, useDeleteRicavo, type RicavoConDettagli } from './api'
import { RicavoForm } from './RicavoForm'
import { FicInbox } from './FicInbox'
import { useFicSync } from './fic-api'
import { STATO_RICAVO, TIPO_RICAVO_LABEL } from './constants'

type Filtro = 'tutti' | StatoRicavo

export function RicaviList() {
  const toast = useToast()
  const { profile } = useAuth()
  const isAdmin = profile?.ruolo === 'admin'
  const { data: ricavi = [], isLoading, isError, error } = useRicavi()
  const deleteM = useDeleteRicavo()
  const syncM = useFicSync()

  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RicavoConDettagli | null>(null)
  const [toDelete, setToDelete] = useState<RicavoConDettagli | null>(null)

  const sincronizza = async () => {
    try {
      const r = await syncM.mutateAsync()
      toast.success(
        `Sincronizzate · attive ${r.attive.importate} nuove, passive ${r.passive.importate} nuove`
      )
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const sumByStato = (s: StatoRicavo) =>
    ricavi.filter((r) => r.stato === s).reduce((acc, r) => acc + r.importo, 0)
  const countByStato = (s: StatoRicavo) =>
    ricavi.filter((r) => r.stato === s).length

  const totFatturato = ricavi.reduce((s, r) => s + r.importo, 0)

  const rows = useMemo(() => {
    if (filtro === 'tutti') return ricavi
    return ricavi.filter((r) => r.stato === filtro)
  }, [ricavi, filtro])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (r: RicavoConDettagli) => {
    if (r.origine === 'fattureincloud') {
      toast.info('Ricavo gestito da Fatture in Cloud: si aggiorna alla sincronizzazione.')
      return
    }
    setEditing(r)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Ricavo eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<RicavoConDettagli>[] = [
    {
      key: 'numero_documento',
      label: 'Documento',
      width: 150,
      render: (r) => (
        <div>
          <div className="font-mono text-[12px] text-ink">
            {r.numero_documento ?? '—'}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge tone="neutral">{TIPO_RICAVO_LABEL[r.tipo]}</Badge>
            {r.origine === 'fattureincloud' && (
              <Badge tone="navy" icon="cloud">
                FIC
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'data',
      label: 'Data',
      width: 100,
      render: (r) => <span className="num text-ink-soft">{formatDate(r.data)}</span>,
    },
    {
      key: 'cantiere',
      label: 'Cantiere',
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.cantiere?.nome}</div>
          <div className="text-xs text-ink-faint font-mono">
            {r.cantiere?.codice}
            {r.cantiere?.cliente?.ragione_sociale
              ? ` · ${r.cantiere.cliente.ragione_sociale}`
              : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'scadenza',
      label: 'Scadenza',
      width: 110,
      render: (r) => (
        <span className="num text-ink-soft text-xs">
          {r.scadenza ? formatDate(r.scadenza) : '—'}
        </span>
      ),
    },
    {
      key: 'importo',
      label: 'Importo',
      align: 'right',
      width: 120,
      render: (r) => <Money value={r.importo} bold />,
    },
    {
      key: 'stato',
      label: 'Stato',
      width: 130,
      render: (r) => {
        const s = STATO_RICAVO[r.stato]
        return (
          <Badge tone={s.tone} icon={s.icon}>
            {s.label}
          </Badge>
        )
      },
    },
    {
      key: '_act',
      label: '',
      align: 'right',
      width: 90,
      render: (r) =>
        r.origine === 'fattureincloud' ? (
          <span
            className="inline-flex items-center text-ink-faint"
            title="Gestita da Fatture in Cloud · si aggiorna alla sincronizzazione"
          >
            <Icon name="lock" size={14} />
          </span>
        ) : (
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
        title="Ricavi"
        banner="SAL (Stati Avanzamento Lavori) e fatture attive, con stato di incasso e scadenze."
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
              Nuovo ricavo
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Fatturato totale"
          value={eu(totFatturato)}
          icon="receipt"
          hint={`${ricavi.length} documenti`}
        />
        <KPI
          label="Incassato"
          value={eu(sumByStato('pagato'))}
          tone="good"
          icon="circle-check"
          hint={`${countByStato('pagato')} pagati`}
        />
        <KPI
          label="In attesa"
          value={eu(sumByStato('in_attesa'))}
          tone="warn"
          icon="clock"
          hint={`${countByStato('in_attesa')} documenti`}
        />
        <KPI
          label="Scaduto"
          value={eu(sumByStato('scaduto'))}
          tone="bad"
          icon="circle-alert"
          hint={`${countByStato('scaduto')} da sollecitare`}
        />
      </div>

      {isAdmin && <FicInbox />}

      <Card noPad className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-0.5">
            {(
              [
                { id: 'tutti', label: 'Tutti', count: ricavi.length },
                { id: 'pagato', label: 'Pagati', count: countByStato('pagato') },
                { id: 'in_attesa', label: 'In attesa', count: countByStato('in_attesa') },
                { id: 'scaduto', label: 'Scaduti', count: countByStato('scaduto') },
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
            icon={ricavi.length === 0 ? 'receipt' : 'search-x'}
            title={ricavi.length === 0 ? 'Nessun ricavo' : 'Nessun risultato'}
            description={
              ricavi.length === 0
                ? 'Registra il primo SAL o fattura attiva.'
                : 'Nessun ricavo con questo filtro.'
            }
            action={
              ricavi.length === 0 ? (
                <Button icon="plus" onClick={openNew}>
                  Nuovo ricavo
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            columns={cols}
            rows={rows}
            onRowClick={openEdit}
            footer={{
              numero_documento: (
                <span className="text-ink-soft text-xs uppercase tracking-wide">
                  Totale {rows.length} doc.
                </span>
              ),
              importo: (
                <Money value={rows.reduce((s, r) => s + r.importo, 0)} bold />
              ),
            }}
          />
        )}
      </Card>

      <RicavoForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        ricavo={editing}
      />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina ricavo"
        message="Vuoi eliminare questo ricavo? Verrà rimosso dal cantiere."
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
