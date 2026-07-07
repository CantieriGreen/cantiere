import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { Money } from '@/components/ui/Money'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { eu, pct as fmtPct } from '@/lib/utils'
import {
  useRapportini,
  useDeleteRapportino,
  type RapportinoConDettagli,
} from '@/features/rapportini/api'
import {
  useMateriali,
  useDeleteMateriale,
  type MaterialeConDettagli,
} from '@/features/materiali/api'
import { MaterialeForm } from '@/features/materiali/MaterialeForm'
import {
  useRicavi,
  useDeleteRicavo,
  type RicavoConDettagli,
} from '@/features/ricavi/api'
import { RicavoForm } from '@/features/ricavi/RicavoForm'
import { STATO_RICAVO, TIPO_RICAVO_LABEL } from '@/features/ricavi/constants'
import { useQuoteIndiretti } from './api'
import {
  useAllegati,
  useUploadAllegato,
  useDeleteAllegato,
  downloadAllegato,
  type AllegatoCantiere,
} from './allegati-api'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

function TabLoader() {
  return (
    <div className="p-10 text-center">
      <Icon name="loader-circle" size={22} className="animate-spin text-navy-600 mx-auto" />
    </div>
  )
}

// ============================================================
// TAB MANODOPERA
// ============================================================
export function TabManodopera({ cantiereId }: { cantiereId: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: rows = [], isLoading } = useRapportini({ cantiereId })
  const deleteM = useDeleteRapportino()
  const [toDelete, setToDelete] = useState<RapportinoConDettagli | null>(null)

  const totOre = rows.reduce((s, r) => s + r.ore_ord, 0)
  const totStr = rows.reduce((s, r) => s + r.ore_str, 0)
  const totCosto = rows.reduce((s, r) => s + (r.costo_totale ?? 0), 0)

  const cols: Column<RapportinoConDettagli>[] = [
    { key: 'data', label: 'Data', width: 100, render: (r) => <span className="num text-ink-soft text-xs">{formatDate(r.data)}</span> },
    {
      key: 'dipendente',
      label: 'Dipendente',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={`${r.dipendente?.nome ?? ''} ${r.dipendente?.cognome ?? ''}`} size={28} />
          <span className="font-medium text-ink">
            {r.dipendente?.nome} {r.dipendente?.cognome}
          </span>
        </div>
      ),
    },
    { key: 'ore_ord', label: 'Ord.', align: 'right', width: 80, render: (r) => <span className="num">{r.ore_ord}h</span> },
    { key: 'ore_str', label: 'Str.', align: 'right', width: 80, render: (r) => r.ore_str > 0 ? <span className="num text-warn-deep font-medium">{r.ore_str}h</span> : <span className="text-ink-faint">—</span> },
    { key: 'extra', label: 'Trasf./viaggio', align: 'right', width: 120, render: (r) => {
      const extra = (r.costo_trasferta ?? 0) + (r.diaria ?? 0) + (r.costo_viaggio ?? 0)
      return extra > 0 ? <Money value={extra} decimals={2} /> : <span className="text-ink-faint">—</span>
    } },
    { key: 'costo_totale', label: 'Costo totale', align: 'right', width: 130, render: (r) => r.costo_totale !== undefined ? <Money value={r.costo_totale} decimals={2} bold /> : <span className="text-ink-faint">n/d</span> },
    {
      key: '_act', label: '', align: 'right', width: 70,
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button onClick={() => navigate(`/rapportini/${r.id}/edit`)} className="text-ink-faint hover:text-ink p-1"><Icon name="pencil" size={14} /></button>
          <button onClick={() => setToDelete(r)} className="text-ink-faint hover:text-bad p-1"><Icon name="trash-2" size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-line bg-canvas/40">
        <div className="text-sm text-ink-soft">
          <span className="font-medium text-ink">{rows.length} rapportini</span> ·{' '}
          {totOre + totStr} ore totali
        </div>
        <Button icon="plus" size="sm" onClick={() => navigate(`/rapportini/new?cantiere=${cantiereId}`)}>
          Nuovo rapportino
        </Button>
      </div>
      {isLoading ? (
        <TabLoader />
      ) : rows.length === 0 ? (
        <EmptyState icon="clipboard-list" title="Nessun rapportino" description="Registra le ore lavorate su questo cantiere." />
      ) : (
        <Table
          columns={cols}
          rows={rows}
          footer={{
            data: <span className="text-ink-soft text-xs uppercase tracking-wide">Totali</span>,
            ore_ord: <span className="num">{totOre}h</span>,
            ore_str: <span className="num">{totStr}h</span>,
            costo_totale: <Money value={totCosto} decimals={2} bold />,
          }}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina rapportino"
        message="Vuoi eliminare questo rapportino?"
        confirmLabel="Elimina"
        loading={deleteM.isPending}
        onConfirm={async () => {
          if (!toDelete) return
          try {
            await deleteM.mutateAsync(toDelete.id)
            toast.success('Rapportino eliminato')
            setToDelete(null)
          } catch (e) {
            toast.error('Errore: ' + (e instanceof Error ? e.message : ''))
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}

// ============================================================
// TAB MATERIALI
// ============================================================
export function TabMateriali({ cantiereId }: { cantiereId: string }) {
  const toast = useToast()
  const { data: rows = [], isLoading } = useMateriali({ cantiereId })
  const deleteM = useDeleteMateriale()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MaterialeConDettagli | null>(null)
  const [toDelete, setToDelete] = useState<MaterialeConDettagli | null>(null)

  const tot = rows.reduce((s, r) => s + r.importo_totale, 0)

  const cols: Column<MaterialeConDettagli>[] = [
    { key: 'data', label: 'Data', width: 100, render: (r) => <span className="num text-ink-soft text-xs">{formatDate(r.data)}</span> },
    { key: 'descrizione', label: 'Descrizione', render: (r) => <div><div className="font-medium text-ink">{r.descrizione}</div><div className="text-xs text-ink-soft">{r.fornitore?.ragione_sociale ?? '—'}</div></div> },
    { key: 'quantita', label: 'Qtà', align: 'right', width: 90, render: (r) => <span className="num">{r.quantita} {r.unita_misura ?? ''}</span> },
    { key: 'prezzo_unitario', label: 'Prezzo', align: 'right', width: 100, render: (r) => <Money value={r.prezzo_unitario} decimals={2} /> },
    { key: 'importo_totale', label: 'Totale', align: 'right', width: 120, render: (r) => <Money value={r.importo_totale} decimals={2} bold /> },
    { key: 'riferimento_documento', label: 'Doc.', width: 110, render: (r) => <span className="font-mono text-xs text-ink-soft">{r.riferimento_documento ?? '—'}</span> },
    {
      key: '_act', label: '', align: 'right', width: 70,
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button onClick={() => { setEditing(r); setFormOpen(true) }} className="text-ink-faint hover:text-ink p-1"><Icon name="pencil" size={14} /></button>
          <button onClick={() => setToDelete(r)} className="text-ink-faint hover:text-bad p-1"><Icon name="trash-2" size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-line bg-canvas/40">
        <div className="text-sm text-ink-soft">
          <span className="font-medium text-ink">{rows.length} movimenti</span> · totale {eu(tot, { decimals: 2 })}
        </div>
        <Button icon="plus" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
          Nuovo materiale
        </Button>
      </div>
      {isLoading ? (
        <TabLoader />
      ) : rows.length === 0 ? (
        <EmptyState icon="package" title="Nessun materiale" description="Registra gli acquisti imputati a questo cantiere." />
      ) : (
        <Table columns={cols} rows={rows} footer={{
          data: <span className="text-ink-soft text-xs uppercase tracking-wide">Totale</span>,
          importo_totale: <Money value={tot} decimals={2} bold />,
        }} />
      )}
      <MaterialeForm open={formOpen} onClose={() => setFormOpen(false)} materiale={editing} defaultCantiereId={cantiereId} />
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina movimento"
        message="Vuoi eliminare questo materiale?"
        confirmLabel="Elimina"
        loading={deleteM.isPending}
        onConfirm={async () => {
          if (!toDelete) return
          try { await deleteM.mutateAsync(toDelete.id); toast.success('Eliminato'); setToDelete(null) }
          catch (e) { toast.error('Errore: ' + (e instanceof Error ? e.message : '')) }
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}

// ============================================================
// TAB RICAVI
// ============================================================
export function TabRicavi({ cantiereId }: { cantiereId: string }) {
  const toast = useToast()
  const { data: rows = [], isLoading } = useRicavi({ cantiereId })
  const deleteM = useDeleteRicavo()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RicavoConDettagli | null>(null)
  const [toDelete, setToDelete] = useState<RicavoConDettagli | null>(null)

  const tot = rows.reduce((s, r) => s + r.importo, 0)

  const cols: Column<RicavoConDettagli>[] = [
    { key: 'data', label: 'Data', width: 100, render: (r) => <span className="num text-ink-soft text-xs">{formatDate(r.data)}</span> },
    { key: 'numero_documento', label: 'Documento', render: (r) => <div><div className="font-medium text-ink">{r.numero_documento ?? '—'}</div><Badge tone="neutral">{TIPO_RICAVO_LABEL[r.tipo]}</Badge></div> },
    { key: 'scadenza', label: 'Scadenza', width: 110, render: (r) => <span className="num text-ink-soft text-xs">{r.scadenza ? formatDate(r.scadenza) : '—'}</span> },
    { key: 'importo', label: 'Importo', align: 'right', width: 130, render: (r) => <Money value={r.importo} bold /> },
    { key: 'stato', label: 'Stato', width: 130, render: (r) => { const s = STATO_RICAVO[r.stato]; return <Badge tone={s.tone} icon={s.icon}>{s.label}</Badge> } },
    {
      key: '_act', label: '', align: 'right', width: 70,
      render: (r) => (
        <div className="inline-flex items-center gap-1">
          <button onClick={() => { setEditing(r); setFormOpen(true) }} className="text-ink-faint hover:text-ink p-1"><Icon name="pencil" size={14} /></button>
          <button onClick={() => setToDelete(r)} className="text-ink-faint hover:text-bad p-1"><Icon name="trash-2" size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-line bg-canvas/40">
        <div className="text-sm text-ink-soft">Stati avanzamento lavori e fatture · totale {eu(tot)}</div>
        <Button icon="plus" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>Nuovo ricavo</Button>
      </div>
      {isLoading ? (
        <TabLoader />
      ) : rows.length === 0 ? (
        <EmptyState icon="receipt" title="Nessun ricavo" description="Registra SAL o fatture attive per questo cantiere." />
      ) : (
        <Table columns={cols} rows={rows} footer={{
          data: <span className="text-ink-soft text-xs uppercase tracking-wide">Totale</span>,
          importo: <Money value={tot} bold />,
        }} />
      )}
      <RicavoForm open={formOpen} onClose={() => setFormOpen(false)} ricavo={editing} defaultCantiereId={cantiereId} />
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina ricavo"
        message="Vuoi eliminare questo ricavo?"
        confirmLabel="Elimina"
        loading={deleteM.isPending}
        onConfirm={async () => {
          if (!toDelete) return
          try { await deleteM.mutateAsync(toDelete.id); toast.success('Eliminato'); setToDelete(null) }
          catch (e) { toast.error('Errore: ' + (e instanceof Error ? e.message : '')) }
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}

// ============================================================
// TAB INDIRETTI
// ============================================================
const DRIVER_LABEL: Record<string, string> = {
  percentuale_manuale: 'Percentuale manuale',
  ore_lavorate: 'Ore lavorate',
  costi_diretti: 'Costi diretti',
  ricavi: 'Ricavi',
}

export function TabIndiretti({ cantiereId }: { cantiereId: string }) {
  const { data: quote = [], isLoading } = useQuoteIndiretti(cantiereId)
  const totale = quote.reduce((s, q) => s + q.importo, 0)

  if (isLoading) return <TabLoader />
  if (quote.length === 0)
    return (
      <EmptyState
        icon="building-2"
        title="Nessuna quota indiretti assegnata"
        description="Applica una ripartizione dei costi indiretti (sezione Costi indiretti) per assegnare quote a questo cantiere."
      />
    )

  return (
    <div className="p-6">
      <Card className="bg-canvas/60 mb-5">
        <div className="flex items-baseline justify-between">
          <div className="text-sm text-ink-soft">
            Quota di costi indiretti ripartita su questo cantiere
          </div>
          <div className="text-2xl font-semibold num text-ink">{eu(totale)}</div>
        </div>
      </Card>

      <h3 className="text-sm font-semibold text-ink mb-2">Dettaglio per periodo</h3>
      <div className="space-y-2">
        {quote.map((q) => (
          <div
            key={q.id}
            className="flex items-center justify-between px-4 py-3 bg-white border border-line rounded-lg"
          >
            <div>
              <div className="text-sm font-medium text-ink">
                {q.ripartizione
                  ? `${formatDate(q.ripartizione.periodo_inizio)} – ${formatDate(
                      q.ripartizione.periodo_fine
                    )}`
                  : 'Periodo'}
              </div>
              <div className="text-xs text-ink-soft mt-0.5">
                Driver: {q.ripartizione ? DRIVER_LABEL[q.ripartizione.driver] : '—'} ·
                quota {fmtPct(q.percentuale, 2)}
              </div>
            </div>
            <Money value={q.importo} decimals={2} bold />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// TAB ALLEGATI
// ============================================================
export function TabAllegati({ cantiereId }: { cantiereId: string }) {
  const toast = useToast()
  const { data: allegati = [], isLoading } = useAllegati(cantiereId)
  const uploadM = useUploadAllegato(cantiereId)
  const deleteM = useDeleteAllegato(cantiereId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [toDelete, setToDelete] = useState<AllegatoCantiere | null>(null)

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File troppo grande (max 25 MB)')
      return
    }
    try {
      await uploadM.mutateAsync(file)
      toast.success('File caricato')
    } catch (err) {
      toast.error('Errore upload: ' + (err instanceof Error ? err.message : ''))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const iconFor = (mime: string | null) => {
    if (!mime) return 'file'
    if (mime.includes('pdf')) return 'file-text'
    if (mime.includes('sheet') || mime.includes('excel')) return 'file-spreadsheet'
    if (mime.includes('zip') || mime.includes('compressed')) return 'file-archive'
    if (mime.includes('image')) return 'image'
    if (mime.includes('word')) return 'file-text'
    return 'file'
  }
  const sizeLabel = (b: number | null) => {
    if (!b) return ''
    if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
    return `${Math.max(1, Math.round(b / 1024))} KB`
  }

  return (
    <div className="p-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onFilePicked}
      />
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-ink-soft">
          {allegati.length} file · PDF, immagini, documenti (max 25 MB)
        </div>
        <Button
          icon={uploadM.isPending ? 'loader-circle' : 'upload'}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadM.isPending}
        >
          Carica file
        </Button>
      </div>

      {isLoading ? (
        <TabLoader />
      ) : allegati.length === 0 ? (
        <EmptyState
          icon="paperclip"
          title="Nessun allegato"
          description="Carica contratti, DDT, foto o altri documenti del cantiere."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {allegati.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 p-3 border border-line rounded-lg bg-white hover:border-navy-300 transition"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  a.origine === 'offerta'
                    ? 'bg-navy-50 text-navy-600'
                    : 'bg-line-soft text-ink-soft'
                }`}
              >
                <Icon name={iconFor(a.mime_type)} size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink truncate">
                  {a.nome_file}
                </div>
                <div className="text-xs text-ink-soft mt-0.5 flex items-center gap-1.5">
                  {sizeLabel(a.size_bytes)} · {formatDate(a.created_at.slice(0, 10))}
                  {a.origine === 'offerta' && (
                    <Badge tone="navy" icon="sparkles">
                      Offerta
                    </Badge>
                  )}
                </div>
              </div>
              <button
                onClick={() => downloadAllegato(a).catch(() => toast.error('Errore download'))}
                className="text-ink-faint hover:text-navy-700 p-1"
                title="Scarica"
              >
                <Icon name="download" size={16} />
              </button>
              <button
                onClick={() => setToDelete(a)}
                className="text-ink-faint hover:text-bad p-1"
                title="Elimina"
              >
                <Icon name="trash-2" size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina allegato"
        message={`Vuoi eliminare "${toDelete?.nome_file}"?`}
        confirmLabel="Elimina"
        loading={deleteM.isPending}
        onConfirm={async () => {
          if (!toDelete) return
          try {
            await deleteM.mutateAsync(toDelete)
            toast.success('Allegato eliminato')
            setToDelete(null)
          } catch (e) {
            toast.error('Errore: ' + (e instanceof Error ? e.message : ''))
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
