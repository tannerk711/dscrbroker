// Site-wide visit attribution for DSCRBroker.com (restructure Phase 0, 2026-11-04).
// Designed for THIS site's channel mix, not ported from another client:
// dscrbroker leads arrive from AI assistants (ChatGPT alone was ~half of all
// leads before the 8/14 retrieval change), organic Google/Bing, direct, and
// paid Google Ads, and a visitor typically lands on a state/city/Learn page
// and converts later on the homepage or /qualify. The old capture lived inside
// the form island in per-tab sessionStorage, so any cross-page hop dropped the
// click; this module runs on EVERY page load from the layouts.
//
// Model:
//   - captureAttribution() runs on every page load and keeps ONE record in
//     localStorage for 90 days (the gclid validity window).
//   - A URL carrying ad params ALWAYS overwrites (the newest click is the one
//     Google attributes). Otherwise the FIRST touch is kept: entry page,
//     referrer, and derived channel, so an organic lead still carries its
//     discovery channel when it converts days later on a different page.
//   - leadFields() flattens the record to the five fields Tanner maps in GHL:
//     lead_source, utm_campaign, utm_content, utm_term, landing_page.
//     Every key always present, '' when absent.
//
// lead_source is the CHANNEL, never the surface (the payload's `leadSource`
// already names the surface: homepage-v3 / qualify-lp-t4). Taxonomy:
//   google_ads | ai_chatgpt | ai_perplexity | ai_copilot | ai_gemini |
//   ai_claude | organic_google | organic_bing | organic_duckduckgo |
//   organic_yahoo | <utm src/medium> | referral:<host> | direct

export const ATTR_PARAM_KEYS = [
  // Google click ids (gclid; gbraid/wbraid on iOS app traffic)
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  // The campaigns' tracking suffix: utm_campaign={a|b}, utm_content={group}-adN,
  // utm_term={keyword} (clients/dscrbroker/seo/site/CLAUDE.md, RSA structure)
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type AttrParamKey = (typeof ATTR_PARAM_KEYS)[number];
export type AttrParams = Record<AttrParamKey, string>;

export interface AttributionRecord {
  params: AttrParams; // '' when absent
  /** The page that carried the ad click, or the first page seen (organic). */
  landingPage: string;
  /** The external referrer of that landing (never a dscrbroker.com URL). */
  referrer: string;
  firstSeenAt: string; // ISO timestamp of the capture
}

const STORAGE_KEY = 'dscrbroker_attr_v1';
const TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_PARAM_LEN = 200;
const MAX_URL_LEN = 500;

export function emptyParams(): AttrParams {
  const out = {} as AttrParams;
  for (const k of ATTR_PARAM_KEYS) out[k] = '';
  return out;
}

function parseParams(search: string): AttrParams {
  const out = emptyParams();
  let sp: URLSearchParams;
  try {
    sp = new URLSearchParams(search);
  } catch {
    return out;
  }
  for (const k of ATTR_PARAM_KEYS) {
    const v = sp.get(k);
    if (v) out[k] = v.trim().slice(0, MAX_PARAM_LEN);
  }
  return out;
}

const hasAdClick = (p: AttrParams): boolean => !!(p.gclid || p.gbraid || p.wbraid);
const hasAnyParam = (p: AttrParams): boolean => ATTR_PARAM_KEYS.some((k) => !!p[k]);

/** Referrer host -> channel. AI assistants first: they are this site's story. */
function channelFromReferrer(referrer: string): string {
  if (!referrer) return 'direct';
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'direct';
  }
  if (!host || /(^|\.)dscrbroker\.com$/.test(host)) return 'direct'; // internal hop
  if (host === 'chatgpt.com' || host === 'chat.openai.com') return 'ai_chatgpt';
  if (/(^|\.)perplexity\.ai$/.test(host)) return 'ai_perplexity';
  if (host === 'copilot.microsoft.com') return 'ai_copilot';
  if (host === 'gemini.google.com' || host === 'bard.google.com') return 'ai_gemini';
  if (host === 'claude.ai') return 'ai_claude';
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'organic_google';
  if (/(^|\.)bing\.com$/.test(host)) return 'organic_bing';
  if (/(^|\.)duckduckgo\.com$/.test(host)) return 'organic_duckduckgo';
  if (/(^|\.)search\.yahoo\.com$/.test(host)) return 'organic_yahoo';
  return `referral:${host.slice(0, 80)}`;
}

