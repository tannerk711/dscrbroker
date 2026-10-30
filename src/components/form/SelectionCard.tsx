import type { ReactNode } from 'react';

interface SelectionCardProps {
  value: string;
  label: string;
  selected: boolean;
  onSelect: (value: string) => void;
  icon?: ReactNode;
  compact?: boolean;
  horizontal?: boolean;
  subtitle?: string;
}

export default function SelectionCard({ value, label, selected, onSelect, icon, compact, horizontal, subtitle }: SelectionCardProps) {
  if (compact) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onSelect(value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(value); } }}
        className={`
          px-4 py-2.5 text-sm font-semibold rounded border cursor-pointer transition-all duration-150 text-center
          ${selected
            ? 'bg-brand-soft border-navy-mid text-navy ring-1 ring-navy-mid/30'
            : 'bg-white border-gray-200 text-gray-600 shadow-sm hover:bg-gray-100 hover:border-gray-300'
          }
        `}
      >
        {label}
      </button>
    );
  }

  if (horizontal) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onSelect(value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(value); } }}
        className={`
          group flex items-center gap-4 w-full px-5 py-4 rounded-lg border cursor-pointer transition-all duration-200
          ${selected
            ? 'bg-brand-soft border-navy-mid ring-1 ring-navy-mid/30'
            : 'bg-white border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'
          }
        `}
      >
        {icon && (
          <div className={`w-10 h-10 flex-shrink-0 transition-colors duration-200 ${selected ? 'text-navy-mid' : 'text-gray-400 group-hover:text-gray-500'}`}>
            {icon}
          </div>
        )}
        <div className="text-left">
          <span className={`text-[15px] font-semibold block transition-colors duration-200 ${selected ? 'text-navy' : 'text-gray-600'}`}>
            {label}
          </span>
          {subtitle && (
            <span className={`text-xs mt-0.5 block transition-colors duration-200 ${selected ? 'text-gray-600' : 'text-gray-500'}`}>
              {subtitle}
            </span>
          )}
        </div>
        {/* Selection indicator */}
        <div className={`ml-auto w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
          selected
            ? 'border-navy-mid bg-navy-mid'
            : 'border-gray-300 group-hover:border-gray-400'
        }`}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(value); } }}
      className={`
        flex flex-col items-center gap-3 p-6 rounded-md border cursor-pointer transition-all duration-200
        ${selected
          ? 'bg-brand-soft border-2 border-navy-mid ring-1 ring-navy-mid/30'
          : 'bg-white border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'
        }
      `}
    >
      {icon && (
        <div className={`w-12 h-12 ${selected ? 'text-navy-mid' : 'text-gray-400'}`}>
          {icon}
        </div>
      )}
      <span
        className={`text-[13px] font-semibold uppercase tracking-wider ${selected ? 'text-navy' : 'text-gray-600'}`}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </span>
    </button>
  );
}
