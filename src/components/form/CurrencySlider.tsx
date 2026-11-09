import { useEffect, useRef, useState } from 'react';

function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

type Props = {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step: number;
  ariaLabel: string;
  helperHint?: string;
  freeAndClearCopy?: string;
};

export default function CurrencySlider({
  value,
  onChange,
  min,
  max,
  step,
  ariaLabel,
  helperHint,
  freeAndClearCopy,
}: Props) {
  const [inputText, setInputText] = useState(formatUsd(value));
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (value !== lastValueRef.current) {
      setInputText(formatUsd(value));
      lastValueRef.current = value;
    }
  }, [value]);

  function snapToStep(n: number): number {
    if (step <= 0) return n;
    return Math.round(n / step) * step;
  }

  function clamp(n: number): number {
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function commitNumber(n: number) {
    const finalValue = clamp(snapToStep(clamp(n)));
    onChange(finalValue);
    setInputText(formatUsd(finalValue));
    lastValueRef.current = finalValue;
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const n = Number(e.target.value);
    if (Number.isFinite(n)) {
      onChange(n);
      setInputText(formatUsd(n));
      lastValueRef.current = n;
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value);
  }

  function handleTextBlur() {
    const digits = inputText.replace(/[^0-9]/g, '');
    if (!digits) {
      setInputText(formatUsd(value));
      return;
    }
    commitNumber(Number(digits));
  }

  function handleTextKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  const clampedForProgress = Math.min(Math.max(value, min), max);
  const progressPct = max > min ? ((clampedForProgress - min) / (max - min)) * 100 : 0;

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={inputText}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKey}
          aria-label={`${ariaLabel} (type to override)`}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-center text-2xl font-bold tabular-nums text-white shadow-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/30 md:text-3xl"
          style={{ fontFamily: 'var(--font-sans)' }}
        />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedForProgress}
        onChange={handleSliderChange}
        aria-label={ariaLabel}
        className="dscr-slider mt-4 w-full"
        style={{ ['--range-progress' as string]: `${progressPct}%` }}
      />

      <div className="mt-2 flex items-center justify-between text-xs text-white/40 tabular-nums" style={{ fontFamily: 'var(--font-sans)' }}>
        <span>{formatUsd(min)}</span>
        <span>{formatUsd(max)}</span>
      </div>

      {helperHint && (
        <p className="mt-3 text-center text-xs text-white/50">{helperHint}</p>
      )}
      {freeAndClearCopy && value === 0 && (
        <p className="mt-3 text-center text-xs font-medium text-green-400">
          {freeAndClearCopy}
        </p>
      )}
    </div>
  );
}