/** One stable channel string for the CRM's lead_source field. */
export function deriveLeadSource(record: AttributionRecord): string {
  const p = record.params;
  if (hasAdClick(p)) return 'google_ads';
  if (p.utm_source) {
    const src = p.utm_source.toLowerCase();
    const med = (p.utm_medium || '').toLowerCase();
    if (src === 'google' && (med === 'cpc' || med === 'ppc' || med === 'paid')) return 'google_ads';
    return med ? `${src}/${med}` : src;
  }
  return channelFromReferrer(record.referrer);
}

/** The five flat keys Tanner maps on the lead webhook. Always every key. */
export function leadFields(record: AttributionRecord): Record<string, string> {
  return {
    lead_source: deriveLeadSource(record),
    utm_campaign: record.params.utm_campaign,
    utm_content: record.params.utm_content,
    utm_term: record.params.utm_term,
    landing_page: record.landingPage,
  };
}

// ---------------------------------------------------------------------------
// Browser side

interface Stored extends AttributionRecord {
  storedAt: number;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // private mode / blocked storage: capture still works per page
  }
}

function readStored(): AttributionRecord | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (typeof parsed.storedAt !== 'number' || Date.now() - parsed.storedAt > TTL_MS) return null;
    const params = emptyParams();
    const rawParams = (parsed.params ?? {}) as Record<string, unknown>;
    for (const k of ATTR_PARAM_KEYS) {
      const v = rawParams[k];
      if (typeof v === 'string') params[k] = v.slice(0, MAX_PARAM_LEN);
    }
    return {
      params,
      landingPage: typeof parsed.landingPage === 'string' ? parsed.landingPage.slice(0, MAX_URL_LEN) : '',
      referrer: typeof parsed.referrer === 'string' ? parsed.referrer.slice(0, MAX_URL_LEN) : '',
      firstSeenAt: typeof parsed.firstSeenAt === 'string' ? parsed.firstSeenAt.slice(0, 64) : '',
    };
  } catch {
    return null;
  }
}

/**
 * Run on every page load (the layouts) and by the form island on mount, so it
 * works whichever runs first. Idempotent: an ad-param URL always overwrites;
 * otherwise the stored first touch stays. A `?demo=1` walk never writes (QA
 * walks must not pollute a real browser's record); it returns an ephemeral
 * record from the current page.
 */
export function captureAttribution(): AttributionRecord | null {
  if (typeof window === 'undefined') return null;
  const fresh = parseParams(window.location.search);
  const existing = readStored();
  const demo = new URLSearchParams(window.location.search).get('demo') === '1';
  if (existing && !hasAnyParam(fresh)) return existing;
  const referrer = typeof document !== 'undefined' ? document.referrer || '' : '';
  const record: AttributionRecord = {
    params: fresh,
    landingPage: window.location.href.slice(0, MAX_URL_LEN),
    referrer: referrer.slice(0, MAX_URL_LEN),
    firstSeenAt: new Date().toISOString(),
  };
  if (!demo) {
    const s = storage();
    if (s) {
      try {
        const stored: Stored = { ...record, storedAt: Date.now() };
        s.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        // storage full or blocked: the record still returns for this page
      }
    }
  }
  return record;
}

/** The record for a submit: stored first/paid touch, else the current page. */
export function getAttribution(): AttributionRecord {
  const captured = captureAttribution();
  if (captured) return captured;
  return { params: emptyParams(), landingPage: '', referrer: '', firstSeenAt: '' };
}
