import SelectionCard from './SelectionCard';

interface StepCashFlowProps {
  value: string;
  onSelect: (v: string) => void;
}

const OPTIONS = [
  { value: 'positive', label: 'Positive Cash Flow', subtitle: 'Rent comfortably exceeds the mortgage payment' },
  { value: 'break_even', label: 'Break-Even', subtitle: 'Rent roughly matches the mortgage payment' },
  { value: 'negative', label: 'Negative Cash Flow', subtitle: 'Mortgage payment exceeds the rent' },
];

export default function StepCashFlow({ value, onSelect }: StepCashFlowProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">What's the expected cash flow on this property?</h3>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Expected cash flow">
        {OPTIONS.map((opt) => (
          <SelectionCard
            key={opt.value}
            value={opt.value}
            label={opt.label}
            subtitle={opt.subtitle}
            selected={value === opt.value}
            onSelect={onSelect}
            horizontal
          />
        ))}
      </div>

      {value === 'negative' && (
        <div className="flex items-start gap-2 bg-blue/10 border border-blue/20 text-blue-light rounded-lg p-3 text-sm mt-4 animate-[fadeIn_200ms_ease-out]">
          <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Negative cash flow works on a No-Ratio DSCR program at 30%+ down. Your specialist will route accordingly.</span>
        </div>
      )}
    </div>
  );
}
