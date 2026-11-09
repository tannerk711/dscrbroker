import SelectionCard from './SelectionCard';

interface StepTimelineProps {
  value: string;
  onSelect: (v: string) => void;
}

const OPTIONS = [
  { value: 'ready_now', label: 'Ready Now' },
  { value: 'within_30_days', label: 'Within 30 Days' },
  { value: 'within_90_days', label: 'Within 90 Days' },
  { value: 'just_researching', label: 'Just Researching' },
];

export default function StepTimeline({ value, onSelect }: StepTimelineProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">When are you looking to close?</h3>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Timeline">
        {OPTIONS.map((opt) => (
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

      {value === 'just_researching' && (
        <div className="flex items-start gap-2 bg-blue/10 border border-blue/20 text-blue-light rounded-lg p-3 text-sm mt-4 animate-[fadeIn_200ms_ease-out]">
          <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No pressure. We'll review your scenario now so you have a real plan when you're ready.</span>
        </div>
      )}
    </div>
  );
}
