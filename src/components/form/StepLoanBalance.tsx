import CurrencySlider from './CurrencySlider';

interface StepLoanBalanceProps {
  value: string;
  propertyValue: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}

const STEP = 10_000;

export default function StepLoanBalance({ value, propertyValue, onChange, onContinue }: StepLoanBalanceProps) {
  const propVal = propertyValue ? Number(propertyValue) : 400_000;
  const max = Math.max(propVal, 10_000);
  const defaultBal = Math.round(propVal * 0.5 / STEP) * STEP;
  const numeric = value !== '' ? Number(value) : defaultBal;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-1">How much do you still owe?</h3>
      <p className="text-sm text-white/50 mb-6">Approximate is fine. Your specialist will pull the exact payoff.</p>

      <CurrencySlider
        value={numeric}
        onChange={(n) => onChange(String(n))}
        min={0}
        max={max}
        step={STEP}
        ariaLabel="Current loan balance"
        freeAndClearCopy="Free and clear. That's a strong cash-out scenario."
      />

      <button
        type="button"
        onClick={() => {
          if (value === '') onChange(String(defaultBal));
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
