import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import type { Ruolo } from '@/lib/types'
import { useAzienda, useUpdateAzienda, type AziendaInput } from '@/features/azienda/api'
import {
  useAssegnazioni,
  useCambiaStatoUtente,
  useCantieriBrevi,
  useCreaUtente,
  useProfili,
  useSalvaAssegnazioni,
  useUpdateProfilo,
  type NuovoUtenteInput,
  type ProfiloUtente,
} from './users-api'
import { STATO_CANTIERE } from '@/features/cantieri/constants'

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
  const statoM = useCambiaStatoUtente()
  const [nuovoOpen, setNuovoOpen] = useState(false)
  const [capoAperto, setCapoAperto] = useState<ProfiloUtente | null>(null)
  const { data: assegnazioni = [] } = useAssegnazioni()
  const contaCantieri = (id: string) =>
    assegnazioni.filter((a) => a.profile_id === id).length

  const changeRuolo = async (id: string, ruolo: Ruolo) => {
    try {
      await updateM.mutateAsync({ id, input: { ruolo } })
      toast.success('Ruolo aggiornato')
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }
  const [daSospendere, setDaSospendere] = useState<ProfiloUtente | null>(null)
  const toggleAttivo = async (u: ProfiloUtente, attivo: boolean) => {
    try {
      await statoM.mutateAsync({ id: u.id, attivo })
      toast.success(attivo ? `${u.nome} riattivato` : `${u.nome} sospeso`)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Utenti e ruoli</h2>
          <p className="text-sm text-ink-soft mt-0.5">
            Crea nuovi utenti e gestisci ruolo e stato di quelli esistenti.
          </p>
        </div>
        <Button icon="user-plus" onClick={() => setNuovoOpen(true)}>
          Nuovo utente
        </Button>
      </div>

      <NuovoUtenteDrawer open={nuovoOpen} onClose={() => setNuovoOpen(false)} />
      <AssegnaCantieriDrawer capo={capoAperto} onClose={() => setCapoAperto(null)} />
      <ConfirmDialog
        open={!!daSospendere}
        danger
        title="Sospendi utente"
        message={
          <>
            Sospendere <strong>{daSospendere?.nome}</strong>? Non potrà più accedere né
            all'app né ai dati finché non lo riattivi. Se in questo momento è collegato,
            l'accesso si chiude entro un'ora al massimo.
          </>
        }
        confirmLabel="Sospendi"
        loading={statoM.isPending}
        onConfirm={async () => {
          if (daSospendere) await toggleAttivo(daSospendere, false)
          setDaSospendere(null)
        }}
        onCancel={() => setDaSospendere(null)}
      />

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

              {u.ruolo === 'capo_cantiere' && (
                <button
                  onClick={() => setCapoAperto(u)}
                  title="Scegli i cantieri che questo capo cantiere può vedere"
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 h-8 rounded-md border transition ${
                    contaCantieri(u.id) === 0
                      ? 'border-warn/50 text-warn-deep bg-warn-soft/40 hover:bg-warn-soft/70'
                      : 'border-line text-ink-soft hover:text-ink hover:border-navy-600/40'
                  }`}
                >
                  <Icon name="hard-hat" size={13} />
                  Cantieri · {contaCantieri(u.id)}
                </button>
              )}

              {u.id !== user?.id && (
                <button
                  onClick={() => (u.attivo ? setDaSospendere(u) : toggleAttivo(u, true))}
                  disabled={statoM.isPending}
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

const VUOTO: NuovoUtenteInput = { nome: '', email: '', password: '', ruolo: 'capo_cantiere' }

/** Password casuale leggibile (senza caratteri ambigui come 0/O, 1/l). */
function generaPassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const buf = new Uint32Array(len)
  crypto.getRandomValues(buf)
  return Array.from(buf, (n) => chars[n % chars.length]).join('')
}

function NuovoUtenteDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const creaM = useCreaUtente()
  const [form, setForm] = useState<NuovoUtenteInput>(VUOTO)
  const [mostra, setMostra] = useState(false)

  const set = <K extends keyof NuovoUtenteInput>(k: K, v: NuovoUtenteInput[K]) =>
    setForm((s) => ({ ...s, [k]: v }))

  const chiudi = () => {
    if (creaM.isPending) return
    setForm(VUOTO)
    setMostra(false)
    onClose()
  }

  const crea = async () => {
    if (!form.nome.trim()) return toast.error('Inserisci nome e cognome')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return toast.error('Indirizzo email non valido')
    if (form.password.length < 8)
      return toast.error('La password deve avere almeno 8 caratteri')
    try {
      await creaM.mutateAsync({ ...form, nome: form.nome.trim(), email: form.email.trim() })
      toast.success(`Utente ${form.nome.trim()} creato`)
      setForm(VUOTO)
      setMostra(false)
      onClose()
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <Drawer
      open={open}
      onClose={chiudi}
      title="Nuovo utente"
      subtitle="L'utente potrà accedere subito con email e password"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={chiudi} disabled={creaM.isPending}>
            Annulla
          </Button>
          <Button
            onClick={crea}
            disabled={creaM.isPending}
            icon={creaM.isPending ? 'loader-circle' : 'user-plus'}
          >
            Crea utente
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          crea()
        }}
        className="grid grid-cols-12 gap-4"
      >
        <Field label="Nome e cognome" required span={12}>
          <Input
            placeholder="es. Mario Rossi"
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
          />
        </Field>
        <Field label="Email" required span={12} hint="Serve per accedere all'app.">
          <Input
            leftIcon="mail"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
        <Field
          label="Password iniziale"
          required
          span={12}
          hint="Almeno 8 caratteri. Comunicala tu all'utente: l'app non invia email di benvenuto."
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                leftIcon="lock"
                type={mostra ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMostra((m) => !m)}
            >
              {mostra ? 'Nascondi' : 'Mostra'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon="refresh-cw"
              onClick={() => {
                set('password', generaPassword())
                setMostra(true)
              }}
            >
              Genera
            </Button>
          </div>
        </Field>
        <Field label="Ruolo" required span={12}>
          <Select
            value={form.ruolo}
            onChange={(e) => set('ruolo', e.target.value as Ruolo)}
          >
            <option value="capo_cantiere">{RUOLO_LABEL.capo_cantiere}</option>
            <option value="direzione">{RUOLO_LABEL.direzione}</option>
            <option value="admin">{RUOLO_LABEL.admin}</option>
          </Select>
        </Field>
      </form>
    </Drawer>
  )
}

function AssegnaCantieriDrawer({
  capo,
  onClose,
}: {
  capo: ProfiloUtente | null
  onClose: () => void
}) {
  const toast = useToast()
  const { data: cantieri = [], isLoading } = useCantieriBrevi()
  const { data: assegnazioni = [] } = useAssegnazioni()
  const salvaM = useSalvaAssegnazioni()
  const [scelti, setScelti] = useState<string[]>([])
  const [cerca, setCerca] = useState('')
  const [mostraChiusi, setMostraChiusi] = useState(false)
  const [capoCaricato, setCapoCaricato] = useState<string | null>(null)

  const prima = capo
    ? assegnazioni.filter((a) => a.profile_id === capo.id).map((a) => a.cantiere_id)
    : []

  // All'apertura per un nuovo capo, parto dalle sue assegnazioni attuali.
  if (capo && capoCaricato !== capo.id) {
    setCapoCaricato(capo.id)
    setScelti(prima)
    setCerca('')
    setMostraChiusi(false)
  }

  const chiudi = () => {
    if (salvaM.isPending) return
    setCapoCaricato(null)
    onClose()
  }

  const toggle = (id: string) =>
    setScelti((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const q = cerca.trim().toLowerCase()
  const visibili = cantieri.filter((c) => {
    // un cantiere chiuso gia' assegnato resta sempre visibile, per poterlo togliere
    if (c.stato === 'chiuso' && !mostraChiusi && !scelti.includes(c.id)) return false
    if (!q) return true
    return c.codice.toLowerCase().includes(q) || c.nome.toLowerCase().includes(q)
  })

  const salva = async () => {
    if (!capo) return
    try {
      await salvaM.mutateAsync({ profileId: capo.id, prima, dopo: scelti })
      toast.success(
        scelti.length === 0
          ? `${capo.nome} non ha più cantieri assegnati`
          : `${capo.nome}: ${scelti.length} ${scelti.length === 1 ? 'cantiere assegnato' : 'cantieri assegnati'}`
      )
      setCapoCaricato(null)
      onClose()
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  return (
    <Drawer
      open={!!capo}
      onClose={chiudi}
      title="Cantieri assegnati"
      subtitle={
        capo
          ? `${capo.nome} vede e compila rapportini, materiali e allegati solo dei cantieri selezionati`
          : undefined
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">
            {scelti.length} {scelti.length === 1 ? 'selezionato' : 'selezionati'}
          </span>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={chiudi} disabled={salvaM.isPending}>
              Annulla
            </Button>
            <Button
              onClick={salva}
              disabled={salvaM.isPending}
              icon={salvaM.isPending ? 'loader-circle' : 'check'}
            >
              Salva
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          leftIcon="search"
          placeholder="Cerca per codice o nome"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-ink-soft select-none">
          <input
            type="checkbox"
            checked={mostraChiusi}
            onChange={(e) => setMostraChiusi(e.target.checked)}
          />
          Mostra anche i cantieri chiusi
        </label>

        {isLoading ? (
          <div className="py-10 text-center">
            <Icon name="loader-circle" size={22} className="animate-spin text-navy-600 mx-auto" />
          </div>
        ) : visibili.length === 0 ? (
          <p className="text-sm text-ink-soft py-6 text-center">Nessun cantiere trovato.</p>
        ) : (
          <div className="border border-line rounded-lg overflow-hidden">
            {visibili.map((c, i) => {
              const st = STATO_CANTIERE[c.stato]
              const on = scelti.includes(c.id)
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition ${
                    i > 0 ? 'border-t border-line' : ''
                  } ${on ? 'bg-navy-50/60' : 'hover:bg-canvas'}`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate">{c.nome}</div>
                    <div className="text-xs text-ink-soft font-mono">{c.codice}</div>
                  </div>
                  {c.manutenzione && (
                    <Badge tone="good" icon="wrench">
                      Manutenzione
                    </Badge>
                  )}
                  <Badge tone={st.tone}>{st.label}</Badge>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </Drawer>
  )
}
