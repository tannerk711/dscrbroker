import CurrencySlider from './CurrencySlider';

interface StepRehabBudgetProps {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}

const MIN = 0;
const MAX = 500_000;
const STEP = 5_000;
const DEFAULT = 50_000;

export default function StepRehabBudget({ value, onChange, onContinue }: StepRehabBudgetProps) {
  const numeric = value ? Number(value) : DEFAULT;

  return (
    <div>
      <h3 className="text-lg font-semibold text-navy mb-1">What is your rehab budget?</h3>
      <p className="text-sm text-gray-500 mb-6">A rough estimate is fine. Your specialist will refine it on the scope of work.</p>

      <CurrencySlider
        value={numeric}
        onChange={(n) => onChange(String(n))}
        min={MIN}
        max={MAX}
        step={STEP}
        ariaLabel="Rehab budget"
      />

      <button
        type="button"
        onClick={() => {
          if (!value) onChange(String(DEFAULT));
          onContinue();
        }}
        className="mt-8 w-full py-3 rounded text-sm font-bold uppercase tracking-wider bg-amber hover:bg-amber-deep text-navy cursor-pointer transition-colors duration-150"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        Continue
      </button>
    </div>
  );
}
