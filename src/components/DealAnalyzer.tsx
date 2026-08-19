import { useState, useEffect, useRef } from 'react';
import {
  parseNaturalLanguage,
  isPropertyURL,
  hasEnoughData,
  type ParsedProperty,
} from '../lib/nl-parser';
import {
  calculateDSCR,
  formatCurrency,
  formatDSCR,
  type DSCRResult,
} from '../lib/dscr-calculator';
import {
  $loanGoal,
  $propertyType,
  $propertyValue,
  $downPayment,
  $currentStep,
  $direction,
} from '../stores/formStore';

// --- Types ---

type AnalyzerMode = 'idle' | 'loading' | 'results' | 'quick-analyze';

interface QuickAnalyzeData {
  propertyValue: string;
  monthlyRent: string;
  downPayment: string;
  state: string;
}

interface AnalysisResult {
  // Property snapshot
  address: string | null;
  propertyValue: number;
  monthlyRent: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  propertyType: string | null;
  state: string | null;
  city: string | null;
  downPaymentPercent: number;
  // Calculated
  dscrResult: DSCRResult;
}

// --- Constants ---

const PLACEHOLDERS = [
  'Paste a Zillow or Redfin URL to analyze a deal...',
  'Try: 3BR rental in Tampa, $320K, rents for $2,400/mo',
  'Ask: Can I cash flow on a $500K duplex in Austin?',
  'Enter an address: 742 Maple St, Phoenix, AZ 85004',
];

const VALUE_BRACKETS: { label: string; min: number; max: number; formValue: string }[] = [
  { label: 'Under $200K', min: 0, max: 200_000, formValue: 'under_200k' },
  { label: '$200K - $500K', min: 200_000, max: 500_000, formValue: '200k_500k' },
  { label: '$500K - $1M', min: 500_000, max: 1_000_000, formValue: '500k_1m' },
  { label: '$1M - $2M', min: 1_000_000, max: 2_000_000, formValue: '1m_2m' },
  { label: '$2M+', min: 2_000_000, max: Infinity, formValue: 'over_2m' },
];

const DOWN_PAYMENT_OPTIONS = [
  { label: '20%', value: '20' },
  { label: '25%', value: '25' },
  { label: '30%', value: '30' },
  { label: '35%+', value: '35' },
];

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  DC:'District of Columbia',
};

const VERDICT_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  strong:   { text: 'text-green',  bg: 'bg-green/10',  border: 'border-green/20' },
  positive: { text: 'text-green',  bg: 'bg-green/10',  border: 'border-green/20' },
  negative: { text: 'text-amber',  bg: 'bg-amber/10',  border: 'border-amber/20' },
  review:   { text: 'text-amber',  bg: 'bg-amber/10',  border: 'border-amber/20' },
};

// --- Internal calculation assumption (NEVER displayed) ---
// We use 7.0% as a placeholder annual rate purely to compute PITIA and cash flow.
// Cash flow numbers shown to the user are estimates. Actual structuring is the specialist's job.
const ASSUMED_RATE_FOR_PITIA = 7.0;

// --- Component ---

