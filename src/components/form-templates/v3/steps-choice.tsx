// Choice steps for the v3 FHALoans-style template: path cards, process,
// property type, credit, price slider, and the path fork (buy = down-payment slider).
import { useContext, useState, type ReactNode } from 'react';
import {
  PROCESS_OPTIONS,
  PROPERTY_TYPES,
  CREDIT_OPTIONS,
  CREDIT_REASSURANCE,
  PRICE_LABELS,
  PRICE_SUB,
  PRICE_MIN,
  PRICE_MAX,
  PRICE_STEP,
  PRICE_DEFAULT,
  DOWN_MIN,
  DOWN_MAX,
  DOWN_STEP,
  DOWN_DEFAULT,
  formatPrice,
  formatDownPct,
  FORK_QUESTIONS,
  type PathId,
  type CreditOption,
} from '../../../lib/form-templates/flow';
import { StepHeadline, YellowOption, YellowCta, GhostBack, FormV3Ctx } from './bits';
import { BuyArt, RefiArt, FlipArt } from './illustrations';

/* --------------------------- step 1: the three cards --------------------------- */

const PATH_CARDS: { id: PathId; pre: string; key: string; post: string; art: ReactNode }[] = [
  { id: 'buy', pre: 'I want to ', key: 'buy', post: ' a rental', art: <BuyArt /> },
  { id: 'refi', pre: 'I want to ', key: 'refinance', post: '', art: <RefiArt /> },
  { id: 'flip', pre: 'I want to ', key: 'fix & flip', post: '', art: <FlipArt /> },
];

