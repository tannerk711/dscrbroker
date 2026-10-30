// Kick-out and success screens for the v3 FHALoans-style template.
import { useContext } from 'react';
import { Check } from 'lucide-react';
import {
  KICKOUT,
  PATHS,
  formatPrice,
  type TemplateAnswers,
} from '../../../lib/form-templates/flow';
import { YellowCta, FormV3Ctx } from './bits';

/** Slider value, formatted exactly as the visitor saw it ("$3M+" at the top). */
function priceChip(price?: number): string | undefined {
  return typeof price === 'number' ? formatPrice(price) : undefined;
}

export interface KickoutCopy {
  headline: string;
  body: string;
  backLabel: string;
}

/** Default = the sub-620 credit kick-out (flow.ts); a host may pass other copy (excluded state). */
export function KickoutScreen({ onBack, copy = KICKOUT }: { onBack: () => void; copy?: KickoutCopy }) {
  const { embedded } = useContext(FormV3Ctx);
  const Tag = embedded ? 'h2' : 'h1';
  return (
    <div className="mx-auto max-w-xl text-center">
      <Tag className="fv3-display fv3-t text-[28px] font-black leading-[1.12] sm:text-4xl">
        {copy.headline}
      </Tag>
      <p className="fv3-t-90 mt-4 text-base leading-relaxed sm:text-lg">{copy.body}</p>
      <div className="mx-auto mt-8 max-w-sm">
        <YellowCta label={copy.backLabel} onClick={onBack} />
      </div>
    </div>
  );
}

export function SuccessScreen({ answers }: { answers: TemplateAnswers }) {
  const { embedded } = useContext(FormV3Ctx);
  const Tag = embedded ? 'h2' : 'h1';
  const pathLabel = PATHS.find((p) => p.id === answers.path)?.label;
  const chips = [pathLabel, answers.propertyType, answers.location, priceChip(answers.price)].filter(
    (c): c is string => Boolean(c),
  );

  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="relative mx-auto h-24 w-24">
        <svg
          viewBox="0 0 96 96"
          className="fv3-rays absolute inset-0 h-full w-full"
          aria-hidden="true"
          focusable="false"
        >
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            const x1 = 48 + Math.cos(a) * 34;
            const y1 = 48 + Math.sin(a) * 34;
            const x2 = 48 + Math.cos(a) * 46;
            const y2 = 48 + Math.sin(a) * 46;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                style={{ stroke: 'var(--fv3-rays)' }}
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="fv3-check-pop fv3-success-disc absolute inset-2 flex items-center justify-center rounded-full">
          <Check size={44} strokeWidth={3.5} style={{ color: 'var(--fv3-success-check)' }} />
        </div>
      </div>

      <Tag className="fv3-display fv3-t mt-7 text-[32px] font-black uppercase leading-[1.12] tracking-[-0.008em] sm:text-4xl">
        You&apos;re matched
      </Tag>
      <p className="fv3-t-90 mx-auto mt-3 max-w-md text-base leading-relaxed sm:text-lg">
        Your match request went through. A licensed DSCR broker will personally text and call you
        about your deal.
      </p>

      <p className="fv3-t-muted mt-8 text-[11px] font-bold uppercase tracking-[0.18em]">
        Your request
      </p>
      <ul className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {chips.map((chip) => (
          <li
            key={chip}
            className="fv3-pill rounded-full px-3.5 py-1.5 text-xs font-medium sm:text-sm"
          >
            {chip}
          </li>
        ))}
      </ul>

      <p className="fv3-t-60 mt-8 text-[11px]">Test build: saved to this browser only.</p>
    </div>
  );
}
