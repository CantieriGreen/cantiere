import { useMemo, useState } from 'react'
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
import { useAuth } from '@/lib/auth'
import type { Mezzo } from '@/lib/types'
import { useDeleteMezzo, useMezzi } from './api'
import { MezzoForm } from './MezzoForm'
import { ScadenzaCell, StatoBadge } from './ScadenzaCell'
import { InviaAvvisiButton } from './InviaAvvisiButton'
import { prioritaStato, statoPeggiore, type StatoScadenza } from './constants'

type Filtro = 'tutti' | 'scaduti' | 'in_scadenza' | 'ok' | 'dismessi'

type Riga = Mezzo & { stato: StatoScadenza }

export function MezziScreen() {
  const toast = useToast()
  const { profile } = useAuth()
  const isAdmin = profile?.ruolo === 'admin'
  const { data: mezzi = [], isLoading, isError, error } = useMezzi()
  const deleteM = useDeleteMezzo()

  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Mezzo | null>(null)
  const [toDelete, setToDelete] = useState<Mezzo | null>(null)

  const righe: Riga[] = useMemo(
    () =>
      mezzi.map((m) => ({
        ...m,
        stato: statoPeggiore([
          m.scadenza_assicurazione,
          m.scadenza_bollo,
          m.scadenza_revisione,
        ]),
      })),
    [mezzi]
  )

  const attivi = righe.filter((r) => r.attivo)
  const count = {
    tutti: attivi.length,
    scaduti: attivi.filter((r) => r.stato === 'scaduta').length,
    in_scadenza: attivi.filter((r) => r.stato === 'urgente' || r.stato === 'in_scadenza').length,
    ok: attivi.filter((r) => r.stato === 'ok' || r.stato === 'assente').length,
    dismessi: righe.length - attivi.length,
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return righe
      .filter((r) => {
        if (filtro === 'dismessi') return !r.attivo
        if (!r.attivo) return false
        if (filtro === 'scaduti') return r.stato === 'scaduta'
        if (filtro === 'in_scadenza') return r.stato === 'urgente' || r.stato === 'in_scadenza'
        if (filtro === 'ok') return r.stato === 'ok' || r.stato === 'assente'
        return true
      })
      .filter((r) =>
        !q
          ? true
          : `${r.tipo_mezzo} ${r.targa ?? ''} ${r.descrizione ?? ''} ${r.note ?? ''}`
              .toLowerCase()
              .includes(q)
      )
      .sort((a, b) => prioritaStato(a.stato) - prioritaStato(b.stato))
  }, [righe, search, filtro])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (m: Mezzo) => {
    if (!isAdmin) return
    setEditing(m)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Mezzo eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<Riga>[] = [
    {
      key: 'tipo_mezzo',
      label: 'Mezzo',
      render: (r) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{r.tipo_mezzo}</span>
            {r.targa && (
              <span className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-line-soft text-ink">
                {r.targa}
              </span>
            )}
            {!r.attivo && <Badge tone="neutral">Dismesso</Badge>}
          </div>
          {r.descrizione && <div className="text-xs text-ink-soft mt-0.5">{r.descrizione}</div>}
        </div>
      ),
    },
    {
      key: 'scadenza_assicurazione',
      label: 'Assicurazione',
      width: 140,
      render: (r) => <ScadenzaCell data={r.scadenza_assicurazione} />,
    },
    {
      key: 'scadenza_bollo',
      label: 'Bollo',
      width: 140,
      render: (r) => <ScadenzaCell data={r.scadenza_bollo} />,
    },
    {
      key: 'scadenza_revisione',
      label: 'Revisione',
      width: 140,
      render: (r) => <ScadenzaCell data={r.scadenza_revisione} />,
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
    { id: 'dismessi', label: 'Dismessi' },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb={['Calendario scadenze', 'Mezzi']}
        title="Mezzi"
        banner="Scadenze di assicurazione, bollo e revisione dei mezzi aziendali. Gli avvisi partono a 14, 7, 3 e 1 giorno dalla scadenza."
        actions={
          isAdmin ? (
            <>
              <InviaAvvisiButton />
              <Button icon="plus" onClick={openNew}>
                Nuovo mezzo
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPI label="Mezzi in uso" value={String(count.tutti)} icon="car" hint={`${count.dismessi} dismessi`} />
        <KPI
          label="Con scadenze superate"
          value={String(count.scaduti)}
          icon="circle-x"
          tone={count.scaduti > 0 ? 'bad' : 'good'}
          hint="assicurazione, bollo o revisione"
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
              placeholder="Cerca per tipo, targa, descrizione…"
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
            icon={mezzi.length === 0 ? 'car' : 'search-x'}
            title={mezzi.length === 0 ? 'Nessun mezzo registrato' : 'Nessun risultato'}
            description={
              mezzi.length === 0
                ? 'Registra i mezzi aziendali con le loro scadenze.'
                : 'Nessun mezzo con questa ricerca o filtro.'
            }
            action={
              mezzi.length === 0 && isAdmin ? (
                <Button icon="plus" onClick={openNew}>
                  Nuovo mezzo
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table columns={cols} rows={rows} onRowClick={isAdmin ? openEdit : undefined} />
        )}
      </Card>

      <MezzoForm open={formOpen} onClose={() => setFormOpen(false)} mezzo={editing} />

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina mezzo"
        message={
          <>
            Vuoi eliminare <strong>{toDelete?.tipo_mezzo}</strong>
            {toDelete?.targa ? ` (${toDelete.targa})` : ''}? Se il mezzo è stato
            venduto o dismesso puoi anche solo disattivarlo, per conservarne lo storico.
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
