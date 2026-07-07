// ============================================================
// EdilControl - Edge Function: fic-sync
// Importa le fatture emesse da Fatture in Cloud nello staging.
//
// Secret richiesti (impostare con: supabase secrets set ...):
//   FIC_API_TOKEN   = token Manual Authentication (scope: lettura documenti)
//   FIC_COMPANY_ID  = id azienda su Fatture in Cloud
// Disponibili in automatico: SUPABASE_URL, SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy fic-sync
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
  // prima scadenza non pagata
  const nonPagate = payments
    .filter((p) => !isPaid(p))
    .sort((a, b) => String(a?.due_date ?? '').localeCompare(String(b?.due_date ?? '')))
  const prossima = nonPagate[0]?.due_date ?? null
  const scaduta = nonPagate.some((p) => p?.due_date && p.due_date < oggi)
  return { stato: scaduta ? 'scaduto' : 'in_attesa', scadenza: prossima }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ficToken = Deno.env.get('FIC_API_TOKEN')
    const companyId = Deno.env.get('FIC_COMPANY_ID')

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

    // --- configurazione FIC ---
    if (!ficToken || !companyId) {
      return json(
        {
          error: 'Fatture in Cloud non configurato',
          dettaglio:
            'Imposta i secret FIC_API_TOKEN e FIC_COMPANY_ID sulla Edge Function.',
          configurato: false,
        },
        400
      )
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // --- log: avvio ---
    const { data: logRow } = await admin
      .from('fic_sync_log')
      .insert({ ok: null, messaggio: 'avviata' })
      .select('id')
      .single()
    const logId = logRow?.id

    // --- scarica fatture (paginazione) ---
    let page = 1
    let lastPage = 1
    const documenti: any[] = []
    do {
      const url =
        `${FIC_BASE}/c/${companyId}/issued_documents` +
        `?type=invoice&fieldset=detailed&per_page=100&page=${page}&sort=-date`
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${ficToken}`,
          Accept: 'application/json',
        },
      })
      if (!resp.ok) {
        const txt = await resp.text()
        if (logId) {
          await admin
            .from('fic_sync_log')
            .update({ ok: false, finished_at: new Date().toISOString(), messaggio: `FIC ${resp.status}: ${txt.slice(0, 300)}` })
            .eq('id', logId)
        }
        return json({ error: `Errore Fatture in Cloud (${resp.status})`, dettaglio: txt.slice(0, 300) }, 502)
      }
      const body = await resp.json()
      const data = body?.data ?? []
      documenti.push(...data)
      lastPage = body?.current_page ? (body?.last_page ?? 1) : 1
      page += 1
    } while (page <= lastPage)

    // --- fic_id gia presenti (per distinguere nuove da aggiornate) ---
    const ids = documenti.map((d) => String(d.id)).filter(Boolean)
    const { data: esistenti } = await admin
      .from('fic_fatture_importate')
      .select('fic_id, ricavo_id, stato_assegnazione')
      .in('fic_id', ids.length ? ids : ['__none__'])
    const mappaEsistenti = new Map(
      (esistenti ?? []).map((r) => [r.fic_id, r])
    )

    let importate = 0
    let aggiornate = 0

    for (const d of documenti) {
      const ficId = String(d.id)
      const payments = d.payments_list ?? d.payments ?? []
      const { stato, scadenza } = mappaStato(payments)
      const numero =
        d.number != null
          ? `${d.numeration ? d.numeration + ' ' : ''}${d.number}`
          : (d.numeration ?? null)

      const record = {
        fic_id: ficId,
        fic_type: d.type ?? 'invoice',
        numero,
        data: d.date ?? null,
        importo_netto: Number(d.amount_net ?? d.amount_gross ?? 0),
        importo_totale: Number(d.amount_gross ?? d.amount_net ?? 0),
        cliente_nome: d.entity?.name ?? null,
        cliente_piva: d.entity?.vat_number ?? null,
        stato_pagamento: stato,
        scadenza,
        scadenze: payments,
      }

      const pre = mappaEsistenti.get(ficId)
      const { error: upErr } = await admin
        .from('fic_fatture_importate')
        .upsert(record, { onConflict: 'fic_id' })
      if (upErr) continue

      if (pre) {
        aggiornate += 1
        // se gia assegnata a un ricavo, aggiorna stato/scadenza del ricavo
        if (pre.ricavo_id) {
          await admin
            .from('ricavi')
            .update({ stato, scadenza })
            .eq('id', pre.ricavo_id)
        }
      } else {
        importate += 1
      }
    }

    // ============================================================
    // FATTURE PASSIVE (documenti ricevuti -> acquisti)
    // ============================================================
    let pPage = 1
    let pLast = 1
    const passivi: any[] = []
    do {
      const url =
        `${FIC_BASE}/c/${companyId}/received_documents` +
        `?type=expense&fieldset=detailed&per_page=100&page=${pPage}&sort=-date`
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${ficToken}`, Accept: 'application/json' },
      })
      if (!resp.ok) break // il passivo non blocca l'attivo gia importato
      const body = await resp.json()
      passivi.push(...(body?.data ?? []))
      pLast = body?.current_page ? (body?.last_page ?? 1) : 1
      pPage += 1
    } while (pPage <= pLast)

    const pIds = passivi.map((d) => String(d.id)).filter(Boolean)
    const { data: pEsistenti } = await admin
      .from('fic_fatture_passive')
      .select('fic_id')
      .in('fic_id', pIds.length ? pIds : ['__none__'])
    const pSet = new Set((pEsistenti ?? []).map((r) => r.fic_id))

    let pImportate = 0
    let pAggiornate = 0
    for (const d of passivi) {
      const ficId = String(d.id)
      const payments = d.payments_list ?? d.payments ?? []
      const { stato, scadenza } = mappaStato(payments)
      const numero =
        d.number != null
          ? `${d.numeration ? d.numeration + ' ' : ''}${d.number}`
          : (d.numeration ?? null)
      const record = {
        fic_id: ficId,
        numero,
        data: d.date ?? null,
        importo_netto: Number(d.amount_net ?? d.amount_gross ?? 0),
        importo_totale: Number(d.amount_gross ?? d.amount_net ?? 0),
        fornitore_nome: d.entity?.name ?? null,
        fornitore_piva: d.entity?.vat_number ?? null,
        fornitore_cf: d.entity?.tax_code ?? null,
        stato_pagamento: stato,
        scadenza,
        scadenze: payments,
      }
      const { error: upErr } = await admin
        .from('fic_fatture_passive')
        .upsert(record, { onConflict: 'fic_id' })
      if (upErr) continue
      if (pSet.has(ficId)) pAggiornate += 1
      else pImportate += 1
    }

    if (logId) {
      await admin
        .from('fic_sync_log')
        .update({
          ok: true,
          finished_at: new Date().toISOString(),
          messaggio: `Sincronizzazione completata`,
          importate: importate + pImportate,
          aggiornate: aggiornate + pAggiornate,
        })
        .eq('id', logId)
    }

    return json({
      ok: true,
      attive: { importate, aggiornate, totale: documenti.length },
      passive: { importate: pImportate, aggiornate: pAggiornate, totale: passivi.length },
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Errore sconosciuto' }, 500)
  }
})
