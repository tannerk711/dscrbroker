// Shared UI atoms for the v3 FHALoans-style template.
// Everything here renders on the stage; every color comes through the --fv3-*
// variables declared in FormV3's CSS_TEXT (defaults = the blue/yellow standalone page).
import { createContext, Fragment, useContext, type ReactNode } from 'react';
import { Check, Lock, ShieldCheck } from 'lucide-react';

/** Set by FormV3. `embedded` = the form lives inside a page that owns the H1. */
export const FormV3Ctx = createContext({ embedded: false });

/* ---------------------------------- headline ---------------------------------- */

export function StepHeadline({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  const { embedded } = useContext(FormV3Ctx);
  const Tag = embedded ? 'h2' : 'h1';
  return (
    <div className="mb-7 text-center sm:mb-9">
      <Tag className="fv3-display fv3-t mx-auto max-w-2xl text-[26px] font-bold leading-[1.15] sm:text-3xl md:text-[34px]">
        {children}
      </Tag>
      {sub ? <p className="fv3-t-90 mt-2.5 text-sm sm:text-base">{sub}</p> : null}
    </div>
  );
}

export function MicroLabel({ children }: { children: ReactNode }) {
  return (
    <p className="fv3-t-90 mb-3 text-center text-[11px] font-bold uppercase tracking-[0.18em]">
      {children}
    </p>
  );
}

/* ------------------------------- action buttons ------------------------------- */

export function YellowOption({
  label,
  selected = false,
  onSelect,
}: {
  label: string;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={'fv3-opt' + (selected ? ' fv3-opt-selected' : '')}
    >
      {label}
    </button>
  );
}

export function YellowCta({
  label,
  disabled = false,
  type = 'button',
  onClick,
}: {
  label: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className="fv3-opt fv3-cta">
      {label}
    </button>
  );
}

export function GhostBack({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <div className="mt-7 text-center">
      <button type="button" onClick={onClick} className="fv3-ghost">
        {label}
      </button>
    </div>
  );
}

/* ---------------------------------- inputs ------------------------------------ */

export function SecureInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  type = 'text',
  inputMode,
  autoComplete,
  secure = false,
  confirmed = false,
  center = false,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  secure?: boolean;
  /** Field currently holds a valid value: the SECURE badge lights up green. */
  confirmed?: boolean;
  center?: boolean;
}) {
  return (
    <div className="relative">
      <input
        className={
          'fv3-input w-full' + (secure ? ' pr-[92px]' : '') + (center ? ' text-center' : '')
        }
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        inputMode={inputMode}
        autoComplete={autoComplete}
      />
      {secure ? (
        <span
          aria-hidden="true"
          className={
            'pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-1 transition-colors duration-200 ' +
            (confirmed ? 'fv3-secure-ok' : 'fv3-secure-idle')
          }
        >
          {confirmed ? (
            <ShieldCheck size={12} strokeWidth={2.5} />
          ) : (
            <Lock size={12} strokeWidth={2.5} />
          )}
          <span className="text-[10px] font-bold tracking-[0.12em]">SECURE</span>
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------ milestone stepper ------------------------------ */

const MILESTONES = ['Property', 'Timeline', 'Details', 'Wrap-Up'];

export function MilestoneStepper({
  current,
  allDone = false,
}: {
  current: number;
  allDone?: boolean;
}) {
  return (
    <div className="flex items-start justify-center" aria-hidden="true">
      {MILESTONES.map((label, i) => {
        const done = allDone || i < current;
        const active = !allDone && i === current;
        const reached = done || active;
        return (
          <Fragment key={label}>
            {i > 0 ? (
              <div
                className={
                  'mt-[13px] h-0.5 w-6 rounded-full sm:w-16 md:w-24 ' +
                  (reached ? 'fv3-mile-line-on' : 'fv3-mile-line-off')
                }
              />
            ) : null}
            <div className="flex w-[72px] flex-col items-center gap-1.5 sm:w-24">
              <div
                className={
                  'flex h-7 w-7 items-center justify-center rounded-full ' +
                  (done
                    ? 'fv3-mile-done'
                    : active
                      ? 'fv3-mile-active fv3-mile-ring'
                      : 'fv3-mile-ring-off')
                }
              >
                {done ? (
                  <Check size={16} strokeWidth={3.5} style={{ color: 'var(--fv3-mile-check)' }} />
                ) : null}
                {active ? <span className="fv3-mile-dot h-2.5 w-2.5 rounded-full" /> : null}
              </div>
              <span
                className={
                  'text-[10px] sm:text-[11px] ' +
                  (active ? 'fv3-t font-bold' : 'fv3-t-80 font-medium')
                }
              >
                {label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
