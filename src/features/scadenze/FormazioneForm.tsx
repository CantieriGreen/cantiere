import { useEffect, useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { Formazione, FormazioneInput, TipologiaFormazione } from '@/lib/types'
import {
  useCreateFormazioni,
  useCreateTipoFormazione,
  useTipiFormazione,
  useUpdateFormazione,
} from './api'
import { TIPOLOGIA_FORMAZIONE_LABEL } from './constants'
import { PersonaFields } from './PersonaFields'
import { personaVuota, validaPersona, type Persona } from './persona'

type Props = {
  open: boolean
  onClose: () => void
  formazione?: Formazione | null
}

type RigaCorso = {
  tipo_formazione_id: string
  tipologia: TipologiaFormazione
  scadenza: string
}

export function FormazioneForm({ open, onClose, formazione }: Props) {
  const isEdit = !!formazione
  const toast = useToast()
  const { data: tipi = [] } = useTipiFormazione()
  const createM = useCreateFormazioni()
  const updateM = useUpdateFormazione()
  const creaTipoM = useCreateTipoFormazione()

  const [persona, setPersona] = useState<Persona>(personaVuota())
  const [corsi, setCorsi] = useState<RigaCorso[]>([])
  const [note, setNote] = useState('')
  const [nuovoTipo, setNuovoTipo] = useState('')
  const [aggiuntaAperta, setAggiuntaAperta] = useState(false)

  useEffect(() => {
    if (!open) return
    if (formazione) {
      setPersona({
        dipendente_id: formazione.dipendente_id ?? '',
        nome: formazione.nome,
        cognome: formazione.cognome,
      })
      setCorsi([
        {
          tipo_formazione_id: formazione.tipo_formazione_id,
          tipologia: formazione.tipologia,
          scadenza: formazione.scadenza,
        },
      ])
      setNote(formazione.note ?? '')
    } else {
      setPersona(personaVuota())
      setCorsi([])
      setNote('')
    }
    setNuovoTipo('')
    setAggiuntaAperta(false)
  }, [open, formazione])

  const selezionato = (id: string) => corsi.some((c) => c.tipo_formazione_id === id)

  const toggleTipo = (id: string) => {
    if (isEdit) return
    setCorsi((cs) =>
      cs.some((c) => c.tipo_formazione_id === id)
        ? cs.filter((c) => c.tipo_formazione_id !== id)
        : [...cs, { tipo_formazione_id: id, tipologia: 'corso', scadenza: '' }]
    )
  }

  const setCorso = (id: string, patch: Partial<RigaCorso>) =>
    setCorsi((cs) => cs.map((c) => (c.tipo_formazione_id === id ? { ...c, ...patch } : c)))

  const aggiungiTipo = async () => {
    const nome = nuovoTipo.trim()
    if (!nome) return
    const esistente = tipi.find((t) => t.nome.toLowerCase() === nome.toLowerCase())
    if (esistente) {
      if (!selezionato(esistente.id)) toggleTipo(esistente.id)
      setNuovoTipo('')
      setAggiuntaAperta(false)
      return
    }
    try {
      const t = await creaTipoM.mutateAsync(nome)
      setCorsi((cs) => [...cs, { tipo_formazione_id: t.id, tipologia: 'corso', scadenza: '' }])
      setNuovoTipo('')
      setAggiuntaAperta(false)
      toast.success(`Corso "${t.nome}" aggiunto all'elenco`)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const saving = createM.isPending || updateM.isPending

  const submit = async () => {
    const err = validaPersona(persona)
    if (err) return toast.error(err)
    if (corsi.length === 0) return toast.error('Seleziona almeno un corso')
    const senzaData = corsi.find((c) => !c.scadenza)
    if (senzaData) {
      const nome = tipi.find((t) => t.id === senzaData.tipo_formazione_id)?.nome ?? 'un corso'
      return toast.error(`Indica la scadenza per ${nome}`)
    }

    const base = {
      dipendente_id: persona.dipendente_id || null,
      nome: persona.nome.trim(),
      cognome: persona.cognome.trim(),
      note: note.trim() || null,
    }
    try {
      if (isEdit && formazione) {
        const c = corsi[0]
        await updateM.mutateAsync({
          id: formazione.id,
          input: { ...base, ...c },
        })
        toast.success('Formazione aggiornata')
      } else {
        const righe: FormazioneInput[] = corsi.map((c) => ({ ...base, ...c }))
        const n = await createM.mutateAsync(righe)
        toast.success(n === 1 ? 'Corso registrato' : `${n} corsi registrati`)
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
      width={640}
      title={isEdit ? 'Modifica formazione' : 'Nuova formazione sicurezza'}
      subtitle="Corsi e aggiornamenti sulla sicurezza sul lavoro"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-ink-soft">
            {!isEdit && corsi.length > 0 && (
              <>
                <span className="font-semibold text-ink">{corsi.length}</span>{' '}
                {corsi.length === 1 ? 'corso selezionato' : 'corsi selezionati'}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Annulla
            </Button>
            <Button onClick={submit} disabled={saving} icon={saving ? 'loader-circle' : 'save'}>
              {isEdit ? 'Salva' : 'Registra formazione'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <PersonaFields value={persona} onChange={setPersona} />

        {isEdit ? (
          <Field label="Tipo di formazione" required span={12}>
            <Select
              leftIcon="shield-check"
              value={corsi[0]?.tipo_formazione_id ?? ''}
              onChange={(e) =>
                setCorsi((cs) => [{ ...cs[0], tipo_formazione_id: e.target.value }])
              }
            >
              {tipi.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="col-span-12">
            <div className="text-sm font-medium text-ink mb-1.5">
              Corsi <span className="text-bad">*</span>
            </div>
            <p className="text-xs text-ink-soft mb-2.5">
              Seleziona uno o più corsi: per ciascuno indicherai se è un corso o un
              aggiornamento e la data di scadenza.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tipi.map((t) => {
                const on = selezionato(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTipo(t.id)}
                    className={cn(
                      'h-8 px-3 rounded-lg text-[13px] border transition inline-flex items-center gap-1.5',
                      on
                        ? 'bg-navy-600 text-white border-navy-600'
                        : 'bg-white text-ink-soft border-line hover:text-ink hover:border-navy-300'
                    )}
                  >
                    {on && <Icon name="check" size={13} />}
                    {t.nome}
                  </button>
                )
              })}
              {!aggiuntaAperta ? (
                <button
                  type="button"
                  onClick={() => setAggiuntaAperta(true)}
                  className="h-8 px-3 rounded-lg text-[13px] border border-dashed border-line text-ink-soft hover:text-navy-700 hover:border-navy-300 inline-flex items-center gap-1.5"
                >
                  <Icon name="plus" size={13} />
                  Altro corso
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    autoFocus
                    className="w-56"
                    placeholder="Nome del nuovo corso"
                    value={nuovoTipo}
                    onChange={(e) => setNuovoTipo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        aggiungiTipo()
                      }
                      if (e.key === 'Escape') setAggiuntaAperta(false)
                    }}
                  />
                  <Button
                    size="sm"
                    icon={creaTipoM.isPending ? 'loader-circle' : 'check'}
                    onClick={aggiungiTipo}
                    disabled={creaTipoM.isPending || !nuovoTipo.trim()}
                  >
                    Aggiungi
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAggiuntaAperta(false)}>
                    Annulla
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {corsi.length > 0 && (
          <div className="col-span-12 border border-line rounded-lg divide-y divide-line">
            {corsi.map((c) => {
              const nome = tipi.find((t) => t.id === c.tipo_formazione_id)?.nome ?? '—'
              return (
                <div key={c.tipo_formazione_id} className="p-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[140px] text-sm font-medium text-ink">
                    {nome}
                  </div>
                  <div className="flex items-center gap-0.5 bg-canvas border border-line rounded-lg p-0.5">
                    {(['corso', 'aggiornamento'] as const).map((tp) => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => setCorso(c.tipo_formazione_id, { tipologia: tp })}
                        className={cn(
                          'h-8 px-3 rounded-md text-xs transition',
                          c.tipologia === tp
                            ? 'bg-navy-600 text-white'
                            : 'text-ink-soft hover:text-ink'
                        )}
                      >
                        {TIPOLOGIA_FORMAZIONE_LABEL[tp]}
                      </button>
                    ))}
                  </div>
                  <div className="w-44">
                    <Input
                      type="date"
                      value={c.scadenza}
                      onChange={(e) => setCorso(c.tipo_formazione_id, { scadenza: e.target.value })}
                      title="Scadenza del corso o del prossimo aggiornamento"
                    />
                  </div>
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={() => toggleTipo(c.tipo_formazione_id)}
                      className="w-9 h-9 inline-flex items-center justify-center text-ink-faint hover:text-bad rounded-md hover:bg-bad-soft/40"
                      title="Rimuovi"
                    >
                      <Icon name="trash-2" size={15} />
                    </button>
                  )}
                </div>
              )
            })}
            <div className="px-3 py-2 text-[11px] text-ink-soft bg-canvas/50">
              La data è la scadenza del corso o del prossimo aggiornamento obbligatorio.
            </div>
          </div>
        )}

        <Field label="Note" span={12}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Drawer>
  )
}
