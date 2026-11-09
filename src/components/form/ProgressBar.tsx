interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percent = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40 mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
        Step {currentStep} of {totalSteps}
      </p>
      <div
        className="h-1.5 bg-white/10 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Form progress: step ${currentStep} of ${totalSteps}`}
      >
        <div
          className="h-full bg-blue rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