export default function DealAnalyzer() {
  const [mode, setMode] = useState<AnalyzerMode>('idle');
  const [inputValue, setInputValue] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderFade, setPlaceholderFade] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quickData, setQuickData] = useState<QuickAnalyzeData>({
    propertyValue: '',
    monthlyRent: '',
    downPayment: '25',
    state: '',
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Cycle placeholders every 4 seconds
  useEffect(() => {
    if (inputValue || mode !== 'idle') return;
    const interval = setInterval(() => {
      setPlaceholderFade(false);
      setTimeout(() => {
        setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
        setPlaceholderFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [inputValue, mode]);

  // --- Input Handling ---

  function handleSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setError(null);

    if (isPropertyURL(trimmed)) {
      handleURLMode(trimmed);
    } else {
      handleNLMode(trimmed);
    }
  }

  async function handleURLMode(url: string) {
    setMode('loading');
    try {
      const res = await fetch('/api/analyze-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Fall back to quick analyze
        setMode('quick-analyze');
        setError(data.message || 'Could not fetch property data. Enter details manually.');
        return;
      }

      const prop = data.data;
      const downPct = 25; // default assumption
      const rent = prop.estimatedRent || 0;
      const price = prop.price || 0;

      if (!price) {
        setMode('quick-analyze');
        setError('Could not determine property value. Enter details manually.');
        return;
      }

      const dscrResult = calculateDSCR({
        monthlyRent: rent,
        propertyValue: price,
        downPaymentPercent: downPct,
        annualRate: ASSUMED_RATE_FOR_PITIA,
      });

      setResult({
        address: prop.address,
        propertyValue: price,
        monthlyRent: rent,
        beds: prop.beds,
        baths: prop.baths,
        sqft: prop.sqft,
        propertyType: prop.propertyType,
        state: prop.state,
        city: prop.city,
        downPaymentPercent: downPct,
        dscrResult,
      });
      setMode('results');
    } catch {
      setMode('quick-analyze');
      setError('Network error. Enter details manually.');
    }
  }

  function handleNLMode(text: string) {
    const parsed = parseNaturalLanguage(text);

    if (hasEnoughData(parsed)) {
      buildResultFromParsed(parsed);
    } else {
      // Pre-fill quick analyze with whatever we got
      setQuickData({
        propertyValue: parsed.propertyValue ? String(parsed.propertyValue) : '',
        monthlyRent: parsed.monthlyRent ? String(parsed.monthlyRent) : '',
        downPayment: parsed.downPaymentPercent ? String(parsed.downPaymentPercent) : '25',
        state: parsed.state || '',
      });
      setMode('quick-analyze');
    }
  }

  function buildResultFromParsed(parsed: ParsedProperty) {
    const propertyValue = parsed.propertyValue!;
    const monthlyRent = parsed.monthlyRent!;
    const downPct = parsed.downPaymentPercent || 25;

    const dscrResult = calculateDSCR({
      monthlyRent,
      propertyValue,
      downPaymentPercent: downPct,
      annualRate: ASSUMED_RATE_FOR_PITIA,
    });

    setResult({
      address: parsed.city && parsed.state
        ? `${parsed.city}, ${parsed.state}`
        : null,
      propertyValue,
      monthlyRent,
      beds: parsed.bedrooms,
      baths: null,
      sqft: null,
      propertyType: parsed.propertyType,
      state: parsed.state,
      city: parsed.city,
      downPaymentPercent: downPct,
      dscrResult,
    });
    setMode('results');
  }

  function handleQuickAnalyze() {
    const value = parseFloat(quickData.propertyValue.replace(/[^0-9.]/g, ''));
    const rent = parseFloat(quickData.monthlyRent.replace(/[^0-9.]/g, ''));
    const downPct = parseInt(quickData.downPayment, 10) || 25;

    if (!value || value < 10000) {
      setError('Enter a valid property value.');
      return;
    }
    if (!rent || rent < 100) {
      setError('Enter a valid monthly rent.');
      return;
    }

    setError(null);

    const dscrResult = calculateDSCR({
      monthlyRent: rent,
      propertyValue: value,
      downPaymentPercent: downPct,
      annualRate: ASSUMED_RATE_FOR_PITIA,
    });

    setResult({
      address: quickData.state ? STATE_NAMES[quickData.state] || quickData.state : null,
      propertyValue: value,
      monthlyRent: rent,
      beds: null,
      baths: null,
      sqft: null,
      propertyType: null,
      state: quickData.state || null,
      city: null,
      downPaymentPercent: downPct,
      dscrResult,
    });
    setMode('results');
  }

  // --- Form Pre-Fill + Scroll ---

  function handleGetStructured() {
    if (!result) return;

    // The analyzer only models purchase-style deals, so lock the path to purchase.
    // PATHS in DSCRForm is keyed on loanGoal; leaving it unset broke path resolution.
    $loanGoal.set('purchase');

    // $propertyValue holds a RAW NUMERIC STRING for the slider (see formStore).
    // Writing a bracket token like '200k_500k' made StepPropertyValue's Number()
    // parse to NaN and render "$NaN". Write the real number instead.
    if (result.propertyValue) $propertyValue.set(String(result.propertyValue));

    // Map analyzer property types to the form's canonical card values. The form
    // has no 'condo' / 'str' / 'mixed_use' cards, so an unmapped value silently drops.
    const PROPERTY_TYPE_MAP: Record<string, string> = {
      single_family: 'single_family',
      condo: 'warrantable_condo',
      warrantable_condo: 'warrantable_condo',
      non_warrantable_condo: 'non_warrantable_condo',
      multi_family: 'multi_family_small',
      str: 'single_family',
      mixed_use: 'single_family',
    };
    if (result.propertyType) {
      const mapped = PROPERTY_TYPE_MAP[result.propertyType];
      if (mapped) $propertyType.set(mapped);
    }
    // Do NOT pre-fill $state. A pre-selected state renders the location step with
    // a green confirmation but no way to advance (auto-advance only fires on a real
    // onChange, and re-picking the same option fires nothing), stalling the lead.
    // Same reason URL-param state prefill was removed on 2026-07-24 (formStore.ts).
    // The lead actively selects their own state.

    const downStr = String(result.downPaymentPercent);
    if (['20', '25', '30'].includes(downStr)) {
      $downPayment.set(downStr);
    } else if (result.downPaymentPercent >= 35) {
      $downPayment.set('35_plus');
    }

    // Start at loan goal so the user confirms the path; prefilled answers persist,
    // so they simply tap through the steps we already have data for.
    $direction.set('forward');
    $currentStep.set(1);

    // Smooth scroll to form if on homepage, otherwise navigate to /qualify/
    const formEl = document.getElementById('lead-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.href = '/qualify/';
    }
  }

  function handleAdjustNumbers() {
    if (result) {
      setQuickData({
        propertyValue: String(result.propertyValue),
        monthlyRent: String(result.monthlyRent),
        downPayment: String(result.downPaymentPercent),
        state: result.state || '',
      });
    }
    setMode('quick-analyze');
    setResult(null);
  }

  function handleReset() {
    setMode('idle');
    setInputValue('');
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  }

  // --- Sparkle Icon ---
  const SparkleIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
    </svg>
  );

  // --- Render ---

  return (
    <div className="mb-10">
      {/* Command Bar */}
      <div
        className={`relative bg-white/[0.04] border rounded-lg transition-colors duration-200 ${
          mode === 'loading'
            ? 'border-blue/40'
            : inputValue
              ? 'border-blue/30'
              : 'border-white/[0.08]'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(59,130,246,0.04) 0%, rgba(255,255,255,0.04) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        {/* Input row */}
        <div className="relative flex flex-wrap items-center gap-3 px-5 py-4">
          <SparkleIcon
            className={`flex-shrink-0 transition-colors duration-200 ${
              inputValue || mode === 'loading' ? 'text-blue' : 'text-amber'
            }`}
          />

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (mode === 'results' || mode === 'quick-analyze') {
                setMode('idle');
                setResult(null);
                setError(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            className="flex-1 min-w-0 bg-transparent text-white text-base outline-none font-sans"
            aria-label="Analyze a property deal"
          />

          {/* Placeholder overlay (custom cycling) */}
          {!inputValue && mode === 'idle' && (
            <span
              className={`absolute left-[52px] right-5 truncate whitespace-nowrap text-slate-500 text-base pointer-events-none transition-opacity duration-300 font-sans ${
                placeholderFade ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {PLACEHOLDERS[placeholderIndex]}
            </span>
          )}

          {/* Submit button */}
          {inputValue && mode !== 'loading' && (
            <button
              onClick={handleSubmit}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-blue hover:bg-blue-dark rounded-md text-white transition-colors duration-150"
              style={{ animation: 'fadeIn 200ms ease-out' }}
              aria-label="Analyze deal"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}

          {/* Loading spinner */}
          {mode === 'loading' && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="text-sm text-slate-400">Analyzing...</span>
              <div className="w-5 h-5 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
            </div>
          )}

          {/* Reset button (when showing results) */}
          {(mode === 'results' || mode === 'quick-analyze') && (
            <button
              onClick={handleReset}
              className="flex-shrink-0 w-full text-left sm:w-auto text-slate-500 hover:text-white transition-colors duration-150 text-sm"
              aria-label="New analysis"
            >
              New search
            </button>
          )}
        </div>

        {/* Loading progress bar */}
        {mode === 'loading' && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue/10 rounded-b-lg overflow-hidden">
            <div className="h-full bg-blue/60 rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && mode === 'quick-analyze' && (
        <p className="text-amber text-sm mt-2 ml-1">{error}</p>
      )}

      {/* Quick Analyze Form */}
      {mode === 'quick-analyze' && (
        <div
          className="mt-3 bg-white/[0.04] border border-white/[0.08] rounded-lg p-5"
          style={{ animation: 'fadeUp 300ms ease-out' }}
        >
          <p className="text-sm text-slate-400 mb-4">
            Enter property details to get an instant DSCR analysis.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Property Value */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1.5 font-sans">
                Property Value
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={quickData.propertyValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setQuickData((d) => ({ ...d, propertyValue: raw }));
                }}
                placeholder="$400,000"
                className="w-full bg-white/[0.05] border border-white/[0.10] rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue/40 transition-colors font-sans"
              />
            </div>

            {/* Monthly Rent */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1.5 font-sans">
                Monthly Rent
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={quickData.monthlyRent}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setQuickData((d) => ({ ...d, monthlyRent: raw }));
                }}
                placeholder="$2,400"
                className="w-full bg-white/[0.05] border border-white/[0.10] rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue/40 transition-colors font-sans"
              />
            </div>

            {/* Down Payment */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1.5 font-sans">
                Down Payment
              </label>
              <select
                value={quickData.downPayment}
                onChange={(e) => setQuickData((d) => ({ ...d, downPayment: e.target.value }))}
                className="w-full bg-white/[0.05] border border-white/[0.10] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue/40 transition-colors font-sans appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748B' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
              >
                {DOWN_PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-navy text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1.5 font-sans">
                State
              </label>
              <select
                value={quickData.state}
                onChange={(e) => setQuickData((d) => ({ ...d, state: e.target.value }))}
                className="w-full bg-white/[0.05] border border-white/[0.10] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue/40 transition-colors font-sans appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748B' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
              >
                <option value="" className="bg-navy text-white">Select state</option>
                {STATES.map((s) => (
                  <option key={s} value={s} className="bg-navy text-white">
                    {STATE_NAMES[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleQuickAnalyze}
            className="mt-4 w-full sm:w-auto px-6 py-2.5 bg-amber hover:bg-amber-dark text-white text-sm font-semibold rounded-lg transition-colors duration-150"
          >
            Analyze This Deal
          </button>
        </div>
      )}

      {/* Results Card */}
      {mode === 'results' && result && (
        <ResultsCard
          result={result}
          onGetStructured={handleGetStructured}
          onAdjust={handleAdjustNumbers}
          ref={resultsRef}
        />
      )}

      {/* Disclaimer */}
      {(mode === 'results' || mode === 'quick-analyze') && (
        <p className="text-xs text-slate-500 mt-3 max-w-3xl">
          This analyzer provides DSCR and cash flow estimates for educational purposes only. It is not a loan offer,
          pre-approval, or commitment to lend. Actual DSCR calculations by lenders may differ based
          on their specific underwriting guidelines, appraisal results, and verification of rental
          income. A licensed DSCR loan specialist will review your full scenario.
        </p>
      )}
    </div>
  );
}

// --- Results Card Sub-Component ---

import { forwardRef } from 'react';

const ResultsCard = forwardRef<HTMLDivElement, {
  result: AnalysisResult;
  onGetStructured: () => void;
  onAdjust: () => void;
}>(function ResultsCard({ result, onGetStructured, onAdjust }, ref) {
  const { dscrResult } = result;
  const colors = VERDICT_COLORS[dscrResult.verdict] || VERDICT_COLORS.review;

  const cashFlowSign = dscrResult.monthlyCashFlow >= 0 ? '+' : '';
  const cashFlowColor = dscrResult.monthlyCashFlow >= 0 ? 'text-green' : 'text-amber';

  // Build PITIA breakdown string
  const pitia = dscrResult.pitia;
  const pitiaBreakdown = `${formatCurrency(pitia.monthlyPI)} P&I + ${formatCurrency(pitia.monthlyTax)} Tax + ${formatCurrency(pitia.monthlyInsurance)} Ins`;

  // Program-fit note based on DSCR + down payment
  let programFitNote = '';
  if (dscrResult.dscr >= 1.0) {
    programFitNote = 'Qualifies for Standard DSCR programs across the lender network.';
  } else if (dscrResult.dscr >= 0.75 && result.downPaymentPercent >= 30) {
    programFitNote = 'Qualifies for No-Ratio DSCR at 30%+ down.';
  } else if (dscrResult.dscr >= 0.75) {
    programFitNote = 'No-Ratio DSCR opens up at 30%+ down. Below that, structuring is required.';
  } else {
    programFitNote = 'A DSCR specialist will review options for this scenario.';
  }

  return (
    <div
      ref={ref}
      className="mt-3 bg-white/[0.06] border border-white/[0.08] rounded-xl p-6"
      style={{ animation: 'fadeUp 300ms ease-out' }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Property Snapshot */}
        <div>
          {result.address && (
            <h3 className="text-base font-semibold text-white mb-2">{result.address}</h3>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>{formatCurrency(result.propertyValue)}</span>
            {result.beds && <span>{result.beds} bed</span>}
            {result.baths && <span>{result.baths} bath</span>}
            {result.sqft && <span>{result.sqft.toLocaleString()} sqft</span>}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1 font-sans">
              Monthly Rent {result.monthlyRent > 0 ? '' : '(enter to calculate)'}
            </p>
            <p className="text-lg font-semibold text-white">
              {result.monthlyRent > 0 ? formatCurrency(result.monthlyRent) + '/mo' : '--'}
            </p>
          </div>

          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1 font-sans">
              Assumptions
            </p>
            <p className="text-xs text-slate-400">
              {result.downPaymentPercent}% down, 30-yr fixed, market PITIA estimate.
            </p>
          </div>
        </div>

        {/* Right: DSCR Verdict */}
        <div>
          {/* DSCR badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.border} border ${colors.text}`}>
            {dscrResult.verdict === 'strong' || dscrResult.verdict === 'positive' ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
              </svg>
            )}
            {dscrResult.verdictLabel}
          </div>

          {/* DSCR number */}
          <p className={`text-4xl font-bold mt-3 ${colors.text}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatDSCR(dscrResult.dscr)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">DSCR Ratio</p>

          {/* Cash flow */}
          <div className="mt-4 flex items-baseline gap-2">
            <p className={`text-sm font-medium ${cashFlowColor}`}>
              {cashFlowSign}{formatCurrency(dscrResult.monthlyCashFlow)}/mo
            </p>
            <p className="text-xs text-slate-500">est. cash flow</p>
          </div>

          {/* PITIA breakdown */}
          <p className="text-xs text-slate-500 mt-2">
            {pitiaBreakdown} = {formatCurrency(pitia.totalPITIA)}/mo PITIA
          </p>

          {/* Program-fit note */}
          <p className="text-xs text-slate-400 mt-3">{programFitNote}</p>
        </div>
      </div>

      {/* Specialist focus bullets: what your specialist will work on */}
      {dscrResult.specialistFocus.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber mb-3 font-sans">
            What Your Specialist Will Structure
          </p>
          <ul className="space-y-1.5">
            {dscrResult.specialistFocus.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA Row */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button
          onClick={onGetStructured}
          className="px-6 py-2.5 bg-amber hover:bg-amber-dark text-white text-sm font-semibold rounded-lg transition-colors duration-150"
        >
          Get This Deal Structured
        </button>
        <button
          onClick={onAdjust}
          className="text-sm text-blue hover:text-blue-light transition-colors duration-150"
        >
          Adjust Numbers
        </button>
      </div>
    </div>
  );
});
