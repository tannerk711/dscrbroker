import SelectionCard from './SelectionCard';

interface StepCreditScoreProps {
  value: string;
  onSelect: (v: string) => void;
}

const CREDIT_OPTIONS = [
  { value: '740_plus', label: '740+' },
  { value: '700_739', label: '700-739' },
  { value: '640_699', label: '640-699' },
  { value: 'below_640', label: 'Below 640' },
];

export default function StepCreditScore({ value, onSelect }: StepCreditScoreProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">What is your credit score range?</h3>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Credit score range">
        {CREDIT_OPTIONS.map((opt) => (
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

      {value === '740_plus' && (
        <div className="flex items-start gap-2 bg-green/10 border border-green/20 text-green-400 rounded-lg p-3 text-sm mt-4 animate-[fadeIn_200ms_ease-out]">
          <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span>740+ FICO opens up the broadest set of programs across the lender network.</span>
        </div>
      )}
      {value === 'below_640' && (
        <div className="flex items-start gap-2 bg-amber/10 border border-amber/20 text-amber rounded-lg p-3 text-sm mt-4 animate-[fadeIn_200ms_ease-out]">
          <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Most DSCR programs require 640+. Some lenders go lower. A specialist will review your options.</span>
        </div>
      )}
    </div>
  );
}
