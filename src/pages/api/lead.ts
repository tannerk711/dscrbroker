/**
 * Vercel serverless function: lead intake.
 *
 * The browser form POSTs the full lead payload here. This route resolves the
 * correct broker's Zapier webhook server-side (from non-PUBLIC env vars that
 * never reach the client bundle) and forwards the lead to Zapier -> GoHighLevel.
 *
 * Why server-side: Astro/Vite strips any env var not prefixed with PUBLIC_ from
 * client code, so the old browser-side fetch read an undefined webhook URL and
 * silently skipped the POST. Keeping the webhook here also keeps the Zapier hook
 * out of the public JS bundle and removes the browser->Zapier CORS problem.
 *
 * POST /api/lead
 * Body: the lead payload (includes `matchedBroker` for routing)
 * Returns: { success: true } on a forwarded lead, or { error } on failure.
 */

export const prerender = false;

import type { APIRoute } from 'astro';

// Broker -> env var name. Must match the keys the form sends in `matchedBroker`.
const BROKER_WEBHOOK_ENV: Record<string, string> = {
  broker_a: 'WEBHOOK_BROKER_A',
  broker_b: 'WEBHOOK_BROKER_B',
  broker_c: 'WEBHOOK_BROKER_C',
  broker_d: 'WEBHOOK_BROKER_D',
  broker_e: 'WEBHOOK_BROKER_E',
  broker_f: 'WEBHOOK_BROKER_F',
};

// States split between two brokers, resolved HERE (server-side), never client-side.
// Exactly ONE broker gets each lead. No shared leads, ever.
// GA: John Peisner (broker_c) / Adam Cunningham (broker_f), 50/50. Added 2026-08-11.
const SPLIT_STATES: Record<string, [string, string]> = {
  GA: ['broker_c', 'broker_f'],
};

// 50/50 pick: strict alternation while the serverless instance stays warm, random
// re-seed on cold start. Approximates round robin without a datastore; long-run
// distribution is 50/50 either way.
let splitFlip = Math.random() < 0.5 ? 0 : 1;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'INVALID_BODY', message: 'Body must be JSON.' }, 400);
  }

  // Resolve the broker from the payload, default to broker_a.
  let brokerKey =
    (typeof payload.matchedBroker === 'string' && payload.matchedBroker) || 'broker_a';

  // Split states: the server owns the pick. Overrides whatever the client sent.
  const stateCode =
    typeof payload.stateCode === 'string' ? payload.stateCode.toUpperCase() : '';
  const split = SPLIT_STATES[stateCode];
  if (split) {
    splitFlip = 1 - splitFlip;
    let pick = split[splitFlip];
    // Resilience: if the picked broker's webhook is not configured yet, fall back
    // to the other split broker instead of dropping the lead.
    if (!import.meta.env[BROKER_WEBHOOK_ENV[pick]]) {
      const other = split[1 - splitFlip];
      if (import.meta.env[BROKER_WEBHOOK_ENV[other]]) {
        console.error(`[lead] Split pick ${pick} has no webhook; falling back to ${other}`);
        pick = other;
      }
    }
    brokerKey = pick;
    // Keep the forwarded payload consistent with the actual assignment so the
    // CRM record matches who really got the lead.
    payload.matchedBroker = brokerKey;
  }

  const envName = BROKER_WEBHOOK_ENV[brokerKey] || BROKER_WEBHOOK_ENV.broker_a;
  const webhookUrl = import.meta.env[envName] as string | undefined;

  if (!webhookUrl) {
    // No webhook configured. Log it so a misconfigured env is visible in Vercel
    // logs instead of silently dropping the lead.
    console.error(`[lead] No webhook configured for ${brokerKey} (env ${envName})`);
    return json(
      { error: 'WEBHOOK_NOT_CONFIGURED', message: 'Lead endpoint is not configured.' },
      503
    );
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[lead] Webhook for ${brokerKey} returned ${res.status}`);
      return json({ error: 'WEBHOOK_FAILED', status: res.status }, 502);
    }

    // assignedBroker tells the form who actually got the lead (matters for split
    // states) so the thank-you page renders the right specialist.
    return json({ success: true, assignedBroker: brokerKey }, 200);
  } catch (error) {
    console.error('[lead] Webhook forward error:', error);
    return json({ error: 'WEBHOOK_ERROR' }, 502);
  }
};
