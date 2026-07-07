import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Money } from '@/components/ui/Money'
import { Select, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import { eu } from '@/lib/utils'
import type { FicFatturaImportata } from '@/lib/types'
import { useCantieri, type CantiereConMargini } from '@/features/cantieri/api'
import { STATO_RICAVO } from './constants'
import {
  useFicInbox,
  useAssegnaFattura,
  useIgnoraFattura,
  type RigaRipartizione,
} from './fic-api'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}
function num(v: string): number {
  return Number(v.replace(',', '.')) || 0
}

export function FicInbox() {
  const { data: fatture = [], isLoading } = useFicInbox()
  const { data: cantieri = [] } = useCantieri()

  if (isLoading || fatture.length === 0) return null
  const cantieriAttivi = cantieri.filter((c) => c.stato !== 'chiuso')

  return (
    <Card noPad className="overflow-hidden mb-6 border-navy-200">
      <div className="px-5 py-4 border-b border-line bg-navy-50/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-navy-600 text-white flex items-center justify-center shrink-0">
          <Icon name="inbox" size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold text-ink">
            Fatture da assegnare
          </h2>
          <p className="text-xs text-ink-soft mt-0.5">
            Importate da Fatture in Cloud · associa ogni fattura a uno o più
            cantieri per registrarla tra i ricavi.
          </p>
        </div>
        <Badge tone="navy">{fatture.length}</Badge>
      </div>

      <div className="divide-y divide-line">
        {fatture.map((f) => (
          <FicInboxRow key={f.id} fattura={f} cantieri={cantieriAttivi} />
        ))}
      </div>
    </Card>
  )
}

