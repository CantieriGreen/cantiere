// ============================================================
// EdilControl - Edge Function: scadenze-notify
// Invia agli amministratori un'email riepilogativa delle scadenze
// (mezzi, visite mediche, formazione, patenti, permessi di soggiorno)
// che si trovano esattamente a 14, 7, 3 o 1 giorno dalla scadenza.
//
// Ogni (scadenza, soglia) viene notificata UNA sola volta: il log
// scadenze_notifiche_log impedisce i doppioni anche se la funzione
// gira piu' volte nello stesso giorno. Se l'invio fallisce, il log
// viene annullato cosi' il giro successivo riprova.
//
// Chiamanti ammessi:
//   - il cron (pg_cron + pg_net) con header  x-cron-secret: <SCADENZE_CRON_SECRET>
//   - un amministratore autenticato (invio manuale dall'app)
//
// Secret richiesti (Edge Functions -> Secrets):
//   RESEND_API_KEY         = chiave API Resend
//   RESEND_FROM_EMAIL      = mittente verificato su Resend (es. scadenze@dominio.it)
//   SCADENZE_CRON_SECRET   = stringa casuale condivisa con il job pg_cron
// Facoltativi:
//   SCADENZE_MAIL_TO       = destinatari fissi, separati da virgola
//                            (se assente: tutti gli admin attivi)
//   APP_URL                = indirizzo dell'app, per il link nell'email
// Disponibili in automatico: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy scadenze-notify --no-verify-jwt
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SOGLIE = [14, 7, 3, 1]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type Scadenza = {
  tipo: string
  categoria: 'mezzi' | 'dipendenti'
  record_id: string
  titolo: string
  dettaglio: string
  scadenza: string
  giorni: number
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function etichettaGiorni(g: number) {
  return g === 1 ? 'Scade domani' : `Scade tra ${g} giorni`
}

function coloreGiorni(g: number) {
  if (g <= 3) return '#b42318'
  if (g <= 7) return '#b54708'
  return '#1f3f63'
}

/** Email HTML: una sezione per soglia, righe ordinate per categoria. */
function componiEmail(righe: Scadenza[], appUrl: string | undefined) {
  const perSoglia = SOGLIE.map((s) => ({
    soglia: s,
    righe: righe.filter((r) => r.giorni === s),
  })).filter((g) => g.righe.length > 0)

  const sezioni = perSoglia
    .map(({ soglia, righe }) => {
      const colore = coloreGiorni(soglia)
      const trs = righe
        .map(
          (r) => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eceff3;color:#6b7280;font-size:12px;">${
              r.categoria === 'mezzi' ? 'Mezzo' : 'Dipendente'
            }</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eceff3;font-weight:600;color:#1f2937;">${escapeHtml(r.titolo)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eceff3;color:#374151;">${escapeHtml(r.dettaglio)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eceff3;color:#1f2937;white-space:nowrap;">${formatDate(r.scadenza)}</td>
          </tr>`
        )
        .join('')
      return `
        <h3 style="margin:24px 0 8px;font-size:15px;color:${colore};">
          ${etichettaGiorni(soglia)} · ${righe.length} ${righe.length === 1 ? 'scadenza' : 'scadenze'}
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f7f8fa;text-align:left;">
              <th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;">Area</th>
              <th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;">Chi / cosa</th>
              <th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;">Scadenza</th>
              <th style="padding:8px 10px;font-size:11px;color:#6b7280;text-transform:uppercase;">Data</th>
            </tr>
          </thead>
          <tbody>${trs}</tbody>
        </table>`
    })
    .join('')

  const link = appUrl
    ? `<p style="margin-top:28px;"><a href="${escapeHtml(appUrl.replace(/\/$/, ''))}/scadenze/mezzi"
         style="display:inline-block;background:#2e5e8c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;">
         Apri il calendario scadenze</a></p>`
    : ''

  const html = `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:680px;margin:0 auto;color:#1f2937;">
    <h2 style="margin:0 0 4px;font-size:20px;color:#1f3f63;">Scadenze in arrivo</h2>
    <p style="margin:0;color:#6b7280;font-size:14px;">
      Riepilogo automatico del calendario scadenze · CEM Energia srl
    </p>
    ${sezioni}
    ${link}
    <p style="margin-top:28px;color:#9ca3af;font-size:12px;">
      Ricevi questa email perche' sei amministratore del gestionale.
      Gli avvisi partono a 14, 7, 3 e 1 giorno dalla scadenza.
    </p>
  </div>`

  const piuVicina = Math.min(...righe.map((r) => r.giorni))
  const subject =
    `Scadenze in arrivo: ${righe.length} ${righe.length === 1 ? 'voce' : 'voci'}` +
    (piuVicina === 1 ? ' (una scade domani)' : '')

  return { subject, html }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
  const cronSecret = Deno.env.get('SCADENZE_CRON_SECRET')
  const mailToOverride = Deno.env.get('SCADENZE_MAIL_TO')
  const appUrl = Deno.env.get('APP_URL')

  // --- autorizzazione: cron (secret condiviso) oppure admin autenticato ---
  const headerSecret = req.headers.get('x-cron-secret')
  let autorizzato = !!cronSecret && headerSecret === cronSecret

  if (!autorizzato) {
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
      return json({ error: 'Solo un amministratore puo inviare gli avvisi' }, 403)
    }
    autorizzato = true
  }

  if (!resendKey || !fromEmail) {
    return json(
      {
        error: 'Invio email non configurato',
        dettaglio: 'Imposta i secret RESEND_API_KEY e RESEND_FROM_EMAIL sulla Edge Function.',
        configurato: false,
      },
      400
    )
  }

  const admin = createClient(supabaseUrl, serviceKey)

  try {
    // 1. Rivendica le scadenze da notificare oggi (gia' scritte nel log)
    const { data: righe, error: rpcErr } = await admin.rpc('scadenze_da_notificare', {
      p_soglie: SOGLIE,
    })
    if (rpcErr) throw rpcErr
    const scadenze = (righe ?? []) as Scadenza[]

    if (scadenze.length === 0) {
      return json({ ok: true, inviate: 0, messaggio: 'Nessuna scadenza da notificare oggi' })
    }

    // 2. Destinatari
    let destinatari: string[] = []
    if (mailToOverride) {
      destinatari = mailToOverride.split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      const { data: dest, error: destErr } = await admin.rpc('scadenze_destinatari_admin')
      if (destErr) throw destErr
      destinatari = ((dest ?? []) as { email: string }[]).map((d) => d.email)
    }

    // Annulla il log: le scadenze restano da notificare al prossimo giro.
    const annullaLog = async () => {
      for (const s of scadenze) {
        await admin
          .from('scadenze_notifiche_log')
          .delete()
          .eq('tipo', s.tipo)
          .eq('record_id', s.record_id)
          .eq('scadenza', s.scadenza)
          .eq('soglia_giorni', s.giorni)
      }
    }

    if (destinatari.length === 0) {
      await annullaLog()
      return json({ error: 'Nessun amministratore attivo con email a cui inviare' }, 400)
    }

    // 3. Invio (una sola email riepilogativa)
    const { subject, html } = componiEmail(scadenze, appUrl)
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromEmail, to: destinatari, subject, html }),
    })

    if (!resp.ok) {
      const txt = await resp.text()
      await annullaLog()
      throw new Error(`Resend ${resp.status}: ${txt.slice(0, 300)}`)
    }

    // 4. Registra i destinatari sul log
    const elenco = destinatari.join(', ')
    for (const s of scadenze) {
      await admin
        .from('scadenze_notifiche_log')
        .update({ destinatari: elenco })
        .eq('tipo', s.tipo)
        .eq('record_id', s.record_id)
        .eq('scadenza', s.scadenza)
        .eq('soglia_giorni', s.giorni)
    }

    return json({ ok: true, inviate: scadenze.length, destinatari: destinatari.length })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Errore sconosciuto' }, 500)
  }
})
