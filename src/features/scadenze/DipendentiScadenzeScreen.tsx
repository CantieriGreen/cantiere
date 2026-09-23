import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Tabs, type TabDef } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import type { DocumentoDipendente, Formazione, VisitaMedica } from '@/lib/types'
import {
  useDeleteDocumento,
  useDeleteFormazione,
  useDeleteVisita,
  useDocumentiDipendenti,
  useFormazione,
  useTipiFormazione,
  useVisiteMediche,
} from './api'
import { VisitaForm } from './VisitaForm'
import { FormazioneForm } from './FormazioneForm'
import { DocumentoForm } from './DocumentoForm'
import { InviaAvvisiButton } from './InviaAvvisiButton'
import { ScadenzaCell, StatoBadge } from './ScadenzaCell'
import {
  TIPOLOGIA_FORMAZIONE_LABEL,
  prioritaStato,
  statoPeggiore,
  statoScadenza,
  type StatoScadenza,
} from './constants'

type TabId = 'visite' | 'formazione' | 'documenti'
type Filtro = 'tutte' | 'da_gestire' | 'in_regola'

const DA_GESTIRE: StatoScadenza[] = ['scaduta', 'urgente', 'in_scadenza']

function passaFiltro(stato: StatoScadenza, filtro: Filtro) {
  if (filtro === 'da_gestire') return DA_GESTIRE.includes(stato)
  if (filtro === 'in_regola') return !DA_GESTIRE.includes(stato)
  return true
}

export function DipendentiScadenzeScreen() {
  const { profile } = useAuth()
  const isAdmin = profile?.ruolo === 'admin'
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab: TabId =
    tabParam === 'formazione' || tabParam === 'documenti' ? tabParam : 'visite'
  const setTab = (id: string) => setParams({ tab: id }, { replace: true })

  const { data: visite = [] } = useVisiteMediche()
  const { data: formazione = [] } = useFormazione()
  const { data: documenti = [] } = useDocumentiDipendenti()

  const daGestire = {
    visite: visite.filter((v) => DA_GESTIRE.includes(statoScadenza(v.scadenza_visita))).length,
    formazione: formazione.filter((f) => DA_GESTIRE.includes(statoScadenza(f.scadenza))).length,
    documenti: documenti.filter((d) =>
      DA_GESTIRE.includes(
        statoPeggiore([d.scadenza_patente, d.ha_permesso_soggiorno ? d.scadenza_permesso : null])
      )
    ).length,
  }

  const tabs: TabDef[] = [
    { id: 'visite', label: 'Visite mediche', icon: 'stethoscope', count: visite.length },
    { id: 'formazione', label: 'Sicurezza sul lavoro', icon: 'shield-check', count: formazione.length },
    { id: 'documenti', label: 'Patenti e permessi', icon: 'id-card', count: documenti.length },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb={['Calendario scadenze', 'Dipendenti']}
        title="Scadenze dipendenti"
        banner="Visite mediche, formazione sulla sicurezza, patenti e permessi di soggiorno. Gli avvisi partono a 14, 7, 3 e 1 giorno dalla scadenza."
        actions={isAdmin ? <InviaAvvisiButton /> : undefined}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPI
          label="Visite mediche da gestire"
          value={String(daGestire.visite)}
          icon="stethoscope"
          tone={daGestire.visite > 0 ? 'warn' : 'good'}
          hint="scadute o entro 30 gg"
        />
        <KPI
          label="Corsi sicurezza da gestire"
          value={String(daGestire.formazione)}
          icon="shield-check"
          tone={daGestire.formazione > 0 ? 'warn' : 'good'}
          hint="scaduti o entro 30 gg"
        />
        <KPI
          label="Documenti da gestire"
          value={String(daGestire.documenti)}
          icon="id-card"
          tone={daGestire.documenti > 0 ? 'warn' : 'good'}
          hint="patenti e permessi di soggiorno"
        />
      </div>

      <Card noPad className="overflow-hidden">
        <div className="px-5">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
        {tab === 'visite' && <TabVisite visite={visite} isAdmin={isAdmin} />}
        {tab === 'formazione' && <TabFormazione righe={formazione} isAdmin={isAdmin} />}
        {tab === 'documenti' && <TabDocumenti documenti={documenti} isAdmin={isAdmin} />}
      </Card>
    </div>
  )
}

