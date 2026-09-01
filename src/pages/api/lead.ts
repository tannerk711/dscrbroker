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
import { EXCLUDED_STATES } from '../../utils/brokerRouting';

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

  // Honeypot (added 2026-08-31 for the /match/ funnel; the /qualify/ form never sends
  // this key). A filled `website` field means a bot: answer success so it learns
  // nothing, forward nothing.
  if (typeof payload.website === 'string' && payload.website.trim() !== '') {
    return json({ success: true, assignedBroker: null }, 200);
  }

  // Coverage guard (added 2026-08-31). The forms never submit NY/MI/ND/SD/UT (they show
  // an honest soft stop instead), so a submission carrying one is a bypassed client.
  // Reject loudly rather than routing a lead no broker in the network can serve.
  const submittedState =
    typeof payload.stateCode === 'string' ? payload.stateCode.toUpperCase() : '';
  if (EXCLUDED_STATES.has(submittedState)) {
    return json(
      { error: 'STATE_NOT_COVERED', message: 'No specialist in the network covers this state yet.' },
      400
    );
  }

  // TCPA consent is a legal record, and a client-only gate is bypassable, so the
  // server refuses any submission without one. The form always sends `consent`
  // ({ agreed, text, agreedAt, url }); its absence means a bypassed or broken
  // client. Stamp what only the server can know (IP, user agent, received-at)
  // so the CRM holds a complete consent record for every forwarded lead.
  const consent = payload.consent as Record<string, unknown> | undefined;
  if (
    !consent ||
    consent.agreed !== true ||
    typeof consent.text !== 'string' ||
    consent.text.length === 0
  ) {
    // DEPLOY GRACE PATH (added 2026-08-18, remove after ~2026-08-25): a browser
    // that loaded the pre-consent-record bundle can submit a real lead without a
    // `consent` object. That user DID check the old consent checkbox (the old
    // client's zod gate required it); rejecting them 400s a consenting lead at
    // the bottom of the funnel with no way to recover except a full reload.
    // Synthesize a legacy-marked record with the exact copy that old bundle
    // displayed. The text below is a frozen historical record; do NOT update it
    // if the live consent copy changes.
    const looksLikeLegacyLead =
      payload.consent === undefined &&
      typeof payload.firstName === 'string' && payload.firstName.length > 0 &&
      typeof payload.email === 'string' && payload.email.length > 0 &&
      typeof payload.phone === 'string' && payload.phone.length > 0 &&
      typeof payload.matchedBroker === 'string';
    if (!looksLikeLegacyLead) {
      return json(
        { error: 'CONSENT_REQUIRED', message: 'TCPA consent is required to submit.' },
        400
      );
    }
    payload.consent = {
      agreed: true,
      legacy: true,
      text:
        'I agree to be contacted by a licensed DSCR loan specialist about my deal. Submitting this form does not pull my credit. By clicking "Match Me With a Specialist," I consent to receive calls, texts, and emails from a licensed loan specialist. Standard message and data fees may apply. Reply STOP to opt out.',
      agreedAt: null,
      url: null,
    };
  }
  payload.consent = {
    ...(payload.consent as Record<string, unknown>),
    clientIp:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null,
    userAgent: request.headers.get('user-agent') || null,
    receivedAt: new Date().toISOString(),
  };

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
