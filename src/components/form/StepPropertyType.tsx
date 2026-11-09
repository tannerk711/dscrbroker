import SelectionCard from './SelectionCard';

interface StepPropertyTypeProps {
  value: string;
  onSelect: (value: string) => void;
}

function HouseIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22L24 6l18 16" />
      <path d="M10 20v18h28V20" />
      <path d="M20 38V28h8v10" />
    </svg>
  );
}

function CondoIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="12" y="8" width="24" height="32" rx="1" />
      <rect x="17" y="14" width="4" height="4" />
      <rect x="27" y="14" width="4" height="4" />
      <rect x="17" y="22" width="4" height="4" />
      <rect x="27" y="22" width="4" height="4" />
      <rect x="17" y="30" width="4" height="4" />
      <rect x="27" y="30" width="4" height="4" />
    </svg>
  );
}

function NonWarrantableIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="12" y="8" width="24" height="32" rx="1" />
      <rect x="17" y="14" width="4" height="4" />
      <rect x="27" y="14" width="4" height="4" />
      <rect x="17" y="22" width="4" height="4" />
      <rect x="27" y="22" width="4" height="4" />
      <rect x="17" y="30" width="4" height="4" />
      <rect x="27" y="30" width="4" height="4" />
      <path d="M38 12l6 6M44 12l-6 6" />
    </svg>
  );
}

function MultiFamilySmallIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="14" width="32" height="26" rx="1" />
      <path d="M8 14L24 6l16 8" />
      <rect x="14" y="20" width="6" height="5" />
      <rect x="28" y="20" width="6" height="5" />
      <rect x="14" y="30" width="6" height="5" />
      <rect x="28" y="30" width="6" height="5" />
    </svg>
  );
}

function MultiFamilyLargeIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="8" width="28" height="32" rx="1" />
      <rect x="16" y="13" width="5" height="4" />
      <rect x="27" y="13" width="5" height="4" />
      <rect x="16" y="21" width="5" height="4" />
      <rect x="27" y="21" width="5" height="4" />
      <rect x="16" y="29" width="5" height="4" />
      <rect x="27" y="29" width="5" height="4" />
      <rect x="20" y="35" width="8" height="5" />
    </svg>
  );
}

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Rental', subtitle: '1 unit, detached or attached', icon: <HouseIcon /> },
  { value: 'warrantable_condo', label: 'Warrantable Condo', subtitle: 'Fannie/Freddie warrantable HOA', icon: <CondoIcon /> },
  { value: 'non_warrantable_condo', label: 'Non-Warrantable Condo', subtitle: 'Outside agency guidelines', icon: <NonWarrantableIcon /> },
  { value: 'multi_family_small', label: 'Multi-Family (2-4 Units)', subtitle: 'Duplex, triplex, or fourplex', icon: <MultiFamilySmallIcon /> },
  { value: 'multi_family_large', label: 'Multi-Family (5+ Units)', subtitle: 'Apartment buildings', icon: <MultiFamilyLargeIcon /> },
];

export default function StepPropertyType({ value, onSelect }: StepPropertyTypeProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-6">What type of property are you financing?</h3>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Property type">
        {PROPERTY_TYPES.map((type) => (
          <SelectionCard
            key={type.value}
            value={type.value}
            label={type.label}
            subtitle={type.subtitle}
            selected={value === type.value}
            onSelect={onSelect}
            icon={type.icon}
            horizontal
          />
        ))}
      </div>
    </div>
  );
}
