import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { Table, type Column } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { eu } from '@/lib/utils'
import type { TariffaOraria } from '@/lib/types'
import {
  useDipendente,
  useTariffe,
  useDeleteTariffa,
} from './api'
import { DipendenteForm } from './DipendenteForm'
import { NuovoPeriodoDialog } from './NuovoPeriodoDialog'

export function DipendenteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: dip, isLoading, isError } = useDipendente(id)
  const { data: tariffe = [], isLoading: loadingTariffe } = useTariffe(id)
  const deleteTariffaM = useDeleteTariffa()

  const [editOpen, setEditOpen] = useState(false)
  const [periodoOpen, setPeriodoOpen] = useState(false)
  const [tariffaToDelete, setTariffaToDelete] = useState<TariffaOraria | null>(
    null
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Icon name="loader-circle" size={26} className="animate-spin text-navy-600" />
      </div>
    )
  }

  if (isError || !dip) {
    return (
      <Card>
        <EmptyState
          icon="circle-alert"
          title="Dipendente non trovato"
          description="Il dipendente richiesto non esiste o è stato eliminato."
          action={
            <Button
              variant="secondary"
              icon="arrow-left"
              onClick={() => navigate('/anagrafiche/dipendenti')}
            >
              Torna ai dipendenti
            </Button>
          }
        />
      </Card>
    )
  }

  const nomeCompleto = `${dip.nome} ${dip.cognome}`
  // tariffa corrente = quella valida oggi (valido_a null o >= oggi)
  const oggi = new Date().toISOString().slice(0, 10)
  const tariffaCorrente = [...tariffe]
    .reverse()
    .find((t) => t.valido_da <= oggi && (!t.valido_a || t.valido_a >= oggi))

  const ordereDesc = [...tariffe].sort((a, b) =>
    a.valido_da < b.valido_da ? 1 : -1
  )

  const cols: Column<TariffaOraria>[] = [
    {
      key: 'valido_da',
      label: 'Valido da',
      width: 130,
      render: (r) => <span className="num">{formatDate(r.valido_da)}</span>,
    },
    {
      key: 'valido_a',
      label: 'Valido a',
      width: 150,
      render: (r) =>
        r.valido_a ? (
          <span className="num text-ink-soft">{formatDate(r.valido_a)}</span>
        ) : (
          <Badge tone="good" icon="play">
            in corso
          </Badge>
        ),
    },
    {
      key: 'costo_ord',
      label: 'Tariffa ordinaria',
      align: 'right',
      width: 170,
      render: (r) => (
        <span className="num text-ink">
          {eu(r.costo_ord, { decimals: 2 })}{' '}
          <span className="text-ink-faint">/h</span>
        </span>
      ),
    },
    {
      key: 'costo_str',
      label: 'Tariffa straordinaria',
      align: 'right',
      width: 190,
      render: (r) => (
        <span className="num text-ink">
          {eu(r.costo_str, { decimals: 2 })}{' '}
          <span className="text-ink-faint">/h</span>
        </span>
      ),
    },
    {
      key: '_act',
      label: '',
      align: 'right',
      width: 60,
      render: (r) => (
        <button
          onClick={() => setTariffaToDelete(r)}
          className="text-ink-faint hover:text-bad p-1.5 rounded-md hover:bg-bad-soft/40"
          title="Elimina periodo"
        >
          <Icon name="trash-2" size={15} />
        </button>
      ),
    },
  ]

  const confirmDeleteTariffa = async () => {
    if (!tariffaToDelete || !id) return
    try {
      await deleteTariffaM.mutateAsync({
        id: tariffaToDelete.id,
        dipendente_id: id,
      })
      toast.success('Periodo tariffario eliminato')
      setTariffaToDelete(null)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumb={['Anagrafiche', 'Dipendenti', nomeCompleto]}
        title={nomeCompleto}
        banner="Anagrafica dipendente e storico delle tariffe orarie. Un nuovo periodo chiude automaticamente il precedente."
        actions={
          <>
            <Button
              variant="secondary"
              icon="arrow-left"
              onClick={() => navigate('/anagrafiche/dipendenti')}
            >
              Indietro
            </Button>
            <Button
              variant="secondary"
              icon="pencil"
              onClick={() => setEditOpen(true)}
            >
              Modifica anagrafica
            </Button>
            <Button icon="plus" onClick={() => setPeriodoOpen(true)}>
              Nuovo periodo tariffario
            </Button>
          </>
        }
      />

      {/* Header anagrafica */}
      <Card className="mb-6">
        <div className="flex items-start gap-5">
          <Avatar name={nomeCompleto} size={72} />
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
            <Info label="Mansione" value={dip.mansione} />
            <Info
              label="Tipo"
              value={
                <Badge tone={dip.tipo === 'ufficio' ? 'info' : 'navy'}>
                  {dip.tipo === 'ufficio' ? 'Ufficio' : 'Operaio'}
                </Badge>
              }
            />
            <Info
              label="In azienda dal"
              value={dip.data_assunzione ? formatDate(dip.data_assunzione) : null}
            />
            <Info
              label="Stato"
              value={
                dip.attivo ? (
                  <Badge tone="good" icon="circle-check">
                    Attivo
                  </Badge>
                ) : (
                  <Badge tone="neutral">Sospeso</Badge>
                )
              }
            />
            <Info
              label="Codice fiscale"
              value={
                dip.codice_fiscale ? (
                  <span className="font-mono text-[13px]">
                    {dip.codice_fiscale}
                  </span>
                ) : null
              }
            />
            <Info
              label="Telefono"
              value={
                dip.telefono ? (
                  <a className="text-navy-700 hover:underline" href={`tel:${dip.telefono}`}>
                    {dip.telefono}
                  </a>
                ) : null
              }
            />
            <Info
              label="Email"
              value={
                dip.email ? (
                  <a className="text-navy-700 hover:underline" href={`mailto:${dip.email}`}>
                    {dip.email}
                  </a>
                ) : null
              }
            />
            <Info
              label="Tariffa attuale"
              value={
                tariffaCorrente ? (
                  <span className="num font-semibold text-ink">
                    {eu(tariffaCorrente.costo_ord, { decimals: 2 })}/h
                  </span>
                ) : (
                  <span className="text-ink-faint text-sm">non impostata</span>
                )
              }
            />
          </div>
        </div>
      </Card>

      {/* Tariffe storicizzate */}
      <Card noPad className="overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              Tariffe orarie — storico
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Le tariffe applicate ai rapportini in base alla data di lavoro
            </p>
          </div>
          {tariffe.length > 0 && (
            <Badge tone="neutral" icon="history">
              {tariffe.length} {tariffe.length === 1 ? 'periodo' : 'periodi'}
            </Badge>
          )}
        </div>
        {loadingTariffe ? (
          <div className="p-10 text-center">
            <Icon
              name="loader-circle"
              size={22}
              className="animate-spin text-navy-600 mx-auto"
            />
          </div>
        ) : tariffe.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="Nessuna tariffa impostata"
            description="Aggiungi il primo periodo tariffario per poter calcolare il costo dei rapportini."
            action={
              <Button icon="plus" onClick={() => setPeriodoOpen(true)}>
                Nuovo periodo tariffario
              </Button>
            }
          />
        ) : (
          <Table columns={cols} rows={ordereDesc} />
        )}
      </Card>

      <DipendenteForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        dipendente={dip}
      />

      <NuovoPeriodoDialog
        open={periodoOpen}
        onClose={() => setPeriodoOpen(false)}
        dipendenteId={dip.id}
        dipendenteNome={nomeCompleto}
        tariffaCorrente={tariffaCorrente}
      />

      <ConfirmDialog
        open={!!tariffaToDelete}
        danger
        title="Elimina periodo tariffario"
        message="Vuoi eliminare questo periodo? Se elimini il periodo corrente, quello precedente non verrà riaperto automaticamente."
        confirmLabel="Elimina"
        loading={deleteTariffaM.isPending}
        onConfirm={confirmDeleteTariffa}
        onCancel={() => setTariffaToDelete(null)}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  const hasValue = value !== null && value !== undefined && value !== ''
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-soft font-semibold">
        {label}
      </div>
      <div className="text-sm text-ink mt-1">
        {hasValue ? value : <span className="text-ink-faint">—</span>}
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
