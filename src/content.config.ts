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

/**
 * Scenario keyword landing pages (/dscr-loans/[slug]/).
 * One page per distinct search INTENT (never one per keyword string), each a
 * conversion-first landing page that owns exactly one query family. The system
 * scales by adding MDX files here, zero code. Roadmap + anti-doorway rules:
 * context/seo/keyword-lp-roadmap.md. The MDX body is where per-page uniqueness
 * lives; the frontmatter modules (quickFacts, faqs) must also be genuinely
 * different page to page or the set reads as doorway pages.
 */
const scenarios = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/scenarios' }),
  schema: z.object({
    /** H1 + og:title. Title tag is metaTitle when set (keep under 60 chars). */
    title: z.string(),
    /** <title> tag override, under 60 characters including " | DSCRBroker.com". */
    metaTitle: z.string().optional(),
    /** Meta description, 150-160 characters. */
    description: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** Hub grouping + breadcrumb/badge label. One cluster per page. */
    cluster: z.enum([
      'borrowers',
      'property-types',
      'refinance',
      'mechanics',
      'comparisons',
      'strategies',
      'questions',
      'lenders',
    ]),
    /** The single keyword/intent this page owns. Checked against the roadmap. */
    primaryKeyword: z.string(),
    /** Variant strings this SAME page absorbs (title/meta/H2 fodder). */
    keywords: z.array(z.string()),
    /** Whole minutes, shown in the meta row. */
    readTime: z.number(),
    /** Hub grid sort order within its cluster (ascending). */
    order: z.number().default(99),
    /**
     * The AEO direct-answer block: a 40-70 word plain-English answer to the
     * page's core question, rendered right under the H1 so AI assistants can
     * lift it verbatim. ChatGPT citations concentrate in the first 30% of a
     * page, so this block plus the hero IS the citation surface.
     */
    directAnswer: z.string(),
    /**
     * 4 scenario-specific stat chips under the answer card. Must be unique
     * per page (part of the doorway-proof surface). Label under ~28 chars,
     * value under ~14 chars.
     */
    quickFacts: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .min(3)
      .max(4),
    /** 4-8 FAQs. Accordion + FAQPage schema (kept for Bing/Perplexity). */
    faqs: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .min(4)
      .max(8),
    /**
     * Cross-links out of the page (learn articles, program pages, sibling
     * scenarios). 2-4 entries; every page must also RECEIVE 2+ contextual
     * links from existing pages (no orphans).
     */
    related: z
      .array(
        z.object({
          href: z.string(),
          title: z.string(),
          blurb: z.string(),
          /** Small card tag, e.g. "Guide", "Program", "Scenario". */
          tag: z.string(),
        })
      )
      .min(2)
      .max(4),
    /** End-of-page dark CTA band, headline tied to the page's promise. */
    endCta: z.object({
      headline: z.string(),
      body: z.string(),
    }),
  }),
});

export const collections = { learn, scenarios };
