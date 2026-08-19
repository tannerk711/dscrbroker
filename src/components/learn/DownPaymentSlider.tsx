import { useMemo, useState } from 'react';
import { calculateDSCR, formatCurrency, formatDSCR } from '../../lib/dscr-calculator';

/**
 * In-article widget: drag the down payment and watch DSCR, cash flow, and
 * program eligibility shift on a fixed example deal. Reuses the shared
 * calculator lib, no new math, and shows zero rate numbers.
 */

interface Props {
  price?: number;
  rent?: number;
}

// Internal calculation assumption, never displayed (same convention as the
// live /analyze/ tool).
const ASSUMED_RATE_FOR_PITIA = 7.0;

export default function DownPaymentSlider({ price = 350000, rent = 2400 }: Props) {
  const [downPct, setDownPct] = useState(20);

  const result = useMemo(
    () =>
      calculateDSCR({
        monthlyRent: rent,
        propertyValue: price,
        downPaymentPercent: downPct,
        annualRate: ASSUMED_RATE_FOR_PITIA,
      }),
    [price, rent, downPct]
  );

  const tierColor =
    result.dscr >= 1.25
      ? 'text-green'
      : result.dscr >= 1.0
        ? 'text-blue'
        : result.dscr >= 0.75
          ? 'text-amber'
          : 'text-red';

  return (
    <div className="my-10 rounded-xl border border-gray-200 bg-white p-5 shadow-md sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-dark">
        Drag the down payment
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
        Example deal: {formatCurrency(price)} purchase, {formatCurrency(rent)}/mo rent. Watch what
        more money down does to the ratio.
      </p>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Down payment
          </label>
          <span className="text-base font-bold text-navy" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {downPct}% · {formatCurrency(price * (downPct / 100))}
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
          aria-label="Down payment percentage"
        />
        <div className="mt-1 flex justify-between text-[11px] font-medium text-gray-400">
          <span>20%</span>
          <span>30%</span>
          <span>40%</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-off-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">DSCR</p>
          <p
            className={`mt-1 text-2xl font-extrabold tracking-tight ${tierColor}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatDSCR(result.dscr)}
          </p>
        </div>
        <div className="rounded-lg bg-off-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Est. PITIA</p>
          <p
            className="mt-1 text-2xl font-extrabold tracking-tight text-navy"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatCurrency(result.pitia.totalPITIA)}
          </p>
        </div>
        <div className="rounded-lg bg-off-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Cash flow</p>
          <p
            className={`mt-1 text-2xl font-extrabold tracking-tight ${result.monthlyCashFlow >= 0 ? 'text-green' : 'text-amber'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {result.monthlyCashFlow >= 0 ? '+' : ''}
            {formatCurrency(result.monthlyCashFlow)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-blue/20 bg-blue/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-dark">
          Standard DSCR at 20%+
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
            downPct >= 30
              ? 'border-green/20 bg-green/10 text-green'
              : 'border-gray-200 bg-gray-100 text-gray-400'
          }`}
        >
          No-Ratio DSCR at 30%+
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-400">
        For educational purposes only. Estimates use a market-typical financing assumption for the
        payment math. Your matched specialist presents the actual numbers for your deal.
      </p>
    </div>
  );
}
