// ============================================================
// EdilControl - Edge Function: fic-sync
// Importa le fatture (emesse + ricevute) da Fatture in Cloud nello staging.
// Filtra per periodo (mesi) per non scaricare tutto lo storico.
//
// Secret richiesti (Edge Functions -> Secrets):
//   FIC_API_TOKEN   = token Manual Authentication (scope: lettura documenti)
//   FIC_COMPANY_ID  = id azienda su Fatture in Cloud
// Disponibili in automatico: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Body (JSON):  { "mesi": 1 | 6 | 12 }   (default 12)
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIC_BASE = 'https://api-v2.fattureincloud.it'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Mappa le scadenze FIC sullo stato di incasso EdilControl. */
function mappaStato(payments: any[]): { stato: string; scadenza: string | null } {
  const oggi = new Date().toISOString().slice(0, 10)
  if (!Array.isArray(payments) || payments.length === 0) {
    return { stato: 'in_attesa', scadenza: null }
  }
  const isPaid = (p: any) =>
    p?.status === 'paid' || p?.status === 'settled' || !!p?.paid_date
  const tuttePagate = payments.every(isPaid)
  if (tuttePagate) {
    return { stato: 'pagato', scadenza: payments[payments.length - 1]?.due_date ?? null }
  }
  const nonPagate = payments
    .filter((p) => !isPaid(p))
    .sort((a, b) => String(a?.due_date ?? '').localeCompare(String(b?.due_date ?? '')))
  const prossima = nonPagate[0]?.due_date ?? null
  const scaduta = nonPagate.some((p) => p?.due_date && p.due_date < oggi)
  return { stato: scaduta ? 'scaduto' : 'in_attesa', scadenza: prossima }
}

function numero(d: any): string | null {
  return d.number != null
    ? `${d.numeration ? d.numeration + ' ' : ''}${d.number}`
    : (d.numeration ?? null)
}

