import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toast'
import { eu } from '@/lib/utils'
import { useCantieri } from '@/features/cantieri/api'
import { useFornitori } from '@/features/fornitori/api'
import type { Materiale, MaterialeInput } from '@/lib/types'
import {
  useCreateMateriale,
  useTipiMateriale,
  useUpdateMateriale,
} from './api'

const UNITA = ['pz', 'mc', 'mq', 'm', 'kg', 't', 'l', 'h', 'corpo']

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

type Props = {
  open: boolean
  onClose: () => void
  materiale?: Materiale | null
  defaultCantiereId?: string
}

export function MaterialeForm({
  open,
  onClose,
  materiale,
  defaultCantiereId,
}: Props) {
  const isEdit = !!materiale
  const toast = useToast()
  const { data: cantieri = [] } = useCantieri()
  const { data: fornitori = [] } = useFornitori()
  const { data: tipi = [] } = useTipiMateriale()
  const createM = useCreateMateriale()
  const updateM = useUpdateMateriale()

  const [data, setData] = useState(todayISO())
  const [cantiereId, setCantiereId] = useState(defaultCantiereId ?? '')
  const [fornitoreId, setFornitoreId] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [quantita, setQuantita] = useState('1')
  const [unita, setUnita] = useState('pz')
  const [prezzo, setPrezzo] = useState('')
  const [docRef, setDocRef] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      if (materiale) {
        setData(materiale.data)
        setCantiereId(materiale.cantiere_id)
        setFornitoreId(materiale.fornitore_id ?? '')
        setTipoId(materiale.tipo_materiale_id ?? '')
        setDescrizione(materiale.descrizione)
        setQuantita(String(materiale.quantita))
        setUnita(materiale.unita_misura ?? 'pz')
        setPrezzo(String(materiale.prezzo_unitario))
        setDocRef(materiale.riferimento_documento ?? '')
        setNote(materiale.note ?? '')
      } else {
        setData(todayISO())
        setCantiereId(defaultCantiereId ?? '')
        setFornitoreId('')
        setTipoId('')
        setDescrizione('')
        setQuantita('1')
        setUnita('pz')
        setPrezzo('')
        setDocRef('')
        setNote('')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, materiale])

  const qta = Number(quantita.replace(',', '.')) || 0
  const pu = Number(prezzo.replace(',', '.')) || 0
  const importo = Math.round(qta * pu * 100) / 100

  const saving = createM.isPending || updateM.isPending

  const submit = async () => {
    if (!cantiereId) return toast.error('Seleziona un cantiere')
    if (!descrizione.trim()) return toast.error('Inserisci la descrizione')

    const input: MaterialeInput = {
      cantiere_id: cantiereId,
      fornitore_id: fornitoreId || null,
      tipo_materiale_id: tipoId || null,
      descrizione: descrizione.trim(),
      quantita: qta,
      unita_misura: unita || null,
      prezzo_unitario: pu,
      data,
      riferimento_documento: docRef.trim() || null,
      note: note.trim() || null,
    }
    try {
      if (isEdit && materiale) {
        await updateM.mutateAsync({ id: materiale.id, input })
        toast.success('Materiale aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Movimento materiale salvato')
      }
      onClose()
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={620}
      title={isEdit ? 'Modifica materiale' : 'Nuovo movimento materiale'}
      subtitle="L'importo è imputato come costo materiali del cantiere"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Icon name="calculator" size={16} className="text-navy-600" />
            <span className="text-ink-soft">Importo totale</span>
            <span className="num text-[17px] font-semibold text-navy-700">
              {eu(importo, { decimals: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Annulla
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              icon={saving ? 'loader-circle' : 'save'}
            >
              {isEdit ? 'Salva' : 'Salva movimento'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <Field label="Data" required span={5}>
          <Input
            type="date"
            leftIcon="calendar"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </Field>
        <Field label="Riferimento documento" span={7} hint="DDT, n. fattura">
          <Input
            leftIcon="hash"
            placeholder="es. DDT 2456"
            value={docRef}
            onChange={(e) => setDocRef(e.target.value)}
          />
        </Field>

        <Field label="Cantiere" required span={12}>
          <Select
            leftIcon="hard-hat"
            value={cantiereId}
            onChange={(e) => setCantiereId(e.target.value)}
          >
            <option value="">— Seleziona cantiere —</option>
            {cantieri.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codice} — {c.nome}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fornitore" span={7}>
          <Select
            leftIcon="truck"
            value={fornitoreId}
            onChange={(e) => setFornitoreId(e.target.value)}
          >
            <option value="">— Nessun fornitore —</option>
            {fornitori.map((f) => (
              <option key={f.id} value={f.id}>
                {f.ragione_sociale}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Categoria" span={5}>
          <Select value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
            <option value="">— Nessuna —</option>
            {tipi.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Descrizione" required span={12}>
          <Input
            leftIcon="package"
            placeholder="es. Mattoni semipieni 25x12x5,5"
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
          />
        </Field>

        <Field label="Quantità" required span={4}>
          <Input
            inputMode="decimal"
            value={quantita}
            onChange={(e) => setQuantita(e.target.value)}
          />
        </Field>
        <Field label="Unità" span={4}>
          <Select value={unita} onChange={(e) => setUnita(e.target.value)}>
            {UNITA.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Prezzo unitario" required span={4}>
          <Input
            inputMode="decimal"
            value={prezzo}
            onChange={(e) => setPrezzo(e.target.value)}
            rightAddon="€"
            placeholder="0,00"
          />
        </Field>

        <Field label="Note" span={12}>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Drawer>
  )
}
