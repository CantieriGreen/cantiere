-- ============================================================
-- EdilControl - Cron giornaliero avvisi scadenze
-- Ogni giorno richiama la Edge Function "scadenze-notify", che invia
-- agli amministratori l'email per le scadenze a 14, 7, 3 e 1 giorno.
--
-- PREREQUISITI (una volta sola):
--   1. db/19_scadenze.sql gia' eseguito
--   2. Edge Function deployata:
--        supabase functions deploy scadenze-notify --no-verify-jwt
--   3. Secret impostati sulla function:
--        supabase secrets set RESEND_API_KEY="re_..." \
--          RESEND_FROM_EMAIL="scadenze@dominio.it" \
--          SCADENZE_CRON_SECRET="<stringa-casuale-lunga>" \
--          APP_URL="https://<indirizzo-app>"
--   4. Estensioni pg_cron e pg_net attive
--      (Dashboard -> Database -> Extensions, oppure le righe qui sotto)
--
-- PRIMA DI ESEGUIRE sostituisci i due segnaposto:
--   <PROJECT_REF>          -> es. abcdefghijklmnop (da Settings -> General)
--   <SCADENZE_CRON_SECRET> -> lo stesso valore impostato al punto 3
--
-- Orario: pg_cron lavora in UTC. "0 6 * * *" = 07:00 ora italiana
-- d'inverno, 08:00 d'estate. Rieseguirlo piu' volte al giorno non crea
-- doppioni: ogni scadenza viene notificata una sola volta per soglia.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Rimuove il job se esiste gia' (rende il file rieseguibile)
select cron.unschedule(jobid)
from cron.job
where jobname = 'scadenze-notify-giornaliero';

select cron.schedule(
  'scadenze-notify-giornaliero',
  '0 6 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/scadenze-notify',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', '<SCADENZE_CRON_SECRET>'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- ------------------------------------------------------------
-- Verifiche utili
-- ------------------------------------------------------------
-- Job pianificati:
--   select jobid, jobname, schedule, active from cron.job;
-- Ultime esecuzioni del cron:
--   select status, return_message, start_time
--   from cron.job_run_details order by start_time desc limit 10;
-- Risposte HTTP della Edge Function:
--   select status_code, content, created
--   from net._http_response order by created desc limit 10;
-- Notifiche gia' inviate:
--   select * from public.scadenze_notifiche_log order by inviata_at desc limit 20;
