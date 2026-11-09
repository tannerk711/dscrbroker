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
          px-4 py-2.5 text-sm rounded border cursor-pointer transition-all duration-150 text-center
          ${selected
            ? 'bg-blue/10 border-blue text-white'
            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
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
            ? 'bg-blue/10 border-blue ring-1 ring-blue/30'
            : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]'
          }
        `}
      >
        {icon && (
          <div className={`w-10 h-10 flex-shrink-0 transition-colors duration-200 ${selected ? 'text-blue' : 'text-white/50 group-hover:text-white/70'}`}>
            {icon}
          </div>
        )}
        <div className="text-left">
          <span className={`text-[15px] font-semibold block transition-colors duration-200 ${selected ? 'text-white' : 'text-white/80'}`}>
            {label}
          </span>
          {subtitle && (
            <span className={`text-xs mt-0.5 block transition-colors duration-200 ${selected ? 'text-white/70' : 'text-white/60'}`}>
              {subtitle}
            </span>
          )}
        </div>
        {/* Selection indicator */}
        <div className={`ml-auto w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
          selected
            ? 'border-blue bg-blue'
            : 'border-white/20 group-hover:border-white/30'
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
          ? 'bg-blue/10 border-2 border-blue ring-1 ring-blue/30'
          : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
        }
      `}
    >
      {icon && (
        <div className={`w-12 h-12 ${selected ? 'text-blue' : 'text-white/70'}`}>
          {icon}
        </div>
      )}
      <span
        className={`text-[13px] font-semibold uppercase tracking-wider ${selected ? 'text-white' : 'text-white/80'}`}
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {label}
      </span>
    </button>
  );
}
