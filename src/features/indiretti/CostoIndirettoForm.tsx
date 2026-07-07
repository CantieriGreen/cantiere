import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/toast'
import { eu } from '@/lib/utils'
import type { CostoIndiretto, CostoIndirettoInput } from '@/lib/types'
import { useFornitori } from '@/features/fornitori/api'
import {
  useCategorieIndiretto,
  useCreateCostoIndiretto,
  useUpdateCostoIndiretto,
  useCreaAmmortamento,
} from './api'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

type Props = {
  open: boolean
  onClose: () => void
  costo?: CostoIndiretto | null
  defaultData?: string
}

export function CostoIndirettoForm({ open, onClose, costo, defaultData }: Props) {
  const isEdit = !!costo
  const toast = useToast()
  const { data: categorie = [] } = useCategorieIndiretto()
  const { data: fornitori = [] } = useFornitori()
  const createM = useCreateCostoIndiretto()
  const updateM = useUpdateCostoIndiretto()
  const creaAmmM = useCreaAmmortamento()

  const [categoriaId, setCategoriaId] = useState('')
  const [fornitoreId, setFornitoreId] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [data, setData] = useState(defaultData ?? todayISO())
  const [importo, setImporto] = useState('')
  const [note, setNote] = useState('')
  const [ammortizza, setAmmortizza] = useState(false)
  const [mesi, setMesi] = useState('12')

  useEffect(() => {
    if (open) {
      if (costo) {
        setCategoriaId(costo.categoria_id ?? '')
        setFornitoreId(costo.fornitore_id ?? '')
        setDescrizione(costo.descrizione)
        setData(costo.data)
        setImporto(String(costo.importo))
        setNote(costo.note ?? '')
      } else {
        setCategoriaId('')
        setFornitoreId('')
        setDescrizione('')
        setData(defaultData ?? todayISO())
        setImporto('')
        setNote('')
      }
      setAmmortizza(false)
      setMesi('12')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, costo])

  const saving = createM.isPending || updateM.isPending || creaAmmM.isPending

  const imp = Number(importo.replace(',', '.'))
  const nMesi = parseInt(mesi, 10)
  const quota =
    ammortizza && Number.isFinite(imp) && imp > 0 && nMesi > 0
      ? imp / nMesi
      : null

  const submit = async () => {
    if (!descrizione.trim()) return toast.error('Inserisci la descrizione')
    if (!Number.isFinite(imp) || imp <= 0) return toast.error('Importo non valido')

    try {
      if (!isEdit && ammortizza) {
        if (!nMesi || nMesi < 1) return toast.error('Numero di mesi non valido')
        await creaAmmM.mutateAsync({
          categoria_id: categoriaId || null,
          fornitore_id: fornitoreId || null,
          descrizione: descrizione.trim(),
          importo_totale: imp,
          data_inizio: data,
          mesi: nMesi,
          note: note.trim() || null,
        })
        toast.success(`Ammortamento creato su ${nMesi} mesi`)
        onClose()
        return
      }

      const input: CostoIndirettoInput = {
        categoria_id: categoriaId || null,
        fornitore_id: fornitoreId || null,
        descrizione: descrizione.trim(),
        data,
        importo: imp,
        note: note.trim() || null,
      }
      if (isEdit && costo) {
        await updateM.mutateAsync({ id: costo.id, input })
        toast.success('Costo aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Costo indiretto registrato')
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
      title={isEdit ? 'Modifica costo indiretto' : 'Nuovo costo indiretto'}
      subtitle="Affitti, utenze, personale ufficio, mezzi, ammortamenti…"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            icon={saving ? 'loader-circle' : 'save'}
          >
            {isEdit ? 'Salva' : ammortizza ? 'Crea ammortamento' : 'Registra costo'}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <Field label={ammortizza ? 'Data prima rata' : 'Data'} required span={5}>
          <Input
            type="date"
            leftIcon="calendar"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </Field>
        <Field label="Categoria" span={7}>
          <Select
            leftIcon="tag"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="">— Nessuna categoria —</option>
            {categorie.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fornitore" span={12} hint="opzionale">
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

        <Field label="Descrizione" required span={12}>
          <Input
            leftIcon="file-text"
            placeholder="es. Furgone officina / Affitto uffici maggio"
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
          />
        </Field>

        <Field
          label={ammortizza ? 'Importo totale' : 'Importo'}
          required
          span={6}
        >
          <Input
            inputMode="decimal"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            rightAddon="€"
            placeholder="0,00"
          />
        </Field>

        {/* Ammortamento — solo in creazione */}
        {!isEdit && (
          <div className="col-span-12 border border-line rounded-lg p-3 bg-canvas/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="calendar-clock" size={16} className="text-navy-600" />
                <div>
                  <div className="text-sm font-medium text-ink">
                    Ammortizza su più mesi
                  </div>
                  <div className="text-xs text-ink-soft">
                    Spalma il costo in quote mensili (es. mezzi, attrezzature)
                  </div>
                </div>
              </div>
              <Toggle checked={ammortizza} onChange={setAmmortizza} />
            </div>

            {ammortizza && (
              <div className="mt-3 grid grid-cols-12 gap-3 items-end">
                <Field label="Durata" span={5}>
                  <Input
                    inputMode="numeric"
                    value={mesi}
                    onChange={(e) => setMesi(e.target.value.replace(/\D/g, ''))}
                    rightAddon="mesi"
                    placeholder="12"
                  />
                </Field>
                <div className="col-span-7 text-sm text-ink-soft pb-2.5">
                  {quota !== null ? (
                    <>
                      Quota mensile{' '}
                      <span className="num font-semibold text-navy-700">
                        {eu(quota, { decimals: 2 })}
                      </span>{' '}
                      × {nMesi} mesi
                    </>
                  ) : (
                    'Inserisci importo e mesi'
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
