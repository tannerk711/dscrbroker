import { useEffect, useMemo, useRef, useState } from 'react';
import { COPY, QA_KEY, SESSION_KEY, haveReadyLines, type ThankYouRecord } from '../../data/matchForm';
import { getSpecialist } from '../../data/specialists';

const CONVERSION = 'AW-18416211451/zIc1COzC6ekcEPurxM1E';

const PROOF_LINE: Record<string, string> = {
  broker_f: '250+ closed DSCR and non-QM loans.',
};
const JOHN_PROOF = 'Runs a team of loan officers with access to 70+ DSCR and non-QM lenders.';

export default function MatchThankYou() {
  const [record, setRecord] = useState<ThankYouRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) setRecord(JSON.parse(raw));
    } catch {
      /* no-op */
    }
    setLoaded(true);
  }, []);

  // Google Ads "New Lead": once, real submissions only, never on a specialist-null
  // response, never on a direct load, suppressed in QA mode and on localhost.
  useEffect(() => {
    if (!record || !record.specialist || fired.current) return;
    try {
      const host = window.location.hostname;
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      const isQa = sessionStorage.getItem(QA_KEY) === '1' || new URLSearchParams(window.location.search).get('demo') === '1';
      if (isLocal || isQa) return;
      if (sessionStorage.getItem('match_conv_fired') === '1') return;
      const gtag = (window as any).gtag;
      if (typeof gtag !== 'function') return;
      fired.current = true;
      sessionStorage.setItem('match_conv_fired', '1');
      gtag('event', 'conversion', { send_to: CONVERSION });
    } catch {
      /* no-op */
    }
  }, [record]);

  const specialist = useMemo(() => (record?.specialist ? getSpecialist(record.specialist) : null), [record]);

  if (!loaded) return <div className="min-h-[40vh]" />;

  if (!record) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center lg:px-10">
        <h1 className="m-h2">Nothing here yet.</h1>
        <a href="/match/" className="m-link mt-5 inline-block text-[15px] font-medium">
          Start your deal
        </a>
      </div>
    );
  }

  const first = record.firstName?.trim();
  const ready = haveReadyLines(record);
  const story =
    specialist && specialist.stories.length
      ? record.flags.includes('foreignNational') || record.flags.includes('noUsCredit')
        ? specialist.stories[2]
        : record.rentalUse === 'shortTerm'
          ? specialist.stories[1]
          : specialist.stories[0]
      : null;

  return (
    <div className="mx-auto max-w-2xl px-5 pb-20 pt-12 lg:px-10 lg:pt-16">
      <p className="m-label">Deal sent</p>

      {!specialist ? (
        <>
          <h1 className="m-h2 mt-2">{first ? `Done, ${first}.` : 'Done.'}</h1>
          <div className="mt-6 flex flex-wrap gap-1.5">
            {record.chips.map((c) => (
              <span key={c} className="m-recap">
                {c}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="m-h2 mt-2">
            {first ? `Done, ${first}. ` : 'Done. '}Your deal is on its way to {specialist.firstName}.
          </h1>

          {record.state && (
            <span className="m-chip mt-6 inline-flex">
              <span className="m-dot" aria-hidden />
              {COPY.chip(record.state)}
            </span>
          )}

          {/* the specialist card: chip becomes human */}
          <div className="m-card m-rise mt-3 p-6 sm:p-7">
            <div className="flex items-start gap-5">
              <img
                src={specialist.headshot}
                alt={specialist.name}
                width={96}
                height={96}
                className="h-20 w-20 flex-shrink-0 rounded-full object-cover sm:h-24 sm:w-24"
              />
              <div className="min-w-0">
                <div className="m-display text-[24px] leading-tight">{specialist.name}</div>
                <div className="mt-1 text-[14px] text-ink-muted">Licensed DSCR specialist</div>
                <div className="mt-0.5 text-[14px] text-ink-muted">NMLS #{specialist.nmls}</div>
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={specialist.companyLogo}
                    alt={specialist.company}
                    className={
                      specialist.logoOnLightChip
                        ? 'h-8 w-auto rounded-md bg-white px-1.5 py-1 ring-1 ring-hair'
                        : 'h-7 w-auto'
                    }
                    loading="lazy"
                  />
                  <span className="text-[13px] text-ink-muted">
                    {specialist.company}
                    {specialist.name === 'John Peisner' ? ', NMLS #181106' : ''}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-5 border-t border-hair pt-4 text-[15px] leading-relaxed">
              {PROOF_LINE[record.specialist!] ?? JOHN_PROOF}
            </p>
            <a
              href="https://www.nmlsconsumeraccess.org/"
              target="_blank"
              rel="noopener"
              className="m-link mt-2 inline-block text-[13px]"
            >
              Verify on NMLS Consumer Access
            </a>
          </div>

          <p className="mt-5 text-[16px] leading-relaxed">
            Expect a call or text from {specialist.firstName} about your {record.state} deal.{' '}
            <strong className="font-semibold">Unknown number? Pick up.</strong>
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {record.chips.map((c) => (
              <span key={c} className="m-recap">
                {c}
              </span>
            ))}
          </div>

          {/* while you wait */}
          <h2 className="m-h2 mt-12 text-[1.5rem]">While you wait</h2>
          <ol className="mt-5 grid gap-4">
            <li className="m-card-flat p-5">
              <div className="m-display text-[17px]">1. Reply with the address.</div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">
                If the first contact is a text, sending the address back moves it faster.
              </p>
            </li>
            <li className="m-card-flat p-5">
              <div className="m-display text-[17px]">2. Have this ready.</div>
              <ul className="mt-2 grid gap-2">
                {ready.map((line) => (
                  <li key={line} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-muted">
                    <span className="mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-moss" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </li>
            <li className="m-card-flat p-5">
              <div className="m-display text-[17px]">3. What {specialist.firstName} does with it.</div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">
                Reviews the deal, picks the lender whose guidelines fit, and presents the terms and
                payment before you commit to anything. Credit is pulled only if you apply, with your OK.
                If you do, DSCR lenders typically ask for ID, bank statements for the down payment and
                reserves, and the LLC documents if you're closing in one, not tax returns.
              </p>
            </li>
          </ol>

          {story && (
            <div className="mt-10">
              <h2 className="m-h2 text-[1.5rem]">A deal {specialist.firstName} placed</h2>
              <blockquote className="m-card-flat mt-4 p-5 text-[15px] leading-relaxed">
                <p>"{story.quote}"</p>
                <footer className="mt-3 text-[13px] text-ink-muted">{story.author}</footer>
              </blockquote>
            </div>
          )}

          <p className="mt-10 text-[16px] font-medium">Missed the call? Call or text it back.</p>

          <p className="mt-10 text-[12px] leading-relaxed text-ink-muted">
            This is not a loan offer or commitment to lend. Any pre-qualification and approval are the
            specialist's, subject to underwriting, appraisal, and lender guidelines. DSCRBroker.com is a
            matching service, not a lender or mortgage broker. {specialist.name} is a licensed loan
            originator with {specialist.company} (NMLS #{specialist.nmls}).
          </p>
          <div className="mt-4 border-t border-hair pt-4 text-[11px] leading-relaxed text-ink-muted">
            <p>
              <strong className="font-semibold">Licensing:</strong> {specialist.licensing.line}
            </p>
            <p className="mt-2">{specialist.licensing.paragraph}</p>
          </div>
        </>
      )}
    </div>
  );
}