// ============================================================
// Barra comune: filtro stato + ricerca + pulsante nuovo
// ============================================================

function Toolbar({
  filtro,
  setFiltro,
  search,
  setSearch,
  placeholder,
  extra,
  nuovo,
}: {
  filtro: Filtro
  setFiltro: (f: Filtro) => void
  search: string
  setSearch: (s: string) => void
  placeholder: string
  extra?: ReactNode
  nuovo?: ReactNode
}) {
  const FILTRI: { id: Filtro; label: string }[] = [
    { id: 'tutte', label: 'Tutte' },
    { id: 'da_gestire', label: 'Da gestire' },
    { id: 'in_regola', label: 'In regola' },
  ]
  return (
    <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-0.5">
          {FILTRI.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`h-8 px-3 rounded-md text-sm transition ${
                filtro === f.id
                  ? 'bg-white text-ink shadow-card font-medium'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {extra}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Icon
            name="search"
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 pr-3 text-sm border border-line rounded-lg w-60 focus:outline-none focus:border-navy-500"
            placeholder={placeholder}
          />
        </div>
        {nuovo}
      </div>
    </div>
  )
}

function Persona({ nome, cognome, collegato }: { nome: string; cognome: string; collegato: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-ink">
        {cognome} {nome}
      </span>
      {!collegato && (
        <span className="text-[11px] text-ink-faint" title="Nominativo non collegato all'anagrafica dipendenti">
          (non in anagrafica)
        </span>
      )}
    </div>
  )
}

function azioni<T extends { id: string }>(
  isAdmin: boolean,
  onEdit: (r: T) => void,
  onDelete: (r: T) => void
): Column<T>[] {
  if (!isAdmin) return []
  return [
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
              onEdit(r)
            }}
            className="text-ink-faint hover:text-ink p-1.5 rounded-md hover:bg-line-soft"
            title="Modifica"
          >
            <Icon name="pencil" size={15} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(r)
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
}

function Vuoto({ totale, icon, testo, onNew }: { totale: number; icon: string; testo: string; onNew?: () => void }) {
  return (
    <EmptyState
      icon={totale === 0 ? icon : 'search-x'}
      title={totale === 0 ? 'Nessuna scadenza registrata' : 'Nessun risultato'}
      description={totale === 0 ? testo : 'Nessuna voce con questa ricerca o filtro.'}
      action={
        totale === 0 && onNew ? (
          <Button icon="plus" onClick={onNew}>
            Aggiungi
          </Button>
        ) : undefined
      }
    />
  )
}

// ============================================================
// Visite mediche
// ============================================================

type RigaVisita = VisitaMedica & { stato: StatoScadenza }

function TabVisite({ visite, isAdmin }: { visite: VisitaMedica[]; isAdmin: boolean }) {
  const toast = useToast()
  const deleteM = useDeleteVisita()
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VisitaMedica | null>(null)
  const [toDelete, setToDelete] = useState<VisitaMedica | null>(null)

  const rows: RigaVisita[] = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visite
      .map((v) => ({ ...v, stato: statoScadenza(v.scadenza_visita) }))
      .filter((v) => passaFiltro(v.stato, filtro))
      .filter((v) => !q || `${v.nome} ${v.cognome} ${v.telefono ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => prioritaStato(a.stato) - prioritaStato(b.stato) || a.scadenza_visita.localeCompare(b.scadenza_visita))
  }, [visite, filtro, search])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (v: VisitaMedica) => {
    if (!isAdmin) return
    setEditing(v)
    setFormOpen(true)
  }
  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Visita eliminata')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<RigaVisita>[] = [
    {
      key: 'cognome',
      label: 'Dipendente',
      render: (r) => <Persona nome={r.nome} cognome={r.cognome} collegato={!!r.dipendente_id} />,
    },
    {
      key: 'telefono',
      label: 'Telefono',
      width: 160,
      render: (r) =>
        r.telefono ? (
          <a href={`tel:${r.telefono}`} onClick={(e) => e.stopPropagation()} className="text-sm text-navy-700 hover:underline">
            {r.telefono}
          </a>
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      key: 'scadenza_visita',
      label: 'Scadenza visita',
      width: 160,
      render: (r) => <ScadenzaCell data={r.scadenza_visita} />,
    },
    { key: 'stato', label: 'Stato', width: 140, render: (r) => <StatoBadge stato={r.stato} /> },
    ...azioni<RigaVisita>(isAdmin, openEdit, setToDelete),
  ]

  return (
    <>
      <Toolbar
        filtro={filtro}
        setFiltro={setFiltro}
        search={search}
        setSearch={setSearch}
        placeholder="Cerca dipendente o telefono…"
        nuovo={isAdmin && <Button icon="plus" onClick={openNew}>Nuova visita</Button>}
      />
      {rows.length === 0 ? (
        <Vuoto totale={visite.length} icon="stethoscope" testo="Registra le scadenze delle visite mediche dei dipendenti." onNew={isAdmin ? openNew : undefined} />
      ) : (
        <Table columns={cols} rows={rows} onRowClick={isAdmin ? openEdit : undefined} />
      )}
      <VisitaForm open={formOpen} onClose={() => setFormOpen(false)} visita={editing} />
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina visita medica"
        message={<>Vuoi eliminare la scadenza della visita di <strong>{toDelete?.cognome} {toDelete?.nome}</strong>?</>}
        confirmLabel="Elimina"
        loading={deleteM.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}

// ============================================================
// Formazione sicurezza sul lavoro
// ============================================================

type RigaFormazione = Formazione & { stato: StatoScadenza; corso: string }

function TabFormazione({ righe, isAdmin }: { righe: Formazione[]; isAdmin: boolean }) {
  const toast = useToast()
  const { data: tipi = [] } = useTipiFormazione()
  const deleteM = useDeleteFormazione()
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Formazione | null>(null)
  const [toDelete, setToDelete] = useState<RigaFormazione | null>(null)

  const nomeTipo = useMemo(() => new Map(tipi.map((t) => [t.id, t.nome])), [tipi])

  const rows: RigaFormazione[] = useMemo(() => {
    const q = search.trim().toLowerCase()
    return righe
      .map((f) => ({
        ...f,
        stato: statoScadenza(f.scadenza),
        corso: nomeTipo.get(f.tipo_formazione_id) ?? '—',
      }))
      .filter((f) => passaFiltro(f.stato, filtro))
      .filter((f) => !tipoFiltro || f.tipo_formazione_id === tipoFiltro)
      .filter((f) => !q || `${f.nome} ${f.cognome} ${f.corso}`.toLowerCase().includes(q))
      .sort((a, b) => prioritaStato(a.stato) - prioritaStato(b.stato) || a.scadenza.localeCompare(b.scadenza))
  }, [righe, filtro, search, tipoFiltro, nomeTipo])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (f: Formazione) => {
    if (!isAdmin) return
    setEditing(f)
    setFormOpen(true)
  }
  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Corso eliminato')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<RigaFormazione>[] = [
    {
      key: 'cognome',
      label: 'Dipendente',
      render: (r) => <Persona nome={r.nome} cognome={r.cognome} collegato={!!r.dipendente_id} />,
    },
    {
      key: 'corso',
      label: 'Formazione',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="text-ink">{r.corso}</span>
          <Badge tone={r.tipologia === 'aggiornamento' ? 'info' : 'neutral'}>
            {TIPOLOGIA_FORMAZIONE_LABEL[r.tipologia]}
          </Badge>
        </div>
      ),
    },
    { key: 'scadenza', label: 'Scadenza', width: 150, render: (r) => <ScadenzaCell data={r.scadenza} /> },
    { key: 'stato', label: 'Stato', width: 140, render: (r) => <StatoBadge stato={r.stato} /> },
    ...azioni<RigaFormazione>(isAdmin, openEdit, setToDelete),
  ]

  return (
    <>
      <Toolbar
        filtro={filtro}
        setFiltro={setFiltro}
        search={search}
        setSearch={setSearch}
        placeholder="Cerca dipendente o corso…"
        extra={
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="h-9 px-3 text-sm border border-line rounded-lg bg-white focus:outline-none focus:border-navy-500"
          >
            <option value="">Tutti i corsi</option>
            {tipi.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        }
        nuovo={isAdmin && <Button icon="plus" onClick={openNew}>Nuova formazione</Button>}
      />
      {rows.length === 0 ? (
        <Vuoto totale={righe.length} icon="shield-check" testo="Registra corsi e aggiornamenti sulla sicurezza dei dipendenti." onNew={isAdmin ? openNew : undefined} />
      ) : (
        <Table columns={cols} rows={rows} onRowClick={isAdmin ? openEdit : undefined} />
      )}
      <FormazioneForm open={formOpen} onClose={() => setFormOpen(false)} formazione={editing} />
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina formazione"
        message={<>Vuoi eliminare <strong>{toDelete?.corso}</strong> di <strong>{toDelete?.cognome} {toDelete?.nome}</strong>?</>}
        confirmLabel="Elimina"
        loading={deleteM.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}

// ============================================================
// Patenti e permessi di soggiorno
// ============================================================

type RigaDocumento = DocumentoDipendente & { stato: StatoScadenza }

function TabDocumenti({ documenti, isAdmin }: { documenti: DocumentoDipendente[]; isAdmin: boolean }) {
  const toast = useToast()
  const deleteM = useDeleteDocumento()
  const [filtro, setFiltro] = useState<Filtro>('tutte')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DocumentoDipendente | null>(null)
  const [toDelete, setToDelete] = useState<DocumentoDipendente | null>(null)

  const rows: RigaDocumento[] = useMemo(() => {
    const q = search.trim().toLowerCase()
    return documenti
      .map((d) => ({
        ...d,
        stato: statoPeggiore([d.scadenza_patente, d.ha_permesso_soggiorno ? d.scadenza_permesso : null]),
      }))
      .filter((d) => passaFiltro(d.stato, filtro))
      .filter((d) => !q || `${d.nome} ${d.cognome}`.toLowerCase().includes(q))
      .sort((a, b) => prioritaStato(a.stato) - prioritaStato(b.stato))
  }, [documenti, filtro, search])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (d: DocumentoDipendente) => {
    if (!isAdmin) return
    setEditing(d)
    setFormOpen(true)
  }
  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteM.mutateAsync(toDelete.id)
      toast.success('Scadenze documenti eliminate')
      setToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const cols: Column<RigaDocumento>[] = [
    {
      key: 'cognome',
      label: 'Dipendente',
      render: (r) => <Persona nome={r.nome} cognome={r.cognome} collegato={!!r.dipendente_id} />,
    },
    {
      key: 'scadenza_patente',
      label: 'Patente',
      width: 160,
      render: (r) => <ScadenzaCell data={r.scadenza_patente} />,
    },
    {
      key: 'scadenza_permesso',
      label: 'Permesso di soggiorno',
      width: 190,
      render: (r) =>
        r.ha_permesso_soggiorno ? (
          <ScadenzaCell data={r.scadenza_permesso} />
        ) : (
          <span className="text-xs text-ink-faint">Non necessario</span>
        ),
    },
    { key: 'stato', label: 'Stato', width: 140, render: (r) => <StatoBadge stato={r.stato} /> },
    ...azioni<RigaDocumento>(isAdmin, openEdit, setToDelete),
  ]

  return (
    <>
      <Toolbar
        filtro={filtro}
        setFiltro={setFiltro}
        search={search}
        setSearch={setSearch}
        placeholder="Cerca dipendente…"
        nuovo={isAdmin && <Button icon="plus" onClick={openNew}>Nuova scadenza</Button>}
      />
      {rows.length === 0 ? (
        <Vuoto totale={documenti.length} icon="id-card" testo="Registra le scadenze di patenti e permessi di soggiorno." onNew={isAdmin ? openNew : undefined} />
      ) : (
        <Table columns={cols} rows={rows} onRowClick={isAdmin ? openEdit : undefined} />
      )}
      <DocumentoForm open={formOpen} onClose={() => setFormOpen(false)} documento={editing} />
      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Elimina scadenze documenti"
        message={<>Vuoi eliminare patente e permesso di <strong>{toDelete?.cognome} {toDelete?.nome}</strong>?</>}
        confirmLabel="Elimina"
        loading={deleteM.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
