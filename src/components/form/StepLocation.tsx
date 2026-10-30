import { useState, useEffect } from 'react';
import { STATES_LIST, STATE_NAMES } from '../../utils/brokerRouting';

interface StepLocationProps {
  value: string;
  onSelect: (value: string) => void;
}

export default function StepLocation({ value, onSelect }: StepLocationProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  // True once the user makes a real selection this mount. When the step renders
  // with a value already set (persisted from an abandoned session), re-picking
  // the SAME option fires no onChange, so auto-advance can never trigger. In
  // that state we show an explicit Continue button instead of stalling the lead.
  const [pickedThisMount, setPickedThisMount] = useState(false);
  const isCovered = (v: string) => STATES_LIST.some((s) => s.value === v);

  useEffect(() => {
    // Only confirm coverage for states the network actually serves. A prefilled
    // excluded state (e.g. from stale persisted data) must not claim a specialist.
    if (value && isCovered(value)) {
      setShowConfirmation(true);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected) {
      setPickedThisMount(true);
      setShowConfirmation(false);
      // Small delay to show the confirmation before auto-advance
      setTimeout(() => {
        onSelect(selected);
      }, 50);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-navy mb-1">Where is the property located?</h3>
      <p className="text-sm text-gray-500 mb-6">We have licensed specialists in all 50 states.</p>

      <select
        value={value}
        onChange={handleChange}
        aria-label="Select state"
        className="w-full bg-white border border-gray-200 rounded px-4 py-3 text-navy text-sm shadow-sm focus:outline-none focus:border-navy-mid focus:ring-1 focus:ring-navy-mid/30 transition-colors duration-150 appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(16,19,25,0.5)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
        }}
      >
        <option value="" disabled className="bg-white text-gray-400">Select a state...</option>
        {STATES_LIST.map((state) => (
          <option key={state.value} value={state.value} className="bg-white text-navy">
            {state.label}
          </option>
        ))}
      </select>

      {value && showConfirmation && (
        <div className="flex items-center gap-2 bg-green/10 border border-green/30 text-green-700 rounded-lg p-3 text-sm mt-4 animate-[fadeIn_200ms_ease-out]">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>We have a licensed DSCR specialist in {STATE_NAMES[value]}.</span>
        </div>
      )}

      {/* Pre-selected state (persisted from an earlier visit): the select fires no
          onChange when the same option is re-picked, so give an explicit way forward. */}
      {value && isCovered(value) && !pickedThisMount && (
        <button
          type="button"
          onClick={() => onSelect(value)}
          className="w-full mt-4 py-3.5 rounded bg-amber hover:bg-amber-deep text-navy text-sm font-bold uppercase tracking-wider transition-colors duration-150"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Continue
        </button>
      )}
    </div>
  );
}
