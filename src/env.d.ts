/// <reference types="astro/client" />

// Window globals used by the /forms/ landing-page motion spine (src/scripts/lp-motion.ts).
// Lenis is attached only on desktop fine-pointer devices; every consumer must null-check it.
interface Window {
  dataLayer: unknown[];
  gtag?: (...args: unknown[]) => void;
  __lenis?: { scrollTo: (target: Element | string | number, opts?: Record<string, unknown>) => void } & Record<string, unknown>;
}