/** Scarica tutte le pagine di un endpoint FIC filtrando per data. */
async function scaricaTutto(
  ficToken: string,
  companyId: string,
  endpoint: string,
  tipo: string,
  fromDate: string
): Promise<any[]> {
  const out: any[] = []
  let page = 1
  let last = 1
  do {
    const qp = new URLSearchParams({
      type: tipo,
      fieldset: 'detailed',
      per_page: '100',
      page: String(page),
      sort: '-date',
      q: `date >= '${fromDate}'`,
    })
    const resp = await fetch(`${FIC_BASE}/c/${companyId}/${endpoint}?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${ficToken}`, Accept: 'application/json' },
    })
    if (!resp.ok) {
      const txt = await resp.text()
      throw new Error(`FIC ${endpoint} ${resp.status}: ${txt.slice(0, 300)}`)
    }
    const body = await resp.json()
    out.push(...(body?.data ?? []))
    last = body?.last_page ?? 1
    page += 1
  } while (page <= last)
  return out
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ficToken = Deno.env.get('FIC_API_TOKEN')
    const companyId = Deno.env.get('FIC_COMPANY_ID')

    // --- periodo richiesto (mesi) ---
    let mesi = 12
    try {
      const b = await req.json()
      if (b && Number(b.mesi) > 0) mesi = Math.min(120, Math.floor(Number(b.mesi)))
    } catch {
      /* body vuoto: default 12 */
    }
    const d = new Date()
    d.setMonth(d.getMonth() - mesi)
    const fromDate = d.toISOString().slice(0, 10)

    // --- verifica che il chiamante sia un admin autenticato ---
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Non autenticato' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'Sessione non valida' }, 401)

    const { data: profilo } = await userClient
      .from('profiles')
      .select('ruolo')
      .eq('id', userData.user.id)
      .maybeSingle()
    if (profilo?.ruolo !== 'admin') {
      return json({ error: 'Solo un amministratore puo sincronizzare le fatture' }, 403)
    }

    if (!ficToken || !companyId) {
      return json(
        {
          error: 'Fatture in Cloud non configurato',
          dettaglio: 'Imposta i secret FIC_API_TOKEN e FIC_COMPANY_ID sulla Edge Function.',
          configurato: false,
        },
        400
      )
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // upsert in blocco (chunk) per velocita
    const upsertChunked = async (table: string, records: any[]) => {
      for (let i = 0; i < records.length; i += 500) {
        const { error } = await admin
          .from(table)
          .upsert(records.slice(i, i + 500), { onConflict: 'fic_id' })
        if (error) throw error
      }
    }

    const { data: logRow } = await admin
      .from('fic_sync_log')
      .insert({ ok: null, messaggio: `avviata (ultimi ${mesi} mesi)` })
      .select('id')
      .single()
    const logId = logRow?.id

    // ============================================================
    // FATTURE ATTIVE (documenti emessi -> ricavi)
    // ============================================================
    const documenti = await scaricaTutto(ficToken, companyId, 'issued_documents', 'invoice', fromDate)
    const ids = documenti.map((x) => String(x.id)).filter(Boolean)

    const esistentiA = new Map<string, any>()
    for (let i = 0; i < ids.length; i += 500) {
      const { data } = await admin
        .from('fic_fatture_importate')
        .select('fic_id, ricavo_id, stato_assegnazione')
        .in('fic_id', ids.slice(i, i + 500))
      ;(data ?? []).forEach((r: any) => esistentiA.set(r.fic_id, r))
    }

    const recordsA = documenti.map((dd) => {
      const payments = dd.payments_list ?? dd.payments ?? []
      const { stato, scadenza } = mappaStato(payments)
      return {
        fic_id: String(dd.id),
        fic_type: dd.type ?? 'invoice',
        numero: numero(dd),
        data: dd.date ?? null,
        importo_netto: Number(dd.amount_net ?? dd.amount_gross ?? 0),
        importo_totale: Number(dd.amount_gross ?? dd.amount_net ?? 0),
        cliente_nome: dd.entity?.name ?? null,
        cliente_piva: dd.entity?.vat_number ?? null,
        stato_pagamento: stato,
        scadenza,
        scadenze: payments,
      }
    })
    await upsertChunked('fic_fatture_importate', recordsA)

    // aggiorna stato/scadenza dei ricavi gia collegati (fatture riassegnate)
    for (const r of recordsA) {
      const pre = esistentiA.get(r.fic_id)
      if (pre?.ricavo_id) {
        await admin
          .from('ricavi')
          .update({ stato: r.stato_pagamento, scadenza: r.scadenza })
          .eq('id', pre.ricavo_id)
      }
    }
    const importateA = recordsA.filter((r) => !esistentiA.has(r.fic_id)).length
    const aggiornateA = recordsA.length - importateA

    // ============================================================
    // FATTURE PASSIVE (documenti ricevuti -> acquisti)
    // ============================================================
    let importateP = 0
    let aggiornateP = 0
    let totaleP = 0
    try {
      const passivi = await scaricaTutto(ficToken, companyId, 'received_documents', 'expense', fromDate)
      totaleP = passivi.length
      const pIds = passivi.map((x) => String(x.id)).filter(Boolean)
      const esistentiP = new Set<string>()
      for (let i = 0; i < pIds.length; i += 500) {
        const { data } = await admin
          .from('fic_fatture_passive')
          .select('fic_id')
          .in('fic_id', pIds.slice(i, i + 500))
        ;(data ?? []).forEach((r: any) => esistentiP.add(r.fic_id))
      }
      const recordsP = passivi.map((dd) => {
        const payments = dd.payments_list ?? dd.payments ?? []
        const { stato, scadenza } = mappaStato(payments)
        return {
          fic_id: String(dd.id),
          numero: numero(dd),
          data: dd.date ?? null,
          importo_netto: Number(dd.amount_net ?? dd.amount_gross ?? 0),
          importo_totale: Number(dd.amount_gross ?? dd.amount_net ?? 0),
          fornitore_nome: dd.entity?.name ?? null,
          fornitore_piva: dd.entity?.vat_number ?? null,
          fornitore_cf: dd.entity?.tax_code ?? null,
          stato_pagamento: stato,
          scadenza,
          scadenze: payments,
        }
      })
      await upsertChunked('fic_fatture_passive', recordsP)
      importateP = recordsP.filter((r) => !esistentiP.has(r.fic_id)).length
      aggiornateP = recordsP.length - importateP
    } catch (_e) {
      // il passivo non blocca l'attivo gia importato
    }

    if (logId) {
      await admin
        .from('fic_sync_log')
        .update({
          ok: true,
          finished_at: new Date().toISOString(),
          messaggio: `Completata (ultimi ${mesi} mesi)`,
          importate: importateA + importateP,
          aggiornate: aggiornateA + aggiornateP,
        })
        .eq('id', logId)
    }

    return json({
      ok: true,
      periodo_mesi: mesi,
      attive: { importate: importateA, aggiornate: aggiornateA, totale: documenti.length },
      passive: { importate: importateP, aggiornate: aggiornateP, totale: totaleP },
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Errore sconosciuto' }, 500)
  }
})
