// ============================================================
// EdilControl - Edge Function: utenti-crea
// Permette a un amministratore di creare un nuovo utente dall'app
// (Impostazioni -> Utenti e ruoli), senza passare dalla dashboard Supabase.
//
// Crea l'account in Supabase Auth con email gia' confermata e la
// password scelta dall'amministratore; il trigger on_auth_user_created
// crea il profilo, che qui viene comunque riallineato (nome e ruolo).
//
// Chiamante ammesso: un amministratore autenticato e attivo.
// Richiesta (JSON): { email, password, nome, ruolo }
//
// Disponibili in automatico: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy utenti-crea
//   (dalla dashboard: Edge Functions -> Deploy a new function -> incollare questo file)
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RUOLI = ['admin', 'capo_cantiere', 'direzione'] as const
type Ruolo = (typeof RUOLI)[number]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metodo non ammesso' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // --- autorizzazione: solo un amministratore attivo ---
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Non autenticato' }, 401)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'Sessione non valida' }, 401)
  const { data: chiamante } = await userClient
    .from('profiles')
    .select('ruolo, attivo')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (chiamante?.ruolo !== 'admin' || chiamante?.attivo === false) {
    return json({ error: 'Solo un amministratore puo creare utenti' }, 403)
  }

  // --- validazione dati ---
  let body: { email?: unknown; password?: unknown; nome?: unknown; ruolo?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Richiesta non valida' }, 400)
  }
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const nome = String(body.nome ?? '').trim()
  const ruolo = String(body.ruolo ?? '') as Ruolo

  if (!nome) return json({ error: 'Il nome e obbligatorio' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Indirizzo email non valido' }, 400)
  }
  if (password.length < 8) {
    return json({ error: 'La password deve avere almeno 8 caratteri' }, 400)
  }
  if (!RUOLI.includes(ruolo)) return json({ error: 'Ruolo non valido' }, 400)

  // --- creazione account ---
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: creato, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, ruolo },
  })
  if (createErr || !creato.user) {
    const msg = createErr?.message ?? 'errore sconosciuto'
    if (/already|registered|exists/i.test(msg)) {
      return json({ error: 'Esiste gia un utente con questa email' }, 409)
    }
    return json({ error: 'Creazione non riuscita', dettaglio: msg }, 400)
  }

  // Il trigger crea il profilo; lo riallineo comunque (il trigger ignora
  // i propri errori, quindi il profilo potrebbe mancare).
  const { error: profErr } = await admin
    .from('profiles')
    .upsert({ id: creato.user.id, nome, ruolo, attivo: true }, { onConflict: 'id' })
  if (profErr) {
    // Senza profilo l'utente non vede nulla: annullo la creazione.
    await admin.auth.admin.deleteUser(creato.user.id)
    return json({ error: 'Creazione del profilo non riuscita', dettaglio: profErr.message }, 500)
  }

  return json({ id: creato.user.id, email, nome, ruolo })
})
