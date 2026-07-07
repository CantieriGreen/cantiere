import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Table, type Column } from '@/components/ui/Table'
import { Money } from '@/components/ui/Money'
import { EmptyState } from '@/components/ui/EmptyState'
import { eu } from '@/lib/utils'
import {
  useMateriali,
  type MaterialeConDettagli,
} from '@/features/materiali/api'
import { useFornitore } from './api'
import { FornitoreForm } from './FornitoreForm'
import { StarRating } from './StarRating'

export function FornitoreDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: fornitore, isLoading, isError } = useFornitore(id)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Icon name="loader-circle" size={26} className="animate-spin text-navy-600" />
      </div>
    )
  }

  if (isError || !fornitore) {
    return (
      <Card>
        <EmptyState
          icon="circle-alert"
          title="Fornitore non trovato"
          description="Il fornitore richiesto non esiste o è stato eliminato."
          action={
            <Button variant="secondary" icon="arrow-left" onClick={() => navigate('/anagrafiche/fornitori')}>
              Torna ai fornitori
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        breadcrumb={['Anagrafiche', 'Fornitori', fornitore.ragione_sociale]}
        title={fornitore.ragione_sociale}
        subtitle={
          <span className="inline-flex items-center gap-3 flex-wrap">
            {fornitore.partita_iva && (
              <span className="font-mono text-xs bg-line-soft px-1.5 py-0.5 rounded">
                P.IVA {fornitore.partita_iva}
              </span>
            )}
            {fornitore.categoria && <Badge tone="navy">{fornitore.categoria}</Badge>}
            {fornitore.valutazione ? (
              <span className="inline-flex items-center gap-1.5">
                <StarRating value={fornitore.valutazione} size={13} />
                <span className="text-xs text-ink-soft">
                  {fornitore.valutazione}/5
                </span>
              </span>
            ) : null}
          </span>
        }
        banner="Scheda fornitore con condizioni commerciali e dati anagrafici."
        actions={
          <>
            <Button variant="secondary" icon="arrow-left" onClick={() => navigate('/anagrafiche/fornitori')}>
              Indietro
            </Button>
            <Button variant="secondary" icon="pencil" onClick={() => setEditOpen(true)}>
              Modifica
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5">
          <Card>
            <h2 className="text-[15px] font-semibold text-ink mb-4">
              Dati anagrafici
            </h2>
            <div className="space-y-3.5">
              <DetailRow
                label="Categoria"
                value={fornitore.categoria ? <Badge tone="navy">{fornitore.categoria}</Badge> : null}
                icon="tag"
              />
              <DetailRow label="Referente" value={fornitore.referente} icon="user" />
              <DetailRow
                label="Sede"
                value={[fornitore.indirizzo, fornitore.citta, fornitore.provincia].filter(Boolean).join(', ') || null}
                icon="map-pin"
              />
              <DetailRow label="Email" value={fornitore.email} icon="mail" link={`mailto:${fornitore.email}`} />
              <DetailRow label="PEC" value={fornitore.pec} icon="mail" />
              <DetailRow label="Telefono" value={fornitore.telefono} icon="phone" link={`tel:${fornitore.telefono}`} />
              <DetailRow label="IBAN" value={fornitore.iban} icon="banknote" mono />
              <DetailRow
                label="Pagamento"
                value={fornitore.condizioni_pagamento ? <Badge tone="neutral">{fornitore.condizioni_pagamento}</Badge> : null}
                icon="calendar-clock"
              />
              <DetailRow
                label="Fornitore dal"
                value={fornitore.fornitore_dal ? formatDate(fornitore.fornitore_dal) : null}
                icon="calendar"
              />
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-6">
          <StoricoAcquisti fornitoreId={fornitore.id} />

          {fornitore.note && (
            <Card>
              <h2 className="text-[15px] font-semibold text-ink mb-2">Note</h2>
              <p className="text-sm text-ink-soft whitespace-pre-wrap">
                {fornitore.note}
              </p>
            </Card>
          )}
        </div>
      </div>

      <FornitoreForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fornitore={fornitore}
      />
    </div>
  )
}

function StoricoAcquisti({ fornitoreId }: { fornitoreId: string }) {
  const navigate = useNavigate()
  const { data: rows = [], isLoading } = useMateriali({ fornitoreId })
  const totale = rows.reduce((s, r) => s + r.importo_totale, 0)

  const cols: Column<MaterialeConDettagli>[] = [
    {
      key: 'data',
      label: 'Data',
      width: 100,
      render: (r) => (
        <span className="num text-ink-soft text-xs">{formatDate(r.data)}</span>
      ),
    },
    {
      key: 'descrizione',
      label: 'Descrizione',
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.descrizione}</div>
          <div className="text-xs text-ink-soft">
            {r.cantiere
              ? `${r.cantiere.codice} — ${r.cantiere.nome}`
              : 'Nessun cantiere'}
          </div>
        </div>
      ),
    },
    {
      key: 'quantita',
      label: 'Qtà',
      align: 'right',
      width: 90,
      render: (r) => (
        <span className="num">
          {r.quantita} {r.unita_misura ?? ''}
        </span>
      ),
    },
    {
      key: 'importo_totale',
      label: 'Totale',
      align: 'right',
      width: 120,
      render: (r) => <Money value={r.importo_totale} decimals={2} bold />,
    },
  ]

  return (
    <Card noPad className="overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Storico acquisti</h2>
        {rows.length > 0 && (
          <Badge tone="neutral">
            {rows.length} {rows.length === 1 ? 'acquisto' : 'acquisti'} ·{' '}
            {eu(totale, { decimals: 2 })}
          </Badge>
        )}
      </div>
      {isLoading ? (
        <div className="p-10 text-center">
          <Icon
            name="loader-circle"
            size={22}
            className="animate-spin text-navy-600 mx-auto"
          />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="package"
          title="Nessun acquisto registrato"
          description="I materiali imputati ai cantieri da questo fornitore compariranno qui."
        />
      ) : (
        <Table
          columns={cols}
          rows={rows}
          onRowClick={(r) =>
            r.cantiere_id && navigate(`/cantieri/${r.cantiere_id}`)
          }
          footer={{
            data: (
              <span className="text-ink-soft text-xs uppercase tracking-wide">
                Totale
              </span>
            ),
            importo_totale: <Money value={totale} decimals={2} bold />,
          }}
        />
      )}
    </Card>
  )
}

function DetailRow({
  label,
  value,
  icon,
  mono,
  link,
}: {
  label: string
  value: ReactNode
  icon: string
  mono?: boolean
  link?: string
}) {
  const hasValue = value !== null && value !== undefined && value !== ''
  let content: ReactNode = <span className="text-ink-faint">—</span>
  if (hasValue) {
    if (link && typeof value === 'string') {
      content = (
        <a className="text-navy-700 hover:underline" href={link}>
          {value}
        </a>
      )
    } else {
      content = (
        <span className={mono ? 'font-mono text-[12px]' : undefined}>
          {value}
        </span>
      )
    }
  }
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-md bg-line-soft text-ink-soft flex items-center justify-center shrink-0 mt-0.5">
        <Icon name={icon} size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">
          {label}
        </div>
        <div className="text-sm text-ink mt-0.5">{content}</div>
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
