import CurrencySlider from './CurrencySlider';

interface StepPropertyValueProps {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  headline?: string;
  subhead?: string;
  ariaLabel?: string;
}

const MIN = 100_000;
const MAX = 3_000_000;
const STEP = 25_000;
const DEFAULT = 400_000;

export default function StepPropertyValue({
  value,
  onChange,
  onContinue,
  headline = 'What is the estimated property value?',
  subhead = 'Drag the slider, or tap the number to type your own.',
  ariaLabel = 'Property value',
}: StepPropertyValueProps) {
  const numeric = value ? Number(value) : DEFAULT;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-1">{headline}</h3>
      <p className="text-sm text-white/50 mb-6">{subhead}</p>

      <CurrencySlider
        value={numeric}
        onChange={(n) => onChange(String(n))}
        min={MIN}
        max={MAX}
        step={STEP}
        ariaLabel={ariaLabel}
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
