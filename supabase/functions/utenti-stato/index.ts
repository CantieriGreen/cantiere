// ============================================================
// EdilControl - Edge Function: utenti-stato
// Sospende o riattiva un utente (Impostazioni -> Utenti e ruoli).
//
// Oltre a profiles.attivo (che blocca le schermate dell'app), agisce
// sull'account in Supabase Auth:
//   sospendi -> ban: la password non funziona piu e le sessioni aperte
//               non si rinnovano (scadono entro la durata del token, ~1 ora)
//   riattiva -> ban rimosso: l'utente rientra con la stessa password
//
// Chiamante ammesso: un amministratore autenticato e attivo,
// mai su se stesso.
// Richiesta (JSON): { id, attivo }
//
// Disponibili in automatico: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy utenti-stato
//   (dalla dashboard: Edge Functions -> Deploy a new function -> incollare questo file)
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// "Per sempre" in pratica: circa 100 anni.
const BAN_SOSPESO = '876000h'

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
    return json({ error: 'Solo un amministratore puo sospendere o riattivare utenti' }, 403)
  }

  // --- dati ---
  let body: { id?: unknown; attivo?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Richiesta non valida' }, 400)
  }
  const id = String(body.id ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Utente non valido' }, 400)
  if (typeof body.attivo !== 'boolean') return json({ error: 'Stato non valido' }, 400)
  const attivo = body.attivo
  if (id === userData.user.id) {
    return json({ error: 'Non puoi sospendere o riattivare te stesso' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) account in Supabase Auth
  const { error: banErr } = await admin.auth.admin.updateUserById(id, {
    ban_duration: attivo ? 'none' : BAN_SOSPESO,
  })
  if (banErr) {
    return json({ error: 'Aggiornamento dell\'account non riuscito', dettaglio: banErr.message }, 400)
  }

  // 2) profilo (stato mostrato nell'app)
  const { error: profErr } = await admin.from('profiles').update({ attivo }).eq('id', id)
  if (profErr) {
    // riporto l'account com'era, per non lasciare i due stati disallineati
    await admin.auth.admin.updateUserById(id, {
      ban_duration: attivo ? BAN_SOSPESO : 'none',
    })
    return json({ error: 'Aggiornamento del profilo non riuscito', dettaglio: profErr.message }, 500)
  }

  return json({ id, attivo })
})
