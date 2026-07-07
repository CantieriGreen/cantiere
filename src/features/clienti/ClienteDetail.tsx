import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import type { TipoCliente } from '@/lib/types'
import { useCliente, useUpdateCliente } from './api'
import { ClienteForm } from './ClienteForm'
import { TIPI_CLIENTE_ORDER, TIPO_CLIENTE } from './constants'

export function ClienteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: cliente, isLoading, isError } = useCliente(id)
  const updateM = useUpdateCliente()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Icon name="loader-circle" size={26} className="animate-spin text-navy-600" />
      </div>
    )
  }

  if (isError || !cliente) {
    return (
      <Card>
        <EmptyState
          icon="circle-alert"
          title="Cliente non trovato"
          description="Il cliente richiesto non esiste o è stato eliminato."
          action={
            <Button variant="secondary" icon="arrow-left" onClick={() => navigate('/anagrafiche/clienti')}>
              Torna ai clienti
            </Button>
          }
        />
      </Card>
    )
  }

  const tipoInfo = TIPO_CLIENTE[cliente.tipo]

  const changeTipo = async (t: TipoCliente) => {
    if (t === cliente.tipo) return
    try {
      await updateM.mutateAsync({ id: cliente.id, input: { tipo: t } })
      toast.success('Classificazione aggiornata')
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb={['Anagrafiche', 'Clienti', cliente.ragione_sociale]}
        title={cliente.ragione_sociale}
        subtitle={
          <span className="inline-flex items-center gap-3 flex-wrap">
            {cliente.partita_iva && (
              <span className="font-mono text-xs bg-line-soft px-1.5 py-0.5 rounded">
                P.IVA {cliente.partita_iva}
              </span>
            )}
            {(cliente.indirizzo || cliente.citta) && (
              <span className="inline-flex items-center gap-1">
                <Icon name="map-pin" size={13} className="text-ink-faint" />
                {[cliente.indirizzo, cliente.citta, cliente.provincia]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            )}
            <Badge tone={tipoInfo.tone} icon={tipoInfo.icon}>
              {tipoInfo.label}
            </Badge>
          </span>
        }
        banner="Scheda cliente con dati anagrafici e classificazione commerciale."
        actions={
          <>
            <Button
              variant="secondary"
              icon="arrow-left"
              onClick={() => navigate('/anagrafiche/clienti')}
            >
              Indietro
            </Button>
            <Button variant="secondary" icon="pencil" onClick={() => setEditOpen(true)}>
              Modifica
            </Button>
          </>
        }
      />

      {/* Classificazione commerciale */}
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              Classificazione commerciale
            </h2>
            <p className="text-sm text-ink-soft mt-0.5">{tipoInfo.desc}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-1">
            {TIPI_CLIENTE_ORDER.map((t) => {
              const info = TIPO_CLIENTE[t]
              const active = cliente.tipo === t
              return (
                <button
                  key={t}
                  onClick={() => changeTipo(t)}
                  disabled={updateM.isPending}
                  className={`h-9 px-4 rounded-md text-sm font-medium transition inline-flex items-center gap-1.5 ${
                    active ? info.activeCls : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <Icon name={info.icon} size={14} />
                  {info.label}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5">
          <Card>
            <h2 className="text-[15px] font-semibold text-ink mb-4">
              Dati anagrafici
            </h2>
            <div className="space-y-3.5">
              <DetailRow label="Referente" value={cliente.referente} icon="user" />
              <DetailRow
                label="Codice fiscale"
                value={cliente.codice_fiscale}
                icon="hash"
                mono
              />
              <DetailRow
                label="Codice SDI"
                value={cliente.codice_sdi}
                icon="file-text"
                mono
              />
              <DetailRow label="Email" value={cliente.email} icon="mail" link={`mailto:${cliente.email}`} />
              <DetailRow label="PEC" value={cliente.pec} icon="mail" />
              <DetailRow label="Telefono" value={cliente.telefono} icon="phone" link={`tel:${cliente.telefono}`} />
              <DetailRow
                label="Termini pagamento"
                value={cliente.termini_pagamento ? <Badge tone="neutral">{cliente.termini_pagamento}</Badge> : null}
                icon="calendar-clock"
              />
              <DetailRow
                label="Cliente dal"
                value={cliente.cliente_dal ? formatDate(cliente.cliente_dal) : null}
                icon="calendar"
              />
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-6">
          <Card noPad className="overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="text-[15px] font-semibold text-ink">
                Cantieri commissionati
              </h2>
            </div>
            <EmptyState
              icon="hard-hat"
              title="Nessun cantiere collegato"
              description="I cantieri di questo cliente compariranno qui una volta creati (sezione Cantieri, in arrivo)."
            />
          </Card>

          {cliente.note && (
            <Card>
              <h2 className="text-[15px] font-semibold text-ink mb-2">Note</h2>
              <p className="text-sm text-ink-soft whitespace-pre-wrap">
                {cliente.note}
              </p>
            </Card>
          )}
        </div>
      </div>

      <ClienteForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        cliente={cliente}
      />
    </div>
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
        <span className={mono ? 'font-mono text-[13px]' : undefined}>
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
