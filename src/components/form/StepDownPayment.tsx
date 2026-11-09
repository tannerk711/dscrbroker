import SelectionCard from './SelectionCard';

interface StepDownPaymentProps {
  value: string;
  onSelect: (v: string) => void;
}

const DOWN_OPTIONS = [
  { value: '20', label: '20%' },
  { value: '25', label: '25%' },
  { value: '30', label: '30%' },
  { value: '35_plus', label: '35%+' },
];

export default function StepDownPayment({ value, onSelect }: StepDownPaymentProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">How much are you putting down?</h3>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Down payment">
        {DOWN_OPTIONS.map((opt) => (
          <SelectionCard
            key={opt.value}
            value={opt.value}
            label={opt.label}
            selected={value === opt.value}
            onSelect={onSelect}
            compact
          />
        ))}
      </div>

      {(value === '30' || value === '35_plus') && (
        <div className="flex items-start gap-2 bg-green/10 border border-green/20 text-green-400 rounded-lg p-3 text-sm mt-4 animate-[fadeIn_200ms_ease-out]">
          <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>At 30%+ down, you may qualify for No-Ratio DSCR programs. Cash flow doesn't need to be positive.</span>
        </div>
      )}
    </div>
  );
}
