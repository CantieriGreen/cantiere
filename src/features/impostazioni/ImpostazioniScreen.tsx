import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { Field, Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import type { Ruolo } from '@/lib/types'
import { useAzienda, useUpdateAzienda, type AziendaInput } from '@/features/azienda/api'
import { useProfili, useUpdateProfilo } from './users-api'

const TABS = [
  { id: 'azienda', label: 'Dati azienda', icon: 'building-2' },
  { id: 'utenti', label: 'Utenti e ruoli', icon: 'users' },
]

const RUOLO_LABEL: Record<Ruolo, string> = {
  admin: 'Amministratore',
  capo_cantiere: 'Capo cantiere',
  direzione: 'Direzione',
}
const RUOLO_TONE: Record<Ruolo, 'navy' | 'warn' | 'neutral'> = {
  admin: 'navy',
  capo_cantiere: 'warn',
  direzione: 'neutral',
}

export function ImpostazioniScreen() {
  const [tab, setTab] = useState('azienda')
  return (
    <div>
      <PageHeader
        title="Impostazioni"
        banner="Dati dell'azienda (usati per intestare report e offerte) e gestione di utenti e ruoli."
      />
      <Card noPad className="overflow-hidden">
        <div className="grid grid-cols-12">
          <div className="col-span-12 md:col-span-3 border-r border-line bg-canvas/50 p-3">
            <nav className="space-y-0.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 h-10 rounded-md text-sm transition text-left ${
                    tab === t.id
                      ? 'bg-white border border-line text-navy-700 font-medium shadow-card'
                      : 'text-ink-soft hover:text-ink hover:bg-white'
                  }`}
                >
                  <Icon name={t.icon} size={15} />
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="col-span-12 md:col-span-9 p-6">
            {tab === 'azienda' && <TabAzienda />}
            {tab === 'utenti' && <TabUtenti />}
          </div>
        </div>
      </Card>
    </div>
  )
}

function TabAzienda() {
  const toast = useToast()
  const { data: azienda, isLoading } = useAzienda()
  const updateM = useUpdateAzienda()
  const [form, setForm] = useState<AziendaInput>({})

  useEffect(() => {
    if (azienda) {
      setForm({
        ragione_sociale: azienda.ragione_sociale,
        forma_giuridica: azienda.forma_giuridica ?? '',
        partita_iva: azienda.partita_iva ?? '',
        codice_fiscale: azienda.codice_fiscale ?? '',
        codice_sdi: azienda.codice_sdi ?? '',
        sede_legale: azienda.sede_legale ?? '',
        citta: azienda.citta ?? '',
        provincia: azienda.provincia ?? '',
        cap: azienda.cap ?? '',
        telefono: azienda.telefono ?? '',
        email: azienda.email ?? '',
        pec: azienda.pec ?? '',
        iban: azienda.iban ?? '',
        rea: azienda.rea ?? '',
      })
    }
  }, [azienda])

  const set = (k: keyof AziendaInput, v: string) =>
    setForm((s) => ({ ...s, [k]: v }))

  const salva = async () => {
    if (!form.ragione_sociale?.trim())
      return toast.error('La ragione sociale è obbligatoria')
    try {
      await updateM.mutateAsync(form)
      toast.success('Dati azienda salvati')
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  if (isLoading)
    return (
      <div className="py-10 text-center">
        <Icon name="loader-circle" size={22} className="animate-spin text-navy-600 mx-auto" />
      </div>
    )

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-ink">Dati azienda</h2>
        <p className="text-sm text-ink-soft mt-0.5">
          Compaiono nell'intestazione di report e offerte.
        </p>
      </div>
      <div className="grid grid-cols-12 gap-5">
        <Field label="Ragione sociale" required span={8}>
          <Input value={form.ragione_sociale ?? ''} onChange={(e) => set('ragione_sociale', e.target.value)} />
        </Field>
        <Field label="Forma giuridica" span={4}>
          <Select value={form.forma_giuridica ?? ''} onChange={(e) => set('forma_giuridica', e.target.value)}>
            <option value="">—</option>
            <option value="srl">srl</option>
            <option value="spa">spa</option>
            <option value="snc">snc</option>
            <option value="sas">sas</option>
            <option value="ditta individuale">ditta individuale</option>
          </Select>
        </Field>
        <Field label="Partita IVA" span={4}>
          <Input value={form.partita_iva ?? ''} onChange={(e) => set('partita_iva', e.target.value)} />
        </Field>
        <Field label="Codice fiscale" span={4}>
          <Input value={form.codice_fiscale ?? ''} onChange={(e) => set('codice_fiscale', e.target.value)} />
        </Field>
        <Field label="Codice SDI" span={4}>
          <Input value={form.codice_sdi ?? ''} onChange={(e) => set('codice_sdi', e.target.value)} />
        </Field>
        <Field label="Sede legale" span={8}>
          <Input value={form.sede_legale ?? ''} onChange={(e) => set('sede_legale', e.target.value)} />
        </Field>
        <Field label="Città" span={2}>
          <Input value={form.citta ?? ''} onChange={(e) => set('citta', e.target.value)} />
        </Field>
        <Field label="Prov." span={2}>
          <Input maxLength={2} value={form.provincia ?? ''} onChange={(e) => set('provincia', e.target.value)} />
        </Field>
        <Field label="Telefono" span={6}>
          <Input leftIcon="phone" value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} />
        </Field>
        <Field label="Email" span={6}>
          <Input leftIcon="mail" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="PEC" span={6}>
          <Input leftIcon="mail" value={form.pec ?? ''} onChange={(e) => set('pec', e.target.value)} />
        </Field>
        <Field label="IBAN" span={6}>
          <Input leftIcon="banknote" value={form.iban ?? ''} onChange={(e) => set('iban', e.target.value)} />
        </Field>
        <Field label="REA" span={4}>
          <Input value={form.rea ?? ''} onChange={(e) => set('rea', e.target.value)} />
        </Field>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3 pt-5 border-t border-line">
        <Button
          icon={updateM.isPending ? 'loader-circle' : 'check'}
          onClick={salva}
          disabled={updateM.isPending}
        >
          Salva
        </Button>
      </div>
    </div>
  )
}

function TabUtenti() {
  const toast = useToast()
  const { user } = useAuth()
  const { data: utenti = [], isLoading } = useProfili()
  const updateM = useUpdateProfilo()

  const changeRuolo = async (id: string, ruolo: Ruolo) => {
    try {
      await updateM.mutateAsync({ id, input: { ruolo } })
      toast.success('Ruolo aggiornato')
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }
  const toggleAttivo = async (id: string, attivo: boolean) => {
    try {
      await updateM.mutateAsync({ id, input: { attivo } })
      toast.success(attivo ? 'Utente riattivato' : 'Utente sospeso')
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-ink">Utenti e ruoli</h2>
        <p className="text-sm text-ink-soft mt-0.5">
          Gestisci ruolo e stato degli utenti. I nuovi utenti si creano dalla
          dashboard Supabase (Authentication).
        </p>
      </div>

      {isLoading ? (
        <div className="py-10 text-center">
          <Icon name="loader-circle" size={22} className="animate-spin text-navy-600 mx-auto" />
        </div>
      ) : (
        <div className="border border-line rounded-lg overflow-hidden">
          {utenti.map((u, i) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0 ? 'border-t border-line' : ''
              } ${!u.attivo ? 'bg-line-soft/40' : ''}`}
            >
              <Avatar name={u.nome} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink">
                  {u.nome}
                  {u.id === user?.id && (
                    <span className="text-xs text-ink-soft font-normal"> (tu)</span>
                  )}
                </div>
                <div className="text-xs text-ink-soft">
                  {u.attivo ? 'Attivo' : 'Sospeso'}
                </div>
              </div>

              <div className="w-44">
                <Select
                  value={u.ruolo}
                  onChange={(e) => changeRuolo(u.id, e.target.value as Ruolo)}
                  disabled={u.id === user?.id}
                >
                  <option value="admin">{RUOLO_LABEL.admin}</option>
                  <option value="capo_cantiere">{RUOLO_LABEL.capo_cantiere}</option>
                  <option value="direzione">{RUOLO_LABEL.direzione}</option>
                </Select>
              </div>

              <Badge tone={RUOLO_TONE[u.ruolo]}>{RUOLO_LABEL[u.ruolo]}</Badge>

              {u.id !== user?.id && (
                <button
                  onClick={() => toggleAttivo(u.id, !u.attivo)}
                  className={`text-xs px-2.5 h-8 rounded-md border transition ${
                    u.attivo
                      ? 'border-line text-ink-soft hover:text-bad hover:border-bad/40'
                      : 'border-good/40 text-good-deep hover:bg-good-soft/40'
                  }`}
                >
                  {u.attivo ? 'Sospendi' : 'Riattiva'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
