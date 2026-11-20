/// <reference types="astro/client" />

interface Window {
  dataLayer: unknown[];
  gtag?: (...args: unknown[]) => void;
}
