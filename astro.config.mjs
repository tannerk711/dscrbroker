// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://dscrbroker.com',
  output: 'static',
  // Page URLs are canonical WITH a trailing slash, enforced in production by
  // the scoped 308s that scripts/fix-vercel-redirects.mjs writes into
  // .vercel/output/config.json (page families + top-level pages only).
  // NOT 'always': Astro 6 applies trailingSlash to endpoints too, so 'always'
  // makes POST /api/lead and /api/analyze-property 404 (verified 2026-10-07 on
  // the dev server) and the form island posts to the slash-less paths. It
  // also makes the Vercel adapter emit a global trailing-slash 308.
  trailingSlash: 'ignore',
  adapter: vercel(),
  integrations: [
    react(),
    mdx(),
    // Exclude noindex routes (paid-ad /lp/* pages + the post-submit /thank-you/)
    // so the sitemap does not contradict their robots meta. The integration's
    // single sitemap-0.xml is then split by family and given lastmod by the
    // postbuild scripts/build-sitemaps.mjs.
    sitemap({
      filter: (page) => !page.includes('/lp/') && !page.includes('/thank-you'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