function FicInboxRow({
  fattura: f,
  cantieri,
}: {
  fattura: FicFatturaImportata
  cantieri: CantiereConMargini[]
}) {
  const toast = useToast()
  const assegnaM = useAssegnaFattura()
  const ignoraM = useIgnoraFattura()

  const [mode, setMode] = useState<'single' | 'split'>('single')
  const [single, setSingle] = useState('')
  const [rows, setRows] = useState<{ cantiere_id: string; importo: string }[]>([
    { cantiere_id: '', importo: '' },
    { cantiere_id: '', importo: '' },
  ])

  const netto = f.importo_netto
  const s = STATO_RICAVO[f.stato_pagamento]
  const busy = assegnaM.isPending || ignoraM.isPending

  const splitTotale = rows.reduce((acc, r) => acc + num(r.importo), 0)
  const splitOk =
    rows.every((r) => r.cantiere_id) &&
    rows.length >= 1 &&
    Math.abs(splitTotale - netto) <= 0.01

  const setRow = (i: number, patch: Partial<{ cantiere_id: string; importo: string }>) =>
    setRows((a) => a.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const addRow = () =>
    setRows((a) => [...a, { cantiere_id: '', importo: '' }])
  const delRow = (i: number) =>
    setRows((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : a))

  const conferma = async (righe: RigaRipartizione[]) => {
    try {
      await assegnaM.mutateAsync({ stagingId: f.id, righe })
      toast.success(
        righe.length > 1
          ? `Fattura ripartita su ${righe.length} cantieri`
          : 'Fattura assegnata al cantiere'
      )
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const assegnaSingolo = () => {
    if (!single) return toast.error('Seleziona un cantiere')
    conferma([{ cantiere_id: single, importo: netto }])
  }
  const confermaSplit = () => {
    if (!splitOk)
      return toast.error('Le quote devono sommare al netto della fattura')
    conferma(rows.map((r) => ({ cantiere_id: r.cantiere_id, importo: num(r.importo) })))
  }
  const ignora = async () => {
    try {
      await ignoraM.mutateAsync(f.id)
      toast.success('Fattura scartata')
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <div className="px-5 py-3.5">
      {/* Riga intestazione fattura */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-ink">{f.numero ?? '—'}</span>
            <Badge tone={s.tone} icon={s.icon}>
              {s.label}
            </Badge>
          </div>
          <div className="text-xs text-ink-soft mt-0.5">
            {formatDate(f.data)} · {f.cliente_nome ?? 'Cliente n/d'}
            {f.scadenza ? ` · scad. ${formatDate(f.scadenza)}` : ''}
          </div>
        </div>

        <div className="text-right">
          <Money value={netto} bold />
          <div className="text-[11px] text-ink-faint">netto</div>
        </div>

        {mode === 'single' ? (
          <>
            <div className="w-56">
              <Select
                value={single}
                onChange={(e) => setSingle(e.target.value)}
                leftIcon="hard-hat"
                disabled={busy}
              >
                <option value="">— Assegna a cantiere —</option>
                {cantieri.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codice} — {c.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                icon={busy ? 'loader-circle' : 'check'}
                onClick={assegnaSingolo}
                disabled={busy || !single}
              >
                Assegna
              </Button>
              <button
                onClick={() => setMode('split')}
                disabled={busy}
                className="text-xs px-2.5 h-8 rounded-md border border-line text-ink-soft hover:text-navy-700 hover:border-navy-300 transition disabled:opacity-50"
              >
                Dividi tra più cantieri
              </button>
              <button
                onClick={ignora}
                disabled={busy}
                className="text-xs px-2.5 h-8 rounded-md border border-line text-ink-soft hover:text-bad hover:border-bad/40 transition disabled:opacity-50"
                title="Scarta: la fattura non riguarda un cantiere"
              >
                Ignora
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setMode('single')}
            disabled={busy}
            className="text-xs px-2.5 h-8 rounded-md border border-line text-ink-soft hover:text-ink transition disabled:opacity-50"
          >
            ← Assegnazione singola
          </button>
        )}
      </div>

      {/* Editor ripartizione multi-cantiere */}
      {mode === 'split' && (
        <div className="mt-3 p-3 bg-canvas/60 border border-line rounded-lg space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={r.cantiere_id}
                  onChange={(e) => setRow(i, { cantiere_id: e.target.value })}
                  leftIcon="hard-hat"
                  disabled={busy}
                >
                  <option value="">— Cantiere —</option>
                  {cantieri.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codice} — {c.nome}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-36">
                <Input
                  inputMode="decimal"
                  value={r.importo}
                  onChange={(e) => setRow(i, { importo: e.target.value })}
                  rightAddon="€"
                  placeholder="0,00"
                  disabled={busy}
                />
              </div>
              <button
                onClick={() => delRow(i)}
                disabled={busy || rows.length <= 1}
                className="w-9 h-9 inline-flex items-center justify-center text-ink-faint hover:text-bad rounded-md hover:bg-bad-soft/40 disabled:opacity-40"
              >
                <Icon name="trash-2" size={15} />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            <Button variant="ghost" size="sm" icon="plus" onClick={addRow} disabled={busy}>
              Aggiungi cantiere
            </Button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-ink-soft">
                Assegnato{' '}
                <span
                  className={`num font-semibold ${
                    splitOk ? 'text-good-deep' : 'text-warn-deep'
                  }`}
                >
                  {eu(splitTotale, { decimals: 2 })}
                </span>{' '}
                / {eu(netto, { decimals: 2 })}
              </span>
              <Button
                size="sm"
                icon={busy ? 'loader-circle' : 'check'}
                onClick={confermaSplit}
                disabled={busy || !splitOk}
              >
                Conferma ripartizione
              </Button>
            </div>
          </div>
          {!splitOk && Math.abs(splitTotale - netto) > 0.01 && (
            <div className="text-xs text-warn-deep flex items-center gap-1.5">
              <Icon name="circle-alert" size={13} />
              Le quote devono sommare al netto della fattura (
              {eu(netto, { decimals: 2 })}).
            </div>
          )}
        </div>
      )}
    </div>
  )
}
