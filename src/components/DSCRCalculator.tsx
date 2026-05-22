import { useState, useMemo } from 'react';
import { calculateDSCR, formatCurrency, formatDSCR } from '../lib/dscr-calculator';

type Mode = 'simple' | 'detailed';

const VERDICT_COLORS: Record<string, string> = {
  strong: 'text-green',
  positive: 'text-blue',
  breakeven: 'text-blue',
  negative: 'text-amber',
  review: 'text-red',
};

const VERDICT_BG: Record<string, string> = {
  strong: 'bg-green/10 border-green/20',
  positive: 'bg-blue/10 border-blue/20',
  breakeven: 'bg-blue/10 border-blue/20',
  negative: 'bg-amber/10 border-amber/20',
  review: 'bg-red/10 border-red/20',
};

export default function DSCRCalculator() {
  const [mode, setMode] = useState<Mode>('simple');

  // Simple mode
  const [simpleRent, setSimpleRent] = useState('');
  const [simplePITIA, setSimplePITIA] = useState('');

  // Detailed mode
  const [purchasePrice, setPurchasePrice] = useState('350000');
  const [downPaymentPct, setDownPaymentPct] = useState(25);
  const [loanTerm, setLoanTerm] = useState(30);
  const [propertyTax, setPropertyTax] = useState('');
  const [insurance, setInsurance] = useState('150');
  const [hoa, setHoa] = useState('0');
  const [monthlyRent, setMonthlyRent] = useState('2200');

  // Internal calculation assumption, never displayed.
  // PITIA math requires an interest assumption; cash flow shown is an estimate only.
  const ASSUMED_RATE_FOR_PITIA = 7.0;

  const parseDollar = (v: string) => parseFloat(v.replace(/[^0-9.]/g, '')) || 0;

  // Simple DSCR calculation
  const simpleDSCR = useMemo(() => {
    const rent = parseDollar(simpleRent);
    const pitia = parseDollar(simplePITIA);
    if (pitia <= 0) return null;
    const ratio = rent / pitia;
    const cashFlow = rent - pitia;
    return {
      dscr: Math.round(ratio * 100) / 100,
      cashFlow: Math.round(cashFlow),
      verdict: ratio >= 1.25 ? 'strong' : ratio >= 1.0 ? 'positive' : ratio >= 0.75 ? 'negative' : 'review',
      verdictLabel: ratio >= 1.25 ? 'Strong Cash Flow' : ratio >= 1.0 ? 'Cash Flow Positive' : ratio >= 0.75 ? 'No-Ratio Eligible at 30% Down' : 'Specialist Review Recommended',
    };
  }, [simpleRent, simplePITIA]);

  // Detailed DSCR calculation
  const detailedResult = useMemo(() => {
    const price = parseDollar(purchasePrice);
    const rent = parseDollar(monthlyRent);
    if (price <= 0) return null;

    return calculateDSCR({
      monthlyRent: rent,
      propertyValue: price,
      downPaymentPercent: downPaymentPct,
      annualRate: ASSUMED_RATE_FOR_PITIA,
      termYears: loanTerm,
      monthlyTax: propertyTax ? parseDollar(propertyTax) : undefined,
      monthlyInsurance: parseDollar(insurance) || 150,
      monthlyHOA: parseDollar(hoa),
    });
  }, [purchasePrice, downPaymentPct, loanTerm, propertyTax, insurance, hoa, monthlyRent]);

  const loanAmount = useMemo(() => {
    const price = parseDollar(purchasePrice);
    return price * (1 - downPaymentPct / 100);
  }, [purchasePrice, downPaymentPct]);

  // Current result based on mode
  const currentDSCR = mode === 'simple' ? simpleDSCR?.dscr : detailedResult?.dscr;
  const currentVerdict = mode === 'simple' ? simpleDSCR?.verdict : detailedResult?.verdict;
  const currentVerdictLabel = mode === 'simple' ? simpleDSCR?.verdictLabel : detailedResult?.verdictLabel;
  const currentCashFlow = mode === 'simple' ? simpleDSCR?.cashFlow : detailedResult?.monthlyCashFlow;

  return (
    <div className="grid lg:grid-cols-[1fr,380px] gap-6 lg:gap-8 max-w-[960px] mx-auto">
      {/* Left: Inputs */}
      <div>
        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-full p-1 w-fit mb-8">
          <button
            type="button"
            onClick={() => setMode('simple')}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              mode === 'simple' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setMode('detailed')}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              mode === 'detailed' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
            }`}
          >
            Detailed
          </button>
        </div>

        {mode === 'simple' ? (
          <div className="space-y-5">
            <InputField
              label="Monthly Rental Income"
              value={simpleRent}
              onChange={setSimpleRent}
              prefix="$"
              placeholder="2,200"
            />
            <InputField
              label="Monthly Mortgage Payment (PITIA)"
              value={simplePITIA}
              onChange={setSimplePITIA}
              prefix="$"
              placeholder="1,800"
            />
          </div>
        ) : (
          <div className="space-y-5">
            <InputField
              label="Monthly Rental Income"
              value={monthlyRent}
              onChange={setMonthlyRent}
              prefix="$"
              placeholder="2,200"
            />
            <InputField
              label="Purchase Price"
              value={purchasePrice}
              onChange={setPurchasePrice}
              prefix="$"
              placeholder="350,000"
            />

            {/* Down Payment Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  Down Payment
                </label>
                <span className="text-sm font-bold text-navy">{downPaymentPct}%</span>
              </div>
              <input
                type="range"
                min={15}
                max={50}
                step={1}
                value={downPaymentPct}
                onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue"
                style={{
                  background: `linear-gradient(to right, #3B82F6 ${((downPaymentPct - 15) / 35) * 100}%, #E2E0DA ${((downPaymentPct - 15) / 35) * 100}%)`,
                }}
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  {formatCurrency(parseDollar(purchasePrice) * (downPaymentPct / 100))}
                </span>
                {downPaymentPct >= 30 && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-green bg-green/10 border border-green/20 px-2 py-0.5 rounded-full">
                    No-Ratio Eligible
                  </span>
                )}
              </div>
            </div>

            {/* Loan Amount (read-only) */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1.5" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                Loan Amount
              </label>
              <div className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-500">
                {formatCurrency(loanAmount)}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1.5" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                Loan Term
              </label>
              <select
                value={loanTerm}
                onChange={(e) => setLoanTerm(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-navy focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30"
              >
                <option value={15}>15 Years</option>
                <option value={20}>20 Years</option>
                <option value={25}>25 Years</option>
                <option value={30}>30 Years</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <InputField
                label="Monthly Tax"
                value={propertyTax}
                onChange={setPropertyTax}
                prefix="$"
                placeholder="Auto"
              />
              <InputField
                label="Insurance"
                value={insurance}
                onChange={setInsurance}
                prefix="$"
                placeholder="150"
              />
              <InputField
                label="HOA"
                value={hoa}
                onChange={setHoa}
                prefix="$"
                placeholder="0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Right: Results */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {/* DSCR Ratio */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-1" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
            Your DSCR Ratio
          </p>
          <p
            className={`text-[56px] lg:text-[72px] font-extrabold leading-none ${currentVerdict ? VERDICT_COLORS[currentVerdict] : 'text-gray-300'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {currentDSCR != null ? formatDSCR(currentDSCR) : '--'}
          </p>

          {/* Verdict */}
          {currentVerdictLabel && (
            <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border text-sm font-medium ${currentVerdict ? VERDICT_BG[currentVerdict] : ''} ${currentVerdict ? VERDICT_COLORS[currentVerdict] : 'text-gray-400'}`}>
              {currentVerdictLabel}
            </div>
          )}

          {/* No-Ratio badge */}
          {mode === 'detailed' && downPaymentPct >= 30 && currentDSCR != null && currentDSCR < 1.0 && (
            <div className="mt-4 border-l-[3px] border-green bg-green/5 rounded-r-lg p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-green" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                No-Ratio DSCR Eligible
              </p>
              <p className="text-xs text-gray-500 mt-1">
                At 30%+ down, cash flow ratio is not a factor. Your property qualifies regardless of DSCR.
              </p>
            </div>
          )}

          {/* Cash Flow */}
          {currentCashFlow != null && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-1" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                Est. Monthly Cash Flow
              </p>
              <p className={`text-2xl font-bold ${
                currentCashFlow > 0 ? 'text-green' : currentCashFlow < 0 ? 'text-amber' : 'text-gray-400'
              }`}>
                {currentCashFlow > 0 ? '+' : ''}{formatCurrency(currentCashFlow)}
              </p>
            </div>
          )}

          {/* PITIA Breakdown (detailed only) */}
          {mode === 'detailed' && detailedResult && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-3" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                PITIA Breakdown
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Principal & Interest</span>
                  <span className="font-medium text-navy">{formatCurrency(detailedResult.pitia.monthlyPI)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Property Tax</span>
                  <span className="font-medium text-navy">{formatCurrency(detailedResult.pitia.monthlyTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Insurance</span>
                  <span className="font-medium text-navy">{formatCurrency(detailedResult.pitia.monthlyInsurance)}</span>
                </div>
                {detailedResult.pitia.monthlyHOA > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">HOA</span>
                    <span className="font-medium text-navy">{formatCurrency(detailedResult.pitia.monthlyHOA)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold">
                  <span className="text-gray-600">Total PITIA</span>
                  <span className="text-navy">{formatCurrency(detailedResult.pitia.totalPITIA)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Program recommendation */}
          {mode === 'detailed' && detailedResult && detailedResult.programEligibility && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-1" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                Recommended Program
              </p>
              <p className="text-sm font-semibold text-navy">{detailedResult.programEligibility}</p>
            </div>
          )}

          {/* CTA */}
          <a
            href="/qualify/"
            className="mt-6 block w-full bg-blue hover:bg-blue-dark text-white text-center py-3 rounded-lg text-sm font-semibold uppercase tracking-wider transition-colors"
            style={{ fontFamily: 'var(--font-mono, monospace)' }}
          >
            Match Me With a Specialist
          </a>
          <p className="text-xs text-gray-400 text-center mt-2">
            Takes under 2 minutes. No SSN. No credit pull.
          </p>
        </div>
      </div>
    </div>
  );
}

// Reusable input field
function InputField({
  label, value, onChange, prefix, suffix, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1.5" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white border border-gray-200 rounded-lg py-3 text-sm text-navy focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue/30 transition-colors
            ${prefix ? 'pl-7 pr-4' : suffix ? 'pl-4 pr-7' : 'px-4'}
          `}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  );
}
