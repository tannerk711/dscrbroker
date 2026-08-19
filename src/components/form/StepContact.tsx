import { useState, useCallback } from 'react';
import { contactSchema } from '../../utils/formValidation';
import { formatPhoneDisplay } from '../../utils/brokerRouting';

// TCPA consent copy, exported so the submitted consent record carries the exact
// text the user agreed to. If this copy changes, the recorded text changes with
// it automatically. Rendered verbatim below; never let display and record drift.
// SUBMIT_LABEL feeds both the button and the disclosure sentence that names it.
export const SUBMIT_LABEL = 'Match Me With a Specialist';
export const CONSENT_CHECKBOX_TEXT =
  'I agree to be contacted by a licensed DSCR loan specialist about my deal. Submitting this form does not pull my credit.';
export const CONSENT_DISCLOSURE_TEXT =
  `By clicking "${SUBMIT_LABEL}," I consent to receive calls, texts, and emails from a licensed loan specialist. Standard message and data fees may apply. Reply STOP to opt out.`;

interface StepContactProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
  honeypot: string;
  isSubmitting: boolean;
  submitError: string | null;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onConsentChange: (v: boolean) => void;
  onHoneypotChange: (v: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
}

export default function StepContact({
  firstName, lastName, email, phone, consent, honeypot,
  isSubmitting, submitError,
  onFirstNameChange, onLastNameChange, onEmailChange, onPhoneChange,
  onConsentChange, onHoneypotChange, onSubmit, onRetry,
}: StepContactProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((field: string, value: string | boolean) => {
    const data: Record<string, unknown> = { firstName, lastName, email, phone, consent };
    data[field] = value;

    const result = contactSchema.safeParse(data);
    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      const fieldError = result.error.issues.find((i) => i.path[0] === field);
      if (fieldError) {
        setErrors((prev) => ({ ...prev, [field]: fieldError.message }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  }, [firstName, lastName, email, phone, consent]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const values: Record<string, string | boolean> = { firstName, lastName, email, phone, consent };
    validateField(field, values[field]);
  };

  const handlePhoneChange = (val: string) => {
    const formatted = formatPhoneDisplay(val);
    onPhoneChange(formatted);
    if (errors.phone) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    const setters: Record<string, (v: string) => void> = {
      firstName: onFirstNameChange,
      lastName: onLastNameChange,
      email: onEmailChange,
    };
    setters[field]?.(value);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = () => {
    const result = contactSchema.safeParse({ firstName, lastName, email, phone, consent });
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      const newTouched: Record<string, boolean> = {};
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0]);
        newErrors[field] = issue.message;
        newTouched[field] = true;
      });
      setErrors(newErrors);
      setTouched((prev) => ({ ...prev, ...newTouched }));
      return;
    }
    onSubmit();
  };

  const canSubmit = firstName && lastName && email && phone && consent && !isSubmitting;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">Last step before we match you with the DSCR specialist.</h3>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="firstName" className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50 mb-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            onBlur={() => handleBlur('firstName')}
            placeholder="First name"
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            className={`w-full bg-white/5 border rounded px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 transition-colors duration-150 ${
              errors.firstName && touched.firstName
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-white/10 focus:border-blue focus:ring-blue/30'
            }`}
          />
          {errors.firstName && touched.firstName && (
            <p id="firstName-error" className="text-red-400 text-xs mt-1 animate-[fadeIn_150ms_ease-out]">{errors.firstName}</p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50 mb-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            onBlur={() => handleBlur('lastName')}
            placeholder="Last name"
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            className={`w-full bg-white/5 border rounded px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 transition-colors duration-150 ${
              errors.lastName && touched.lastName
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-white/10 focus:border-blue focus:ring-blue/30'
            }`}
          />
          {errors.lastName && touched.lastName && (
            <p id="lastName-error" className="text-red-400 text-xs mt-1 animate-[fadeIn_150ms_ease-out]">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="mb-4">
        <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50 mb-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          placeholder="Email address"
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={`w-full bg-white/5 border rounded px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 transition-colors duration-150 ${
            errors.email && touched.email
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : 'border-white/10 focus:border-blue focus:ring-blue/30'
          }`}
        />
        {errors.email && touched.email && (
          <p id="email-error" className="text-red-400 text-xs mt-1 animate-[fadeIn_150ms_ease-out]">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div className="mb-4">
        <label htmlFor="phone" className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50 mb-1.5" style={{ fontFamily: 'var(--font-sans)' }}>
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          onBlur={() => handleBlur('phone')}
          placeholder="(555) 555-5555"
          aria-describedby={errors.phone ? 'phone-error' : undefined}
          className={`w-full bg-white/5 border rounded px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 transition-colors duration-150 ${
            errors.phone && touched.phone
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : 'border-white/10 focus:border-blue focus:ring-blue/30'
          }`}
        />
        {errors.phone && touched.phone && (
          <p id="phone-error" className="text-red-400 text-xs mt-1 animate-[fadeIn_150ms_ease-out]">{errors.phone}</p>
        )}
      </div>

      {/* Consent */}
      <div className="mb-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              onConsentChange(e.target.checked);
              if (errors.consent) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.consent;
                  return next;
                });
              }
            }}
            className="mt-0.5 w-5 h-5 rounded border border-white/20 bg-white/5 checked:bg-blue checked:border-blue appearance-none cursor-pointer flex-shrink-0 relative
              after:content-[''] after:absolute after:left-1.5 after:top-0.5 after:w-1.5 after:h-3 after:border-white after:border-r-2 after:border-b-2 after:rotate-45 after:opacity-0 checked:after:opacity-100"
          />
          <span className="text-white/60 text-xs leading-relaxed">
            {CONSENT_CHECKBOX_TEXT}
          </span>
        </label>
        {errors.consent && touched.consent && (
          <p className="text-red-400 text-xs mt-1 ml-8 animate-[fadeIn_150ms_ease-out]">{errors.consent}</p>
        )}
        <p className="text-white/40 text-xs leading-relaxed mt-2 ml-8">
          {CONSENT_DISCLOSURE_TEXT}
        </p>
      </div>

      {/* Honeypot */}
      <div className="sr-only" aria-hidden="true" tabIndex={-1}>
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={honeypot}
          onChange={(e) => onHoneypotChange(e.target.value)}
        />
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-4 text-sm mb-4">
          <p>{submitError}</p>
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={onRetry}
              className="bg-white/10 hover:bg-white/20 text-white text-sm px-6 py-2 rounded uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`
          w-full py-4 rounded text-sm font-semibold uppercase tracking-wider transition-colors duration-150
          ${isSubmitting
            ? 'bg-blue/80 text-white/80 cursor-wait'
            : canSubmit
              ? 'bg-blue hover:bg-blue/90 text-white cursor-pointer'
              : 'bg-blue/40 text-white/50 cursor-not-allowed'
          }
        `}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Matching You With a Specialist...
          </span>
        ) : (
          SUBMIT_LABEL
        )}
      </button>

      {/* Privacy note */}
      <p className="text-white/30 text-xs text-center mt-3">
        Your information is shared only with the licensed broker matched to your inquiry. We do not sell your data.
      </p>
    </div>
  );
}
