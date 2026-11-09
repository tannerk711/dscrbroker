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
      <h3 className="text-lg font-semibold text-white mb-1">What is your rehab budget?</h3>
      <p className="text-sm text-white/50 mb-6">A rough estimate is fine. Your specialist will refine it on the scope of work.</p>

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
        className="mt-8 w-full py-3 rounded text-sm font-semibold uppercase tracking-wider bg-blue hover:bg-blue/90 text-white cursor-pointer transition-colors duration-150"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        Continue
      </button>
    </div>
  );
}