export function StepPath({
  selected,
  onPick,
}: {
  selected?: PathId;
  onPick: (id: PathId) => void;
}) {
  const { embedded } = useContext(FormV3Ctx);
  return (
    <div>
      {embedded ? (
        // The page owns the H1; the question renders like every other step.
        <StepHeadline>What are you looking to do?</StepHeadline>
      ) : (
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="fv3-display fv3-t mx-auto max-w-3xl text-[32px] font-black leading-[1.12] tracking-[-0.008em] sm:text-4xl md:text-5xl">
            Check Your 2026
            <br />
            DSCR Loan Eligibility
          </h1>
          <p className="fv3-t-90 mt-3 text-base sm:text-lg">What are you looking to do?</p>
        </div>
      )}
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3 sm:gap-5">
        {PATH_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onPick(card.id)}
            aria-pressed={selected === card.id}
            className={
              'fv3-card flex min-h-[92px] items-center gap-4 p-4 text-left sm:min-h-0 sm:flex-col sm:gap-5 sm:p-7 sm:text-center' +
              (selected === card.id ? ' fv3-card-selected' : '')
            }
          >
            <span className="h-20 w-20 shrink-0 sm:h-28 sm:w-28">{card.art}</span>
            <span className="fv3-card-text text-lg font-bold sm:text-xl">
              {card.pre}
              <span className="fv3-card-key underline decoration-2 underline-offset-4">
                {card.key}
              </span>
              {card.post}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ step 2: process ------------------------------- */

export function StepProcess({
  path,
  selected,
  onPick,
  onBack,
}: {
  path: PathId;
  selected?: string;
  onPick: (v: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeadline>Where are you in the process?</StepHeadline>
      <div className="mx-auto grid max-w-md gap-3 sm:gap-4">
        {PROCESS_OPTIONS[path].map((opt) => (
          <YellowOption key={opt} label={opt} selected={selected === opt} onSelect={() => onPick(opt)} />
        ))}
      </div>
      <GhostBack onClick={onBack} />
    </div>
  );
}

/* ----------------------------- step 3: property type ---------------------------- */

export function StepProperty({
  propertyType,
  onPickType,
  onBack,
}: {
  propertyType?: string;
  onPickType: (v: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeadline>Tell us about the property.</StepHeadline>
      <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2 sm:gap-4">
        {PROPERTY_TYPES.map((opt, i) => {
          const last = i === PROPERTY_TYPES.length - 1;
          return (
            <div key={opt} className={last ? 'sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.5rem)]' : ''}>
              <YellowOption
                label={opt}
                selected={propertyType === opt}
                onSelect={() => onPickType(opt)}
              />
            </div>
          );
        })}
      </div>
      <GhostBack onClick={onBack} />
    </div>
  );
}

/* -------------------------------- step 4: credit -------------------------------- */

export function StepCredit({
  selected,
  onPick,
  onBack,
}: {
  selected?: string;
  onPick: (opt: CreditOption) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeadline sub={CREDIT_REASSURANCE}>How&apos;s your credit right now?</StepHeadline>
      <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2 sm:gap-4">
        {CREDIT_OPTIONS.map((opt) => (
          <YellowOption
            key={opt.id}
            label={opt.label}
            selected={selected === opt.id}
            onSelect={() => onPick(opt)}
          />
        ))}
      </div>
      <GhostBack onClick={onBack} />
    </div>
  );
}

/* ------------------------------- shared slider ---------------------------------- */

function V3Slider({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  valueText,
  leftLabel,
  rightLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  valueText: string;
  leftLabel: string;
  rightLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <input
        type="range"
        className="fv3-slider"
        style={{ ['--fv3-fill' as string]: `${pct}%` }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        aria-valuetext={valueText}
      />
      <div className="fv3-t-80 mt-1 flex items-center justify-between text-sm font-medium">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

/* ------------------------------ step 5: price slider ----------------------------- */

export function StepPrice({
  path,
  selected,
  onPick,
  onBack,
}: {
  path: PathId;
  selected?: number;
  onPick: (value: number) => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState(selected ?? PRICE_DEFAULT);
  return (
    <div>
      <StepHeadline sub={`(${PRICE_SUB})`}>{PRICE_LABELS[path]}</StepHeadline>
      <div className="mx-auto max-w-md">
        <p className="fv3-t mb-5 text-center text-[40px] font-black leading-[1.12] tracking-[-0.008em] sm:text-5xl">
          {formatPrice(value)}
        </p>
        <V3Slider
          value={value}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          onChange={setValue}
          ariaLabel={PRICE_LABELS[path]}
          valueText={formatPrice(value)}
          leftLabel="$100K"
          rightLabel="$3M+"
        />
        <div className="mt-6">
          <YellowCta label="CONTINUE" onClick={() => onPick(value)} />
        </div>
      </div>
      <GhostBack onClick={onBack} />
    </div>
  );
}

/* --------------------------------- step 6: fork --------------------------------- */

function parseDownPct(stored?: string): number {
  if (!stored) return DOWN_DEFAULT;
  const n = parseInt(stored, 10);
  return Number.isFinite(n) && n >= DOWN_MIN && n <= DOWN_MAX ? n : DOWN_DEFAULT;
}

function StepDownPayment({
  selected,
  price,
  onPick,
  onBack,
}: {
  selected?: string;
  price?: number;
  onPick: (v: string) => void;
  onBack: () => void;
}) {
  const [pct, setPct] = useState(() => parseDownPct(selected));
  let dollarLine: string | null = null;
  if (typeof price === 'number') {
    const amt = Math.round((price * pct) / 100 / 1000) * 1000;
    const fmt = '$' + amt.toLocaleString('en-US');
    dollarLine =
      pct >= DOWN_MAX || price >= PRICE_MAX ? `About ${fmt} or more` : `About ${fmt}`;
  }
  return (
    <div>
      <StepHeadline>{FORK_QUESTIONS.buy.label}</StepHeadline>
      <div className="mx-auto max-w-md">
        <p className="fv3-t mb-1 text-center text-[40px] font-black leading-[1.12] tracking-[-0.008em] sm:text-5xl">
          {formatDownPct(pct)}
        </p>
        {dollarLine ? (
          <p className="fv3-t-soft mb-5 text-center text-sm sm:text-base">{dollarLine}</p>
        ) : (
          <div className="mb-5" />
        )}
        <V3Slider
          value={pct}
          min={DOWN_MIN}
          max={DOWN_MAX}
          step={DOWN_STEP}
          onChange={setPct}
          ariaLabel={FORK_QUESTIONS.buy.label}
          valueText={formatDownPct(pct)}
          leftLabel="20%"
          rightLabel="50%+"
        />
        <div className="mt-6">
          <YellowCta label="CONTINUE" onClick={() => onPick(formatDownPct(pct))} />
        </div>
      </div>
      <GhostBack onClick={onBack} />
    </div>
  );
}

export function StepFork({
  path,
  selected,
  price,
  onPick,
  onBack,
}: {
  path: PathId;
  selected?: string;
  price?: number;
  onPick: (v: string) => void;
  onBack: () => void;
}) {
  if (path === 'buy') {
    return <StepDownPayment selected={selected} price={price} onPick={onPick} onBack={onBack} />;
  }
  const q = FORK_QUESTIONS[path];
  return (
    <div>
      <StepHeadline sub={q.sub}>{q.label}</StepHeadline>
      <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2 sm:gap-4">
        {q.options.map((opt) => (
          <YellowOption key={opt} label={opt} selected={selected === opt} onSelect={() => onPick(opt)} />
        ))}
      </div>
      <GhostBack onClick={onBack} />
    </div>
  );
}
