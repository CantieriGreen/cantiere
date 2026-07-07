import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Tabs, type TabDef } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { eu, pct } from '@/lib/utils'
import { useCantiere } from './api'
import { CantiereForm } from './CantiereForm'
import { STATO_CANTIERE } from './constants'
import {
  TabManodopera,
  TabMateriali,
  TabRicavi,
  TabIndiretti,
  TabAllegati,
} from './tabs'

export function CantiereDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: cantiere, isLoading, isError } = useCantiere(id)
  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab] = useState('manodopera')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Icon name="loader-circle" size={26} className="animate-spin text-navy-600" />
      </div>
    )
  }

  if (isError || !cantiere) {
    return (
      <Card>
        <EmptyState
          icon="circle-alert"
          title="Cantiere non trovato"
          description="Il cantiere richiesto non esiste o è stato eliminato."
          action={
            <Button variant="secondary" icon="arrow-left" onClick={() => navigate('/cantieri')}>
              Torna ai cantieri
            </Button>
          }
        />
      </Card>
    )
  }

  const s = STATO_CANTIERE[cantiere.stato]
  const m = cantiere.margini
  const ricavi = m?.ricavi ?? 0
  const costoManodopera = m?.costo_manodopera ?? 0
  const costoMateriali = m?.costo_materiali ?? 0
  const indiretti = m?.indiretti ?? 0
  const margineDiretto = m?.margine_diretto ?? 0
  const marginePieno = m?.margine_pieno ?? 0
  const marginePct = ricavi > 0 ? (marginePieno / ricavi) * 100 : 0
  const avanzamento =
    cantiere.valore_contratto > 0
      ? Math.min(100, (ricavi / cantiere.valore_contratto) * 100)
      : 0

  const tabs: TabDef[] = [
    { id: 'manodopera', label: 'Manodopera', icon: 'hard-hat' },
    { id: 'materiali', label: 'Materiali', icon: 'package' },
    { id: 'ricavi', label: 'Ricavi', icon: 'receipt' },
    { id: 'indiretti', label: 'Costi indiretti', icon: 'building-2' },
    { id: 'allegati', label: 'Allegati', icon: 'paperclip' },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb={['Cantieri', cantiere.codice]}
        title={cantiere.nome}
        subtitle={
          <span className="inline-flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs bg-line-soft px-1.5 py-0.5 rounded">
              {cantiere.codice}
            </span>
            {cantiere.cliente?.ragione_sociale && (
              <span className="inline-flex items-center gap-1">
                <Icon name="building" size={13} className="text-ink-faint" />
                {cantiere.cliente.ragione_sociale}
              </span>
            )}
            {cantiere.indirizzo && (
              <span className="inline-flex items-center gap-1">
                <Icon name="map-pin" size={13} className="text-ink-faint" />
                {cantiere.indirizzo}
                {cantiere.citta ? `, ${cantiere.citta}` : ''}
              </span>
            )}
            <Badge tone={s.tone} icon={s.icon}>
              {s.label}
            </Badge>
            {cantiere.manutenzione && (
              <Badge tone="good" icon="wrench">
                Manutenzione
              </Badge>
            )}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" icon="arrow-left" onClick={() => navigate('/cantieri')}>
              Indietro
            </Button>
            <Button variant="secondary" icon="pencil" onClick={() => setEditOpen(true)}>
              Modifica
            </Button>
          </>
        }
      />

      {/* Riepilogo economico — 6 celle */}
      <Card noPad className="mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-canvas">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-ink">
              Riepilogo economico
            </h2>
            <Badge tone="neutral">
              Valore contratto {eu(cantiere.valore_contratto)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 divide-x divide-line border-b border-line">
          <RiepilogoCell label="Costo manodopera" value={eu(costoManodopera)} />
          <RiepilogoCell label="Costo materiali" value={eu(costoMateriali)} />
          <RiepilogoCell label="Indiretti ripartiti" value={eu(indiretti)} />
          <RiepilogoCell
            label="Ricavi"
            value={eu(ricavi)}
            hint={
              cantiere.valore_contratto > 0
                ? `${avanzamento.toFixed(0)}% del contratto`
                : undefined
            }
          />
          <RiepilogoCell
            label="Margine diretto"
            value={eu(margineDiretto)}
            signedValue={margineDiretto}
          />
          <RiepilogoCell
            label="Margine pieno"
            value={eu(marginePieno)}
            tone={marginePieno >= 0 ? 'good' : 'bad'}
            signedValue={marginePieno}
            big
            hint={ricavi > 0 ? `${pct(marginePct, 1)} sui ricavi` : undefined}
          />
        </div>

        <div className="px-5 py-3.5 flex items-center gap-5">
          <div className="text-xs text-ink-soft min-w-[130px]">
            Avanzamento ricavi
          </div>
          <div className="flex-1 h-2 bg-line-soft rounded-full overflow-hidden">
            <div
              className="h-full bg-navy-600 rounded-full"
              style={{ width: `${avanzamento}%` }}
            />
          </div>
          <div className="text-sm font-medium num text-ink min-w-[160px] text-right">
            {eu(ricavi)} / {eu(cantiere.valore_contratto)}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card noPad className="overflow-hidden">
        <div className="px-5">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
        {tab === 'manodopera' && <TabManodopera cantiereId={cantiere.id} />}
        {tab === 'materiali' && <TabMateriali cantiereId={cantiere.id} />}
        {tab === 'ricavi' && <TabRicavi cantiereId={cantiere.id} />}
        {tab === 'indiretti' && <TabIndiretti cantiereId={cantiere.id} />}
        {tab === 'allegati' && <TabAllegati cantiereId={cantiere.id} />}
      </Card>

      <CantiereForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        cantiere={cantiere}
      />
    </div>
  )
}

function RiepilogoCell({
  label,
  value,
  hint,
  tone,
  signedValue,
  big,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'good' | 'bad'
  signedValue?: number
  big?: boolean
}) {
  const valueClass =
    tone === 'good'
      ? 'text-good-deep'
      : tone === 'bad'
      ? 'text-bad-deep'
      : signedValue !== undefined && signedValue < 0
      ? 'text-bad-deep'
      : 'text-ink'
  return (
    <div className="px-5 py-4">
      <div className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">
        {label}
      </div>
      <div
        className={`mt-2 num font-semibold tracking-tight ${valueClass} ${
          big ? 'text-[26px]' : 'text-[19px]'
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-ink-soft mt-1">{hint}</div>}
    </div>
  )
}
