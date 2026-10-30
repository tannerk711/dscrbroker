// Friendly line-art illustrations for the step 1 cards, drawn in the
// fhaloans.com outline style: soft circle backdrop, rounded strokes, light
// fills and one accent. Every color is a --fv3-art-* variable applied through
// the style attribute: SVG presentation attributes cannot read custom
// properties, style can. A <g> needs nothing.

import { type ReactNode } from 'react';

const STROKE = 'var(--fv3-art-stroke)';
const BACKDROP = 'var(--fv3-art-backdrop)';
const FILL_LIGHT = 'var(--fv3-art-fill)';
const PAPER = 'var(--fv3-art-paper)';
const ACCENT = 'var(--fv3-art-accent)';
const LEAF = 'var(--fv3-art-leaf)';

const line = {
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Outlined shape: stroke plus the given fill ('none' for bare lines). */
const shape = (fill: string) => ({ ...line, style: { stroke: STROKE, fill } });
/** Unstroked solid shape (dots, keypad keys, arrowhead, hammer). */
const solid = (fill: string) => ({ style: { fill } });

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden="true" focusable="false">
      <circle cx="48" cy="48" r="44" {...solid(BACKDROP)} />
      {children}
    </svg>
  );
}

/** House with a picket fence: buy a rental. */
export function BuyArt() {
  return (
    <Frame>
      <path d="M18 68 H80" {...shape('none')} />
      <rect x="30" y="44" width="30" height="24" {...shape(PAPER)} />
      <path d="M26 46 L45 29 L64 46 Z" {...shape(FILL_LIGHT)} />
      <rect x="41" y="54" width="9" height="14" {...shape(FILL_LIGHT)} />
      <rect x="33" y="50" width="6" height="6" {...shape(PAPER)} />
      <path d="M64 60 H79" {...shape('none')} />
      <path d="M66 56 V68 M71.5 56 V68 M77 56 V68" {...shape('none')} />
      <circle cx="24" cy="62" r="5" {...shape(LEAF)} />
    </Frame>
  );
}

/** Calculator in a browser window: refinance the numbers. */
export function RefiArt() {
  return (
    <Frame>
      <rect x="26" y="27" width="44" height="43" rx="4" {...shape(PAPER)} />
      <path d="M26 37.5 H70" {...shape('none')} />
      <circle cx="32" cy="32.2" r="1.6" {...solid(STROKE)} />
      <circle cx="37.5" cy="32.2" r="1.6" {...solid(STROKE)} />
      <circle cx="43" cy="32.2" r="1.6" {...solid(STROKE)} />
      <rect x="32" y="42.5" width="32" height="8.5" rx="2" {...shape(BACKDROP)} />
      <path
        d="M37 46.8 H45"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ stroke: STROKE, fill: 'none' }}
      />
      <rect x="32" y="55.5" width="6.5" height="4.5" rx="1.5" {...solid(FILL_LIGHT)} />
      <rect x="40.5" y="55.5" width="6.5" height="4.5" rx="1.5" {...solid(FILL_LIGHT)} />
      <rect x="49" y="55.5" width="6.5" height="4.5" rx="1.5" {...solid(FILL_LIGHT)} />
      <rect x="57.5" y="55.5" width="6.5" height="4.5" rx="1.5" {...solid(FILL_LIGHT)} />
      <rect x="32" y="62.5" width="6.5" height="4.5" rx="1.5" {...solid(FILL_LIGHT)} />
      <rect x="40.5" y="62.5" width="6.5" height="4.5" rx="1.5" {...solid(FILL_LIGHT)} />
      <rect x="49" y="62.5" width="6.5" height="4.5" rx="1.5" {...solid(FILL_LIGHT)} />
      <rect x="57.5" y="62.5" width="6.5" height="4.5" rx="1.5" {...solid(ACCENT)} />
    </Frame>
  );
}

/** House with a hammer badge and renovation arrow: fix and flip. */
export function FlipArt() {
  return (
    <Frame>
      <path d="M20 68 H72" {...shape('none')} />
      <rect x="30" y="46" width="28" height="22" {...shape(PAPER)} />
      <path d="M26 48 L44 31 L62 48 Z" {...shape(FILL_LIGHT)} />
      <rect x="39" y="56" width="8" height="12" {...shape(FILL_LIGHT)} />
      <path d="M28 24 Q42 13 54 19" {...shape('none')} />
      <path d="M56 21 L48.6 20.4 L52.6 14.6 Z" {...solid(STROKE)} />
      <circle cx="68" cy="30" r="11" {...shape(ACCENT)} />
      <g transform="rotate(-45 68 30)">
        <rect x="63.5" y="23.5" width="9" height="5" rx="1.4" {...solid(STROKE)} />
        <rect x="66.8" y="28.5" width="2.6" height="9" rx="1.3" {...solid(STROKE)} />
      </g>
    </Frame>
  );
}
