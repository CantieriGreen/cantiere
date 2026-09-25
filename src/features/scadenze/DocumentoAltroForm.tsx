import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import type { DocumentoAltro, DocumentoAltroInput } from '@/lib/types'
import { useCreateDocumentoAltro, useUpdateDocumentoAltro } from './api'

type Props = {
  open: boolean
  onClose: () => void
  documento?: DocumentoAltro | null
  /** Nomi gia' usati, proposti come suggerimenti mentre si scrive. */
  suggerimenti: string[]
}

const vuoto = () => ({ nome_documento: '', scadenza: '', note: '' })

export function DocumentoAltroForm({ open, onClose, documento, suggerimenti }: Props) {
  const isEdit = !!documento
  const toast = useToast()
  const createM = useCreateDocumentoAltro()
  const updateM = useUpdateDocumentoAltro()
  const [f, setF] = useState(vuoto())

  useEffect(() => {
    if (!open) return
    setF(
      documento
        ? {
            nome_documento: documento.nome_documento,
            scadenza: documento.scadenza,
            note: documento.note ?? '',
          }
        : vuoto()
    )
  }, [open, documento])

  const saving = createM.isPending || updateM.isPending

  const submit = async () => {
    if (!f.nome_documento.trim()) return toast.error('Indica il nome del documento')
    if (!f.scadenza) return toast.error('Indica la data di scadenza')
    const input: DocumentoAltroInput = {
      nome_documento: f.nome_documento.trim(),
      scadenza: f.scadenza,
      note: f.note.trim() || null,
    }
    try {
      if (isEdit && documento) {
        await updateM.mutateAsync({ id: documento.id, input })
        toast.success('Documento aggiornato')
      } else {
        await createM.mutateAsync(input)
        toast.success('Documento registrato')
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
      title={isEdit ? 'Modifica documento' : 'Nuovo documento'}
      subtitle="DURC e altri documenti aziendali con scadenza"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={saving} icon={saving ? 'loader-circle' : 'save'}>
            {isEdit ? 'Salva' : 'Registra documento'}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <Field
          label="Nome documento"
          required
          span={8}
          hint="scrivi liberamente, oppure scegli fra quelli già usati"
        >
          <Input
            leftIcon="file-text"
            placeholder="es. DURC"
            list="documenti-altro-suggerimenti"
            value={f.nome_documento}
            onChange={(e) => setF((s) => ({ ...s, nome_documento: e.target.value }))}
          />
          <datalist id="documenti-altro-suggerimenti">
            {suggerimenti.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
        <Field label="Scadenza" required span={4}>
          <Input
            type="date"
            value={f.scadenza}
            onChange={(e) => setF((s) => ({ ...s, scadenza: e.target.value }))}
          />
        </Field>
        <Field label="Note" span={12} hint="facoltative: ente, numero protocollo, chi se ne occupa">
          <Textarea
            rows={2}
            value={f.note}
            onChange={(e) => setF((s) => ({ ...s, note: e.target.value }))}
          />
        </Field>
      </div>
    </Drawer>
  )
}
