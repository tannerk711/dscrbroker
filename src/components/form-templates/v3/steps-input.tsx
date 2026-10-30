// Input steps for the v3 FHALoans-style template: state combobox, contact, phone.
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  LOCATION_LABELS,
  LOCATION_PLACEHOLDER,
  US_STATES,
  CONTACT_LABEL,
  PHONE_LABEL,
  PHONE_SUB,
  CONSENT_TEXT,
  formatPhone,
  isValidEmail,
  isValidPhone,
  type PathId,
} from '../../../lib/form-templates/flow';
import { StepHeadline, SecureInput, YellowCta, GhostBack } from './bits';

/* -------------------------- step 7: state combobox ------------------------------ */

const LIST_ID = 'fv3-state-list';

export function StepLocation({
  path,
  value,
  onChange,
  onContinue,
  onBack,
}: {
  path: PathId;
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const q = value.trim();
  const matches = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();
    return US_STATES.filter((s) => s.toLowerCase().includes(needle)).slice(0, 7);
  }, [q]);
  const valid = US_STATES.some((s) => s.toLowerCase() === q.toLowerCase());
  const listOpen = open && matches.length > 0;

  const select = (state: string) => {
    onChange(state);
    setOpen(false);
  };

  const handleInput = (raw: string) => {
    // Exact case-insensitive match stores the canonical spelling.
    const canon = US_STATES.find((s) => s.toLowerCase() === raw.trim().toLowerCase());
    onChange(canon ?? raw);
    setOpen(true);
    setHighlight(0);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!listOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(matches[Math.min(highlight, matches.length - 1)]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onContinue();
  };

  return (
    <form onSubmit={submit} noValidate>
      <StepHeadline>{LOCATION_LABELS[path]}</StepHeadline>
      <div className="mx-auto max-w-md">
        <div>
          <input
            className="fv3-input w-full text-center"
            type="text"
            role="combobox"
            aria-expanded={listOpen}
            aria-controls={LIST_ID}
            aria-activedescendant={listOpen ? `fv3-state-opt-${highlight}` : undefined}
            aria-autocomplete="list"
            aria-label="State"
            autoComplete="off"
            placeholder={LOCATION_PLACEHOLDER}
            value={value}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => setOpen(false)}
          />
          {listOpen ? (
            <ul
              id={LIST_ID}
              role="listbox"
              aria-label="States"
              className="fv3-list mt-2 overflow-hidden rounded-[10px] py-1.5"
            >
              {matches.map((s, i) => (
                <li key={s} role="presentation">
                  <button
                    type="button"
                    role="option"
                    id={`fv3-state-opt-${i}`}
                    aria-selected={i === highlight}
                    tabIndex={-1}
                    className={
                      'flex min-h-[44px] w-full cursor-pointer items-center justify-center px-4 text-[16px] font-semibold transition-colors duration-100 ' +
                      (i === highlight ? 'fv3-list-hl' : 'fv3-list-item')
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => select(s)}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="mt-5">
          <YellowCta label="CONTINUE" type="submit" disabled={!valid} />
        </div>
      </div>
      <GhostBack onClick={onBack} />
    </form>
  );
}

/* -------------------------------- step 8: contact ------------------------------- */

export function StepContact({
  firstName,
  lastName,
  email,
  onPatch,
  onContinue,
  onBack,
}: {
  firstName: string;
  lastName: string;
  email: string;
  onPatch: (patch: { firstName?: string; lastName?: string; email?: string }) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const firstOk = firstName.trim().length >= 2;
  const lastOk = lastName.trim().length >= 2;
  const emailOk = isValidEmail(email);
  const valid = firstOk && lastOk && emailOk;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onContinue();
  };
  return (
    <form onSubmit={submit} noValidate>
      <StepHeadline>{CONTACT_LABEL}</StepHeadline>
      <div className="mx-auto grid max-w-lg gap-3 sm:grid-cols-2 sm:gap-4">
        <SecureInput
          value={firstName}
          onChange={(v) => onPatch({ firstName: v })}
          placeholder="First name"
          ariaLabel="First name"
          autoComplete="given-name"
          secure
          confirmed={firstOk}
        />
        <SecureInput
          value={lastName}
          onChange={(v) => onPatch({ lastName: v })}
          placeholder="Last name"
          ariaLabel="Last name"
          autoComplete="family-name"
          secure
          confirmed={lastOk}
        />
        <div className="sm:col-span-2">
          <SecureInput
            value={email}
            onChange={(v) => onPatch({ email: v })}
            placeholder="Email address"
            ariaLabel="Email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            secure
            confirmed={emailOk}
          />
        </div>
        <div className="sm:col-span-2">
          <YellowCta label="CONTINUE" type="submit" disabled={!valid} />
        </div>
      </div>
      <GhostBack onClick={onBack} />
    </form>
  );
}

/* --------------------------------- step 9: phone -------------------------------- */

export function StepPhone({
  phone,
  consent,
  honeypot,
  onPhoneChange,
  onConsentChange,
  onHoneypotChange,
  onSubmit,
  onBack,
  busy = false,
  busyLabel,
  error = null,
}: {
  phone: string;
  consent: boolean;
  /** Trap field value (label only, never a gate): travels as ff_hp on the payload. */
  honeypot: string;
  onPhoneChange: (v: string) => void;
  onConsentChange: (v: boolean) => void;
  onHoneypotChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  /** Live delivery: the POST is in flight (button disabled, label swapped). */
  busy?: boolean;
  busyLabel?: string;
  /** Live delivery: the POST failed; shown above the button, which stays live to retry. */
  error?: string | null;
}) {
  const phoneOk = isValidPhone(phone);
  const valid = phoneOk && consent;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !busy) onSubmit();
  };
  return (
    <form onSubmit={submit} noValidate>
      <StepHeadline sub={PHONE_SUB}>{PHONE_LABEL}</StepHeadline>
      <div className="mx-auto max-w-md">
        <SecureInput
          value={phone}
          onChange={(v) => onPhoneChange(formatPhone(v))}
          placeholder="(555) 123-4567"
          ariaLabel="Mobile phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          secure
          confirmed={phoneOk}
          center
        />
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-left">
          <input
            type="checkbox"
            className="fv3-checkbox"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
          />
          <span className="fv3-t-95 text-[13px] leading-relaxed">{CONSENT_TEXT}</span>
        </label>
        {/* Honeypot: same trap as the live form (DSCRForm StepContact). A filled
            value travels as ff_hp and the server labels the lead; nothing is gated. */}
        <div className="sr-only" aria-hidden="true" tabIndex={-1}>
          <label htmlFor="fv3-ff-hp">Leave this empty</label>
          <input
            type="text"
            id="fv3-ff-hp"
            name="ff_hp"
            autoComplete="off"
            tabIndex={-1}
            aria-hidden="true"
            data-lpignore="true"
            data-1p-ignore
            data-form-type="other"
            value={honeypot}
            onChange={(e) => onHoneypotChange(e.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="fv3-t mt-5 text-center text-sm font-semibold leading-snug">
            {error}
          </p>
        ) : null}
        <div className="mt-6">
          <YellowCta
            label={busy ? busyLabel ?? 'SENDING...' : 'MATCH ME WITH A BROKER'}
            type="submit"
            disabled={!valid || busy}
          />
        </div>
      </div>
      <GhostBack onClick={onBack} />
    </form>
  );
}
