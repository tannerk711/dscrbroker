import SelectionCard from './SelectionCard';

interface StepCitizenshipProps {
  value: string;
  onSelect: (v: string) => void;
}

const OPTIONS = [
  { value: 'yes', label: 'Yes', subtitle: 'US Citizen' },
  { value: 'permanent_resident', label: 'Permanent Resident', subtitle: 'Green card holder' },
  { value: 'foreign_national', label: 'Non-Permanent / Foreign National', subtitle: 'Includes foreign nationals and non-permanent residents' },
];

export default function StepCitizenship({ value, onSelect }: StepCitizenshipProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">Are you a US citizen?</h3>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Citizenship status">
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

      {value === 'foreign_national' && (
        <div className="flex items-start gap-2 bg-green/10 border border-green/20 text-green-400 rounded-lg p-3 text-sm mt-4 animate-[fadeIn_200ms_ease-out]">
          <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
          <span>You still qualify. Our Foreign National DSCR program works for international and non-permanent buyers.</span>
        </div>
      )}
    </div>
  );
}
