import { useMemo, useState } from 'react';
import { calculateDSCR, formatCurrency, formatDSCR } from '../../lib/dscr-calculator';

/**
 * Embedded in-article DSCR calculator. Reuses src/lib/dscr-calculator.ts,
 * no new math. Two modes:
 *  - "simple": rent + PITIA, the raw formula readers just learned
 *  - "deal":   price + down % + rent, full PITIA build via the shared lib
 * No CTA inside the widget (article CTA doctrine caps CTAs at three moments).
 */

type Mode = 'simple' | 'deal';

interface Props {
  mode?: Mode;
  defaultRent?: string;
  defaultPitia?: string;
  defaultPrice?: string;
}

const TIER = (dscr: number) =>
  dscr >= 1.25
    ? { color: 'text-green', label: 'Strong cash flow' }
    : dscr >= 1.0
      ? { color: 'text-blue', label: 'Cash flow positive' }
      : dscr >= 0.75
        ? { color: 'text-amber', label: 'No-Ratio eligible at 30% down' }
        : { color: 'text-red', label: 'Specialist review recommended' };

// Internal calculation assumption, never displayed (same convention as the
// live /analyze/ tool). PITIA math requires an interest assumption; results
// are educational estimates only.
const ASSUMED_RATE_FOR_PITIA = 7.0;

const parseDollar = (v: string) => parseFloat(v.replace(/[^0-9.]/g, '')) || 0;

export default function MiniCalculator({
  mode = 'simple',
  defaultRent = '',
  defaultPitia = '',
  defaultPrice = '350000',
}: Props) {
  const [rent, setRent] = useState(defaultRent);
  const [pitia, setPitia] = useState(defaultPitia);
  const [price, setPrice] = useState(defaultPrice);
  const [downPct, setDownPct] = useState(25);

  const simple = useMemo(() => {
    const r = parseDollar(rent);
    const p = parseDollar(pitia);
    if (r <= 0 || p <= 0) return null;
    const ratio = Math.round((r / p) * 100) / 100;
    return { dscr: ratio, cashFlow: Math.round(r - p) };
  }, [rent, pitia]);

  const deal = useMemo(() => {
    const r = parseDollar(rent);
    const pv = parseDollar(price);
    if (r <= 0 || pv <= 0) return null;
    return calculateDSCR({
      monthlyRent: r,
      propertyValue: pv,
      downPaymentPercent: downPct,
      annualRate: ASSUMED_RATE_FOR_PITIA,
    });
  }, [rent, price, downPct]);

  const dscr = mode === 'simple' ? simple?.dscr : deal?.dscr;
  const cashFlow = mode === 'simple' ? simple?.cashFlow : deal?.monthlyCashFlow;
  const tier = dscr != null && dscr > 0 ? TIER(dscr) : null;

  return (
    <div className="my-10 rounded-xl border border-gray-200 bg-white p-5 shadow-md sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-dark">
        Try the math yourself
      </p>

      <div className="mt-4 grid gap-6 sm:grid-cols-[1fr,200px]">
        {/* Inputs */}
        <div className="space-y-4">
          <Field
            label="Monthly rent"
            value={rent}
            onChange={setRent}
            placeholder={mode === 'simple' ? '2,300' : '2,400'}
          />
          {mode === 'simple' ? (
            <Field label="Monthly PITIA payment" value={pitia} onChange={setPitia} placeholder="1,950" />
          ) : (
            <>
              <Field label="Purchase price" value={price} onChange={setPrice} placeholder="350,000" />
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Down payment
                  </label>
                  <span className="text-sm font-bold text-navy" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {downPct}% ({formatCurrency(parseDollar(price) * (downPct / 100))})
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={40}
                  step={1}
                  value={downPct}
                  onChange={(e) => setDownPct(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full accent-blue"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 ${((downPct - 20) / 20) * 100}%, #E2E0DA ${((downPct - 20) / 20) * 100}%)`,
                  }}
                />
                {downPct >= 30 && (
                  <span className="mt-1.5 inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green">
                    No-Ratio eligible
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Readout */}
        <div className="flex flex-col justify-center rounded-lg bg-off-white p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">DSCR</p>
          <p
            className={`mt-1 text-4xl font-extrabold tracking-tight ${tier ? tier.color : 'text-gray-300'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {dscr != null && dscr > 0 ? formatDSCR(dscr) : '--'}
          </p>
          {tier && <p className={`mt-1 text-xs font-semibold ${tier.color}`}>{tier.label}</p>}
          {cashFlow != null && dscr != null && dscr > 0 && (
            <p className="mt-3 text-sm text-gray-500">
              <span className={`font-bold ${cashFlow >= 0 ? 'text-green' : 'text-amber'}`}>
                {cashFlow >= 0 ? '+' : ''}
                {formatCurrency(cashFlow)}
              </span>
              /mo cash flow
            </p>
          )}
          {mode === 'deal' && deal && deal.dscr > 0 && (
            <p className="mt-2 text-xs text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
              Est. PITIA {formatCurrency(deal.pitia.totalPITIA)}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-400">
        For educational purposes only. Estimates use a market-typical financing assumption for the
        payment math. Your matched specialist presents the actual numbers for your deal.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-7 pr-4 text-sm text-navy transition-colors focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue/30"
        />
      </div>
    </div>
  );
}
