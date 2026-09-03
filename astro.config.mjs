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
  adapter: vercel(),
  integrations: [
    react(),
    mdx(),
    // Exclude noindex routes (paid-ad /lp/* pages + the post-submit /thank-you/)
    // so the sitemap does not contradict their robots meta.
    sitemap({
      filter: (page) => !page.includes('/lp/') && !page.includes('/thank-you'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
