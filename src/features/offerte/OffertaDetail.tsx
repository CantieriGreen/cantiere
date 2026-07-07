import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { eu, todayISO, downloadBlob } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type {
  OffertaMateriale,
  OffertaPagamento,
  StatoOfferta,
} from '@/lib/types'
import { useClienti } from '@/features/clienti/api'
import { useCantieri } from '@/features/cantieri/api'
import { useAzienda } from '@/features/azienda/api'
import {
  useOfferta,
  useCreateOfferta,
  useUpdateOfferta,
  useCambiaStatoOfferta,
  useConvertiInCantiere,
  type OffertaFormData,
} from './api'
import { StatoOffertaSelect } from './StatoOffertaSelect'
import { generaOffertaDocx, offertaFileName } from './genera-docx'

const TIPI_MATERIALE = [
  'Cemento e malte', 'Ferro e tondini', 'Laterizi', 'Pavimenti',
  'Rivestimenti', 'Sanitari', 'Impianto elettrico', 'Impianto idraulico',
  'Pittura', 'Isolanti', 'Altro',
]

function n(v: string): number {
  return Number(v.replace(',', '.')) || 0
}
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

export function OffertaDetail() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()

  const { data: clienti = [] } = useClienti()
  const { data: cantieri = [] } = useCantieri()
  const { data: azienda } = useAzienda()
  const { data: offerta, isLoading } = useOfferta(id)
  const createM = useCreateOfferta()
  const updateM = useUpdateOfferta()
  const cambiaStatoM = useCambiaStatoOfferta()
  const convertiM = useConvertiInCantiere()

  // ---- stato form ----
  const [titolo, setTitolo] = useState('')
  const [data, setData] = useState(todayISO())
  const [clienteTipo, setClienteTipo] = useState<'esistente' | 'nuovo'>('esistente')
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [localita, setLocalita] = useState('')
  const [cantiereId, setCantiereId] = useState('')
  const [tipo, setTipo] = useState('')
  const [categoria, setCategoria] = useState('ristrutturazione')
  const [superficie, setSuperficie] = useState('')
  const [piani, setPiani] = useState('')
  const [struttura, setStruttura] = useState('')
  const [finiture, setFiniture] = useState('')
  const [garanzia, setGaranzia] = useState('')
  const [durata, setDurata] = useState('')
  const [importo, setImporto] = useState('')
  const [oneri, setOneri] = useState('')
  const [tempistiche, setTempistiche] = useState('')
  const [esclusioni, setEsclusioni] = useState('')
  const [note, setNote] = useState('')
  const [materiali, setMateriali] = useState<OffertaMateriale[]>([])
  const [pagamenti, setPagamenti] = useState<OffertaPagamento[]>([
    { percentuale: 30, descrizione: 'Acconto alla firma del contratto', ord: 0 },
    { percentuale: 40, descrizione: 'A SAL intermedio', ord: 1 },
    { percentuale: 30, descrizione: 'A fine lavori e collaudo', ord: 2 },
  ])
  const [revNota, setRevNota] = useState('')

  useEffect(() => {
    if (offerta) {
      setTitolo(offerta.titolo)
      setData(offerta.data)
      setClienteTipo(offerta.cliente_id ? 'esistente' : offerta.cliente_nome ? 'nuovo' : 'esistente')
      setClienteId(offerta.cliente_id ?? '')
      setClienteNome(offerta.cliente_nome ?? '')
      setLocalita(offerta.localita ?? '')
      setCantiereId(offerta.cantiere_id ?? '')
      setTipo(offerta.tipo ?? '')
      setCategoria(offerta.categoria ?? 'ristrutturazione')
      setSuperficie(offerta.superficie_mq ? String(offerta.superficie_mq) : '')
      setPiani(offerta.piani ? String(offerta.piani) : '')
      setStruttura(offerta.struttura ?? '')
      setFiniture(offerta.finiture ?? '')
      setGaranzia(offerta.garanzia ?? '')
      setDurata(offerta.durata_mesi ? String(offerta.durata_mesi) : '')
      setImporto(String(offerta.importo))
      setOneri(String(offerta.oneri_sicurezza))
      setTempistiche(offerta.tempistiche ?? '')
      setEsclusioni(offerta.esclusioni ?? '')
      setNote(offerta.note ?? '')
      setMateriali(offerta.materiali.map((m) => ({ ...m })))
      if (offerta.pagamenti.length) setPagamenti(offerta.pagamenti.map((p) => ({ ...p })))
    }
  }, [offerta])

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Icon name="loader-circle" size={26} className="animate-spin text-navy-600" />
      </div>
    )
  }
  if (!isNew && !offerta) {
    return (
      <Card>
        <EmptyState
          icon="circle-alert"
          title="Offerta non trovata"
          action={<Button variant="secondary" icon="arrow-left" onClick={() => navigate('/offerte')}>Torna alle offerte</Button>}
        />
      </Card>
    )
  }

  // ---- calcoli ----
  const totPct = pagamenti.reduce((s, p) => s + Number(p.percentuale || 0), 0)
  const matBase = materiali.reduce((s, m) => s + Number(m.importo || 0), 0)
  const matFinale = materiali.reduce((s, m) => s + Number(m.importo || 0) * (1 + Number(m.ricarico_pct || 0) / 100), 0)

  const cantieriCliente = cantieri.filter((c) =>
    clienteTipo === 'esistente' && clienteId ? c.cliente_id === clienteId : true
  )

  const buildForm = (): OffertaFormData => ({
    titolo: titolo.trim(),
    data,
    cliente_id: clienteTipo === 'esistente' ? clienteId || null : null,
    cliente_nome: clienteTipo === 'nuovo' ? clienteNome.trim() || null : null,
    localita: localita.trim() || null,
    cantiere_id: cantiereId || null,
    tipo: tipo.trim() || null,
    categoria: categoria || null,
    superficie_mq: superficie ? n(superficie) : null,
    piani: piani ? parseInt(piani, 10) : null,
    struttura: struttura.trim() || null,
    finiture: finiture.trim() || null,
    garanzia: garanzia.trim() || null,
    durata_mesi: durata ? parseInt(durata, 10) : null,
    importo: n(importo),
    oneri_sicurezza: n(oneri),
    tempistiche: tempistiche.trim() || null,
    esclusioni: esclusioni.trim() || null,
    note: note.trim() || null,
    materiali: materiali.map((m, i) => ({ ...m, ord: i })),
    pagamenti: pagamenti.map((p, i) => ({ ...p, ord: i })),
  })

  const validate = (): string | null => {
    if (!titolo.trim()) return 'Inserisci il titolo'
    if (clienteTipo === 'esistente' && !clienteId) return 'Seleziona un cliente'
    if (clienteTipo === 'nuovo' && !clienteNome.trim()) return 'Inserisci il nome del nuovo cliente'
    return null
  }

  const handleSalva = async (nuovaRevisione: boolean) => {
    const err = validate()
    if (err) return toast.error(err)
    const form = buildForm()
    try {
      if (isNew) {
        const created = await createM.mutateAsync(form)
        toast.success('Offerta creata')
        navigate(`/offerte/${created.id}`)
      } else if (offerta) {
        await updateM.mutateAsync({
          id: offerta.id,
          form,
          nuovaRevisione,
          notaRevisione: revNota.trim(),
          revisioneCorrente: offerta.revisione,
        })
        toast.success(nuovaRevisione ? 'Nuova revisione salvata' : 'Offerta aggiornata')
        setRevNota('')
      }
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const handleGeneraWord = async () => {
    if (isNew || !offerta) {
      return toast.error('Salva prima l\'offerta')
    }
    try {
      // ricarico l'offerta completa aggiornata
      const blob = await generaOffertaDocx(
        { ...offerta, ...buildForm(), numero: offerta.numero, revisione: offerta.revisione } as never,
        azienda ?? null
      )
      const cliente = offerta.cliente?.ragione_sociale ?? offerta.cliente_nome ?? 'Cliente'
      const fileName = offertaFileName(offerta.numero, cliente)
      downloadBlob(blob, fileName)

      // allega al cantiere associato (se presente)
      if (cantiereId) {
        const path = `${cantiereId}/${Date.now()}_${fileName}`
        const arrayBuffer = await blob.arrayBuffer()
        const { error: upErr } = await supabase.storage
          .from('allegati')
          .upload(path, new Blob([arrayBuffer]), {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          })
        if (!upErr) {
          await supabase.from('allegati_cantiere').insert({
            cantiere_id: cantiereId,
            storage_path: path,
            nome_file: fileName,
            mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size_bytes: blob.size,
            origine: 'offerta',
            offerta_id: offerta.id,
            uploaded_by: profile?.id ?? null,
          })
          toast.success('Word generato e allegato al cantiere')
        } else {
          toast.success('Word generato e scaricato')
        }
      } else {
        toast.success('Word generato e scaricato')
      }
    } catch (e) {
      toast.error('Errore generazione: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const handleConverti = async () => {
    if (!offerta) return
    try {
      const codice = await convertiM.mutateAsync(offerta)
      toast.success(`Cantiere ${codice} creato dall'offerta`)
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : 'sconosciuto'))
    }
  }

  const changeStato = async (s: StatoOfferta) => {
    if (!offerta) return
    try {
      await cambiaStatoM.mutateAsync({ id: offerta.id, stato: s })
    } catch (e) {
      toast.error('Errore: ' + (e instanceof Error ? e.message : ''))
    }
  }

  // ---- materiali editing ----
  const setMat = (i: number, patch: Partial<OffertaMateriale>) =>
    setMateriali((a) => a.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  const addMat = () =>
    setMateriali((a) => [...a, { tipo: TIPI_MATERIALE[0], descrizione: '', importo: 0, ricarico_pct: 0, ord: a.length }])
  const delMat = (i: number) => setMateriali((a) => a.filter((_, j) => j !== i))

  // ---- pagamenti editing ----
  const setPag = (i: number, patch: Partial<OffertaPagamento>) =>
    setPagamenti((a) => a.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const addPag = () =>
    setPagamenti((a) => [...a, { percentuale: 0, descrizione: '', ord: a.length }])
  const delPag = (i: number) => setPagamenti((a) => a.filter((_, j) => j !== i))

  const saving = createM.isPending || updateM.isPending
  const giaConvertita = offerta?.commessa_creata

  return (
    <div className="max-w-5xl pb-24">
      <PageHeader
        breadcrumb={['Offerte', isNew ? 'Nuova' : offerta!.numero]}
        title={isNew ? 'Nuova offerta' : titolo || offerta!.numero}
        subtitle={
          !isNew && offerta ? (
            <span className="inline-flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs bg-line-soft px-1.5 py-0.5 rounded">
                {offerta.numero}
              </span>
              <Badge tone="navy" icon="git-commit-horizontal">
                Revisione {String(offerta.revisione).padStart(2, '0')}
              </Badge>
            </span>
          ) : undefined
        }
        banner="Compila i dati dell'offerta, genera il documento Word e — se accettata — convertila in cantiere."
        actions={
          <>
            <Button variant="secondary" icon="arrow-left" onClick={() => navigate('/offerte')}>
              Indietro
            </Button>
            {!isNew && offerta && (
              <StatoOffertaSelect value={offerta.stato} onChange={changeStato} />
            )}
          </>
        }
      />

      {/* Intestazione */}
      <Card className="mb-5">
        <SezioneTitolo icon="file-text" title="Intestazione offerta" />
        <div className="grid grid-cols-12 gap-5">
          <Field label="Titolo offerta" required span={6}>
            <Input size="lg" value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="es. Ristrutturazione facciate condominio" />
          </Field>
          <Field label="Numero" span={3} hint={isNew ? 'assegnato al salvataggio' : undefined}>
            <Input size="lg" disabled value={isNew ? 'EC-P-2026-…' : offerta!.numero} leftIcon="hash" />
          </Field>
          <Field label="Data" required span={3}>
            <Input size="lg" type="date" leftIcon="calendar" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Committente */}
      <Card className="mb-5">
        <SezioneTitolo icon="building" title="Committente" />
        <div className="grid grid-cols-12 gap-5">
          <Field label="Tipo cliente" span={12}>
            <div className="flex items-center gap-1.5 bg-canvas border border-line rounded-lg p-0.5 w-fit">
              {(['esistente', 'nuovo'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setClienteTipo(t)}
                  className={`h-9 px-4 rounded-md text-sm transition ${
                    clienteTipo === t ? 'bg-white text-ink shadow-card font-medium' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {t === 'esistente' ? 'Cliente esistente' : 'Nuovo cliente'}
                </button>
              ))}
            </div>
          </Field>
          {clienteTipo === 'esistente' ? (
            <Field label="Cliente" required span={6}>
              <Select size="lg" leftIcon="building" value={clienteId} onChange={(e) => { setClienteId(e.target.value); setCantiereId('') }}>
                <option value="">— Seleziona cliente —</option>
                {clienti.map((c) => (
                  <option key={c.id} value={c.id}>{c.ragione_sociale}</option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Nuovo cliente" required span={6} hint="verrà solo memorizzato nell'offerta">
              <Input size="lg" leftIcon="building" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Ragione sociale" />
            </Field>
          )}
          <Field label="Località" span={3}>
            <Input size="lg" leftIcon="map-pin" value={localita} onChange={(e) => setLocalita(e.target.value)} placeholder="Città (PR)" />
          </Field>
          <Field label="Cantiere associato" span={3} hint="il Word generato verrà allegato qui">
            <Select size="lg" leftIcon="hard-hat" value={cantiereId} onChange={(e) => setCantiereId(e.target.value)}>
              <option value="">— Nessuno —</option>
              {cantieriCliente.map((c) => (
                <option key={c.id} value={c.id}>{c.codice} — {c.nome}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {/* Dati intervento */}
      <Card className="mb-5">
        <SezioneTitolo icon="hard-hat" title="Sintesi della proposta" />
        <div className="grid grid-cols-12 gap-5">
          <Field label="Tipo di intervento" span={8}>
            <Input size="lg" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="es. Ristrutturazione completa edificio" />
          </Field>
          <Field label="Categoria lavori" span={4}>
            <Select size="lg" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="ristrutturazione">Ristrutturazione</option>
              <option value="nuova-costruzione">Nuova costruzione</option>
              <option value="ampliamento">Ampliamento</option>
              <option value="manutenzione">Manutenzione straordinaria</option>
            </Select>
          </Field>
          <Field label="Superficie" span={4}>
            <Input size="lg" value={superficie} onChange={(e) => setSuperficie(e.target.value)} rightAddon="mq" />
          </Field>
          <Field label="Piani / livelli" span={4}>
            <Input size="lg" value={piani} onChange={(e) => setPiani(e.target.value)} />
          </Field>
          <Field label="Durata lavori" span={4}>
            <Input size="lg" value={durata} onChange={(e) => setDurata(e.target.value)} rightAddon="mesi" />
          </Field>
          <Field label="Struttura" span={6}>
            <Input size="lg" value={struttura} onChange={(e) => setStruttura(e.target.value)} />
          </Field>
          <Field label="Finiture" span={6}>
            <Input size="lg" value={finiture} onChange={(e) => setFiniture(e.target.value)} />
          </Field>
          <Field label="Garanzia opere" span={6}>
            <Input size="lg" value={garanzia} onChange={(e) => setGaranzia(e.target.value)} placeholder="es. 10 anni sulle opere strutturali" />
          </Field>
        </div>
      </Card>

      {/* Materiali con ricarico */}
      <Card className="mb-5">
        <SezioneTitolo icon="package" title="Configurazione materiali" />
        <p className="text-sm text-ink-soft -mt-2 mb-4">
          Voci di materiale con ricarico. Il prezzo finale è calcolato automaticamente.
        </p>
        {materiali.length > 0 && (
          <div className="hidden md:grid grid-cols-12 gap-2 px-1 mb-1.5 text-[11px] uppercase tracking-wide text-ink-soft font-semibold">
            <div className="col-span-3">Tipologia</div>
            <div className="col-span-3">Descrizione</div>
            <div className="col-span-2 text-right">Importo</div>
            <div className="col-span-1 text-right">Ricarico</div>
            <div className="col-span-2 text-right">Prezzo finale</div>
            <div className="col-span-1" />
          </div>
        )}
        <div className="space-y-2">
          {materiali.map((m, i) => {
            const finale = Number(m.importo || 0) * (1 + Number(m.ricarico_pct || 0) / 100)
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-12 md:col-span-3">
                  <Select value={m.tipo ?? ''} onChange={(e) => setMat(i, { tipo: e.target.value })}>
                    {TIPI_MATERIALE.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
                <div className="col-span-12 md:col-span-3">
                  <Input value={m.descrizione ?? ''} onChange={(e) => setMat(i, { descrizione: e.target.value })} placeholder="descrizione" />
                </div>
                <div className="col-span-5 md:col-span-2">
                  <Input inputMode="decimal" value={String(m.importo)} onChange={(e) => setMat(i, { importo: n(e.target.value) })} rightAddon="€" />
                </div>
                <div className="col-span-4 md:col-span-1">
                  <Input inputMode="decimal" value={String(m.ricarico_pct)} onChange={(e) => setMat(i, { ricarico_pct: n(e.target.value) })} rightAddon="%" />
                </div>
                <div className="col-span-2 md:col-span-2 text-right num font-semibold text-ink">
                  {eu(finale, { decimals: 2 })}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button type="button" onClick={() => delMat(i)} className="w-9 h-9 inline-flex items-center justify-center text-ink-faint hover:text-bad rounded-md hover:bg-bad-soft/40">
                    <Icon name="trash-2" size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
          <Button variant="ghost" size="sm" icon="plus" onClick={addMat}>Aggiungi materiale</Button>
          {materiali.length > 0 && (
            <div className="flex items-center gap-5 text-sm">
              <span className="text-ink-soft">Imponibile <span className="num text-ink font-medium">{eu(matBase, { decimals: 2 })}</span></span>
              <span className="text-ink-soft">Con ricarico <span className="num text-navy-700 font-semibold text-base">{eu(matFinale, { decimals: 2 })}</span></span>
              <Button variant="secondary" size="sm" icon="arrow-down" onClick={() => setImporto(String(Math.round(matFinale)))}>
                Usa come importo
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Offerta economica */}
      <Card className="mb-5">
        <SezioneTitolo icon="wallet" title="Offerta economica" />
        <div className="grid grid-cols-12 gap-5">
          <Field label="Importo lavori (IVA esclusa)" required span={6}>
            <Input size="lg" inputMode="decimal" value={importo} onChange={(e) => setImporto(e.target.value)} rightAddon="€" />
          </Field>
          <Field label="Di cui oneri sicurezza" span={6}>
            <Input size="lg" inputMode="decimal" value={oneri} onChange={(e) => setOneri(e.target.value)} rightAddon="€" />
          </Field>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-ink">Modalità di pagamento</label>
            <span className={`text-xs font-medium num ${Math.abs(totPct - 100) < 0.5 ? 'text-good-deep' : 'text-warn-deep'}`}>
              Totale {totPct}% {Math.abs(totPct - 100) < 0.5 ? '' : '(dovrebbe essere 100%)'}
            </span>
          </div>
          <div className="space-y-2">
            {pagamenti.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-24">
                  <Input inputMode="decimal" value={String(p.percentuale)} onChange={(e) => setPag(i, { percentuale: n(e.target.value) })} rightAddon="%" />
                </div>
                <Input className="flex-1" value={p.descrizione} onChange={(e) => setPag(i, { descrizione: e.target.value })} placeholder="Descrizione acconto" />
                <button type="button" onClick={() => delPag(i)} className="w-9 h-9 inline-flex items-center justify-center text-ink-faint hover:text-bad rounded-md hover:bg-bad-soft/40 shrink-0">
                  <Icon name="trash-2" size={15} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon="plus" className="mt-2" onClick={addPag}>Aggiungi acconto</Button>
        </div>
      </Card>

      {/* Testi */}
      <Card className="mb-5">
        <SezioneTitolo icon="file-pen-line" title="Tempistiche, esclusioni e note" />
        <div className="grid grid-cols-12 gap-5">
          <Field label="Tempistiche di realizzazione" span={12}>
            <Textarea rows={2} value={tempistiche} onChange={(e) => setTempistiche(e.target.value)} />
          </Field>
          <Field label="Esclusioni" span={12}>
            <Textarea rows={2} value={esclusioni} onChange={(e) => setEsclusioni(e.target.value)} />
          </Field>
          <Field label="Note interne" span={12} hint="non incluse nel documento cliente">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Conversione in cantiere */}
      {!isNew && offerta && offerta.stato === 'ok' && (
        <Card className={`mb-5 ${giaConvertita ? 'bg-good-soft/40 border-good/30' : 'bg-navy-600 border-navy-600 text-white'}`}>
          {giaConvertita ? (
            <div className="flex items-start gap-3">
              <Icon name="circle-check" size={20} className="text-good-deep mt-0.5" />
              <div className="text-sm">
                <div className="text-good-deep font-semibold">Offerta convertita in cantiere</div>
                <div className="text-ink-soft mt-1">
                  È stato creato il cantiere{' '}
                  <button onClick={() => { const c = cantieri.find((x) => x.codice === giaConvertita); if (c) navigate(`/cantieri/${c.id}`) }} className="text-navy-700 font-medium hover:underline font-mono">
                    {giaConvertita}
                  </button>{' '}
                  con valore contratto pari all'importo dell'offerta.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Icon name="hard-hat" size={22} /></div>
                <div>
                  <div className="text-[15px] font-semibold">Offerta accettata dal cliente</div>
                  <p className="text-sm text-navy-100 mt-1 max-w-2xl">Trasformala in cantiere commessa: verrà creato con valore contratto = {eu(n(importo))}.</p>
                </div>
              </div>
              <button onClick={handleConverti} disabled={convertiM.isPending} className="h-10 px-4 inline-flex items-center gap-2 rounded-lg bg-white text-navy-700 hover:bg-navy-50 text-sm font-medium whitespace-nowrap">
                <Icon name={convertiM.isPending ? 'loader-circle' : 'arrow-right-left'} size={16} /> Trasforma in commessa
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Storico revisioni */}
      {!isNew && offerta && offerta.revisioni.length > 0 && (
        <Card className="mb-5">
          <SezioneTitolo icon="history" title="Storico revisioni" />
          <div className="space-y-2 mb-4">
            {[...offerta.revisioni].reverse().map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-3 border border-line rounded-lg">
                <Badge tone={v.revisione === offerta.revisione ? 'navy' : 'neutral'}>
                  R{String(v.revisione).padStart(2, '0')}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink">{v.nota}</div>
                  <div className="text-xs text-ink-soft mt-0.5">{v.autore ?? '—'} · {formatDate(v.data)}</div>
                </div>
                {v.revisione === offerta.revisione && <span className="text-xs text-good-deep font-medium">corrente</span>}
              </div>
            ))}
          </div>
          <div className="p-3 bg-canvas/60 border border-line rounded-lg">
            <label className="block text-sm font-medium text-ink mb-1.5">Nota prossima revisione</label>
            <Input value={revNota} onChange={(e) => setRevNota(e.target.value)} placeholder={`es. aggiornamento prezzi · diventerà R${String(offerta.revisione + 1).padStart(2, '0')}`} />
          </div>
        </Card>
      )}

      {/* Footer azioni */}
      <div className="sticky bottom-0 -mx-7 px-7 py-4 bg-white/90 backdrop-blur border-t border-line flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-ink-soft flex items-center gap-1.5 min-w-0 flex-1">
          <Icon name="info" size={13} className="shrink-0" />
          <span className="truncate">Il documento Word è modificabile fuori dall'app (Word, LibreOffice…).</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="lg" onClick={() => navigate('/offerte')} disabled={saving}>
            Annulla
          </Button>
          {isNew ? (
            <Button size="lg" icon={saving ? 'loader-circle' : 'save'} onClick={() => handleSalva(false)} disabled={saving}>
              Crea offerta
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="lg" icon="save" onClick={() => handleSalva(false)} disabled={saving}>
                Salva
              </Button>
              <Button variant="secondary" size="lg" icon="git-commit-horizontal" onClick={() => handleSalva(true)} disabled={saving}>
                Salva come R{String((offerta?.revisione ?? 1) + 1).padStart(2, '0')}
              </Button>
              <Button size="lg" icon="file-down" onClick={handleGeneraWord}>
                Genera Word
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SezioneTitolo({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-md bg-navy-50 text-navy-600 flex items-center justify-center">
        <Icon name={icon} size={16} />
      </div>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
    </div>
  )
}
