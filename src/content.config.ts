import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Learn section content collection.
 * Articles live in src/content/learn/[slug].mdx. The file name is the URL slug
 * (/learn/[slug]/). MDX so articles can embed the interactive learn components
 * (MiniCalculator, DSCRGauge, diagrams) directly in the body.
 */
const learn = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/learn' }),
  schema: z.object({
    /** H1 + og:title. Title tag is metaTitle when set (keep under 60 chars). */
    title: z.string(),
    /** <title> tag override, under 60 characters including " | DSCRBroker.com". */
    metaTitle: z.string().optional(),
    /** Meta description, 150-160 characters. */
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['basics', 'programs', 'strategy', 'market']),
    keywords: z.array(z.string()),
    /** Whole minutes. Shown in hub cards + article meta row. */
    readTime: z.number(),
    featured: z.boolean().default(false),
    /** Hub grid sort order (ascending). */
    order: z.number().default(99),
    /**
     * The AEO direct-answer block: a 40-70 word plain-English answer to the
     * article's core question, rendered right under the H1 so AI assistants
     * can lift it verbatim.
     */
    directAnswer: z.string(),
    /** 3-5 FAQs. Rendered as an accordion + FAQPage schema. */
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .min(3)
      .max(5),
    /** Slugs of 2-3 related learn articles for the end-of-article cards. */
    related: z.array(z.string()).default([]),
    /** One money-page link rendered alongside the related guides. */
    moneyLink: z.object({
      label: z.string(),
      href: z.string(),
      blurb: z.string(),
    }),
    /** End-of-article dark CTA band, headline tied to the article's promise. */
    endCta: z.object({
      headline: z.string(),
      body: z.string(),
    }),
  }),
});

export const collections = { learn };
