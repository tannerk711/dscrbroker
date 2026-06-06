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
};

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

  // Resolve the broker from the payload, default to broker_a (every state routes
  // to John today, but keep the routing so adding brokers later just works).
  const brokerKey =
    (typeof payload.matchedBroker === 'string' && payload.matchedBroker) || 'broker_a';
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

    return json({ success: true }, 200);
  } catch (error) {
    console.error('[lead] Webhook forward error:', error);
    return json({ error: 'WEBHOOK_ERROR' }, 502);
  }
};
