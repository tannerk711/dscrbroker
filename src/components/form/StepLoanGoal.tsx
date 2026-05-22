import SelectionCard from './SelectionCard';

interface StepLoanGoalProps {
  value: string;
  onSelect: (value: string) => void;
}

function PurchaseIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22L24 6l18 16" />
      <path d="M10 20v18h28V20" />
      <path d="M20 38V28h8v10" />
      <circle cx="36" cy="14" r="6" fill="none" />
      <path d="M34 14h4M36 12v4" />
    </svg>
  );
}

function RefinanceIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22L24 6l18 16" />
      <path d="M10 20v18h28V20" />
      <path d="M30 30l4-4-4-4" />
      <path d="M18 30l-4-4 4-4" />
      <path d="M26 22l-4 12" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 26L24 10l18 16" />
      <path d="M10 24v16h28V24" />
      <path d="M16 34h6v6h-6z" />
      <path d="M26 34h6v6h-6z" />
      <path d="M32 8l6 0 0 6" />
      <path d="M38 8l-8 8" />
    </svg>
  );
}

const GOAL_OPTIONS = [
  { value: 'purchase', label: 'Purchase a Property', subtitle: 'Buy a new investment property', icon: <PurchaseIcon /> },
  { value: 'refinance', label: 'Refinance', subtitle: 'Pull cash out or restructure an existing loan', icon: <RefinanceIcon /> },
  { value: 'flip', label: 'Fix & Flip/Hold', subtitle: 'Buy, renovate, then sell or hold as a rental', icon: <FlipIcon /> },
];

export default function StepLoanGoal({ value, onSelect }: StepLoanGoalProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">What are you looking to do?</h3>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Loan goal">
        {GOAL_OPTIONS.map((opt) => (
          <SelectionCard
            key={opt.value}
            value={opt.value}
            label={opt.label}
            subtitle={opt.subtitle}
            selected={value === opt.value}
            onSelect={onSelect}
            icon={opt.icon}
            horizontal
          />
        ))}
      </div>
    </div>
  );
}
