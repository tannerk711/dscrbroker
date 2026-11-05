// GA4 event delivery for the V3 form funnel (restructure Phase 0, 2026-11-04).
// `gtag` is the inline dataLayer queue every live layout defines in <head>, so
// events queue even before the library lands (and never load it: the
// navigator.webdriver gate stays the library's only gatekeeper). The standalone
// /forms/ test pages define no gtag; the guard makes every call a no-op there.
//
// Funnel events (all fire on ?demo=1 walks too, so a DebugView walk shows the
// whole funnel): form_view, form_start, form_step, credit_kickout,
// state_kickout, form_complete. The one key event, generate_lead, is suppressed
// on demo (same rule as the Ads conversion).

type GtagFn = (...args: unknown[]) => void;

export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as { gtag?: GtagFn }).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', event, params);
}

/** Events racing a navigation (submit -> /thank-you) ask for beacon transport. */
export function trackBeacon(event: string, params: Record<string, unknown> = {}): void {
  track(event, { ...params, transport_type: 'beacon' });
}
