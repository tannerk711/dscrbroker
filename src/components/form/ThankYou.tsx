import { useEffect, useRef, useState } from 'react';
import { STATE_NAMES, PROPERTY_TYPE_NAMES } from '../../utils/brokerRouting';
import type { DealVerdict, ProgramRecommendation } from '../../utils/rateEstimation';
import { JOHN_LICENSING_LINE, JOHN_LICENSING_PARAGRAPH } from '../../data/john-licensing';

interface SubmissionPayload {
  loanGoal?: string;
  state?: string;
  propertyType?: string;
  creditScore?: string;
  cashFlow?: string;
  matchedBroker?: string;
  firstName?: string;
  dealVerdict?: DealVerdict;
  program?: ProgramRecommendation;
  isFake?: boolean;
}

const TIER_STYLES: Record<DealVerdict['tier'], { ring: string; pill: string; pillText: string }> = {
  strong: { ring: 'ring-green/30', pill: 'bg-green/15 border-green/30', pillText: 'text-green-400' },
  workable: { ring: 'ring-blue/30', pill: 'bg-blue/15 border-blue/30', pillText: 'text-blue-light' },
  structuring: { ring: 'ring-amber/30', pill: 'bg-amber/15 border-amber/30', pillText: 'text-amber' },
  review: { ring: 'ring-amber/30', pill: 'bg-amber/15 border-amber/30', pillText: 'text-amber' },
};

// Per-broker specialist profiles. To start, every state routes to John Peisner's team
// at Barrett Financial. As more LOs come into the network, add their entries here keyed
// by the broker identifier in brokerRouting.ts.
interface SpecialistProfile {
  // Legal identity. The individual licensed loan officer. Used for NMLS attribution
  // and any compliance text. Never a "team" or company name.
  name: string;
  // Presentation label shown in headings/UI (may be a team label, e.g. "John Peisner Team").
  // Falls back to `name` if not set.
  displayName?: string;
  title: string;
  nmls: string;
  company: string;
  companyLogo: string;
  headshot: string;
  message: string;
  videoEmbedUrl: string | null;
  reviews: {
    rating: number;
    count: number;
    quotes: { quote: string; author: string; avatar: string }[];
  };
  // Full state-licensing disclaimer for this specialist. Rendered in the thank-you
  // page footer only when this broker is the matched specialist. null = no block.
  licensing: { line: string; paragraph: string } | null;
}

const DEFAULT_SPECIALIST: SpecialistProfile = {
  name: 'John Peisner',
  displayName: 'John Peisner Team',
  title: 'Senior Loan Officer',
  nmls: '239185',
  company: 'Barrett Financial Group',
  companyLogo: '/images/BFGLogo-WhiteNegative.png',
  headshot: '/images/JP Headshot Final.jpg',
  message:
    "I've spent my career structuring DSCR and non-QM deals for real estate investors, including the ones other lenders walk away from. The questionnaire you just filled out gives me a real starting point, but every deal has nuance that doesn't fit in a form. I'll personally review your file, call you within the hour, and walk you through exactly what we can do. No call center, no runaround.",
  videoEmbedUrl: null,
  reviews: {
    rating: 5.0,
    count: 180,
    quotes: [
      {
        quote:
          "John and his team got our DSCR loan closed in 18 days after two other lenders had already declined the file. Real specialists.",
        author: 'Marcus T., Texas',
        avatar: '/images/reviews/marcus-t.jpg',
      },
      {
        quote:
          "We've closed four investment properties with John's team. They actually understand investor scenarios. No back-and-forth explaining what a DSCR is.",
        author: 'Priya R., Arizona',
        avatar: '/images/reviews/priya-r.jpg',
      },
      {
        quote:
          "Self-employed with non-traditional income. Every retail bank passed. John structured it and we closed at full ask.",
        author: 'Daniel K., Florida',
        avatar: '/images/reviews/daniel-k.jpg',
      },
    ],
  },
  licensing: {
    line: JOHN_LICENSING_LINE,
    paragraph: JOHN_LICENSING_PARAGRAPH,
  },
};

const BROKER_PROFILES: Record<string, SpecialistProfile> = {
  broker_a: DEFAULT_SPECIALIST,
  broker_b: DEFAULT_SPECIALIST,
  broker_c: DEFAULT_SPECIALIST,
  broker_d: DEFAULT_SPECIALIST,
  broker_e: DEFAULT_SPECIALIST,
};

function getThankYouCopy(loanGoal: string | undefined, firstName: string | undefined): { headline: string; body: string } {
  const greeting = firstName ? `Thanks, ${firstName}.` : 'Thanks.';
  if (loanGoal === 'refinance') {
    return {
      headline: `${greeting} You're matched.`,
      body: 'Based on the info you provided, your file looks like a fit for a cash-out refinance. Your matched DSCR specialist will reach out shortly to review the details, pre-qualify you, and walk you through a formal quote.',
    };
  }
  if (loanGoal === 'flip') {
    return {
      headline: `${greeting} You're matched.`,
      body: "Based on the info you provided, your file looks like a fit for a fix & flip or fix-and-hold. Your matched DSCR specialist will reach out shortly to review the details, pre-qualify you, and walk you through a formal quote and term sheet.",
    };
  }
  return {
    headline: `${greeting} You're matched.`,
    body: 'Based on the info you provided, your file looks like a fit for a DSCR purchase loan. Your matched DSCR specialist will reach out shortly to review the details, pre-qualify you, and issue a formal pre-approval you can use to make offers.',
  };
}

export default function ThankYou() {
  const [data, setData] = useState<SubmissionPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const confettiRef = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('dscrbroker_submission');
      if (raw) {
        setData(JSON.parse(raw));
      } else if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1') {
        setData({
          loanGoal: 'purchase',
          state: 'TX',
          propertyType: 'single_family',
          firstName: 'Marcus',
          matchedBroker: 'broker_a',
          isFake: true,
          dealVerdict: {
            tier: 'strong',
            label: 'Strong Deal',
            headline: "Your file is in great shape. Your specialist will move quickly to formalize the pre-approval and surface the right lender.",
            specialistFocus: [
              'Confirm rental comp on subject property',
              'Verify reserves and entity setup',
              'Match to the lender with the strongest DSCR overlays for your scenario',
            ],
          } as DealVerdict,
        });
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!data || data.isFake || confettiRef.current) return;
    confettiRef.current = true;
    import('canvas-confetti').then((mod) => {
      mod.default({
        particleCount: 80,
        spread: 80,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#3B82F6', '#22C55E', '#D4930D', '#FFFFFF'],
        ticks: 200,
        gravity: 1.2,
        scalar: 1,
      });
    }).catch(() => {});
  }, [data]);

  if (!loaded) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-white/40 text-sm">Loading your match...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white mb-3">No submission found.</h2>
        <p className="text-white/60 mb-6">It looks like you landed on this page without filling out the form.</p>
        <a
          href="/#lead-form"
          className="inline-block bg-blue hover:bg-blue/90 text-white px-6 py-3 rounded text-sm font-semibold uppercase tracking-wider transition-colors"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          Match Me With a Specialist
        </a>
      </div>
    );
  }

  const { dealVerdict, program, state, propertyType, loanGoal, firstName, matchedBroker } = data;
  const copy = getThankYouCopy(loanGoal, firstName);
  const stateFullName = state ? STATE_NAMES[state] || state : '';
  const propertyTypeName = propertyType ? PROPERTY_TYPE_NAMES[propertyType] || propertyType : '';
  const tierStyle = dealVerdict ? TIER_STYLES[dealVerdict.tier] : TIER_STYLES.workable;
  const specialist = (matchedBroker && BROKER_PROFILES[matchedBroker]) || DEFAULT_SPECIALIST;
  // Presentation label (may be a team name). Legal/NMLS text still uses specialist.name.
  const specialistDisplayName = specialist.displayName ?? specialist.name;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Animated checkmark */}
      <div className="mx-auto w-16 h-16 rounded-full bg-green flex items-center justify-center animate-[scaleIn_300ms_ease-out]">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-center text-[32px] md:text-[40px] font-bold text-white mt-6 leading-tight" style={{ fontFamily: 'var(--font-sans)' }}>
        {copy.headline}
      </h1>

      <p className="text-center text-base md:text-lg text-white/70 mt-4 max-w-xl mx-auto leading-relaxed">
        {copy.body}
      </p>

      {/* What happens next bullets */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 md:p-8 mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
          What Happens Next
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-white/80">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm md:text-base">Your matched specialist has access to over 70 sources of funding and will work to find the best fit for your file.</span>
          </li>
          <li className="flex items-start gap-3 text-white/80">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm md:text-base">Your matched DSCR specialist{stateFullName ? ` in ${stateFullName}` : ''} will reach out within 1 business hour to verify a few details.</span>
          </li>
          <li className="flex items-start gap-3 text-white/80">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm md:text-base">Once verified, your DSCR specialist structures your file, walks you through the pros and cons, presents rates and payments for your review, and guides you through a same-day formal pre-approval.</span>
          </li>
        </ul>
      </div>

      {/* Specialist Card: headshot, name, NMLS, company logo, personal message */}
      <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative flex-shrink-0 mx-auto sm:mx-0">
            <img
              src={specialist.headshot}
              alt={`${specialistDisplayName}, ${specialist.title}`}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover ring-2 ring-white/15"
              loading="lazy"
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green flex items-center justify-center ring-2 ring-navy">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber" style={{ fontFamily: 'var(--font-sans)' }}>
              Your Matched Specialist
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-white mt-1" style={{ fontFamily: 'var(--font-sans)' }}>
              {specialistDisplayName}
            </h2>
            <p className="text-sm text-white/60 mt-0.5">
              {specialist.title} · NMLS #{specialist.nmls}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
              <img
                src={specialist.companyLogo}
                alt={specialist.company}
                className="h-7 md:h-8 w-auto object-contain opacity-90"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50 mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
            A Message From {specialist.name.split(' ')[0]}
          </p>
          <p className="text-sm md:text-base text-white/80 leading-relaxed">
            {specialist.message}
          </p>
        </div>

        {specialist.videoEmbedUrl && (
          <div className="mt-6 aspect-video w-full rounded-xl overflow-hidden bg-black/40 border border-white/10">
            <iframe
              src={specialist.videoEmbedUrl}
              title={`A message from ${specialist.name}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Deal verdict card */}
      {dealVerdict && (
        <div className={`bg-white/5 border border-white/10 rounded-xl p-6 md:p-8 mt-8 ring-1 ${tierStyle.ring}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50 mb-1" style={{ fontFamily: 'var(--font-sans)' }}>
                Your Deal at a Glance
              </p>
              <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-sans)' }}>
                {dealVerdict.label}
              </p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${tierStyle.pill} ${tierStyle.pillText}`}>
              {dealVerdict.tier === 'strong' ? 'Strong' : dealVerdict.tier === 'workable' ? 'Workable' : 'Specialist'}
            </span>
          </div>

          <p className="text-sm md:text-base text-white/70 mt-3 leading-relaxed">
            {dealVerdict.headline}
          </p>

          {dealVerdict.specialistFocus.length > 0 && (
            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
                What Your Specialist Will Work On
              </p>
              <ul className="space-y-2">
                {dealVerdict.specialistFocus.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm md:text-base text-white/80">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(propertyTypeName || stateFullName) && (
            <p className="text-xs text-white/40 mt-5">
              {[propertyTypeName, stateFullName].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>
      )}

      {program && (
        <div className="mt-6 text-center">
          <span
            className={`inline-block text-[11px] font-semibold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full border ${
              program.color === 'green'
                ? 'bg-green/10 text-green-400 border-green/20'
                : 'bg-blue/10 text-blue border-blue/20'
            }`}
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {program.badge}
          </span>
          <p className="text-sm text-white/60 mt-2">{program.program}</p>
        </div>
      )}

      {/* Reviews strip */}
      <div className="mt-10 pt-8 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50" style={{ fontFamily: 'var(--font-sans)' }}>
              What {specialist.name.split(' ')[0]}'s Clients Say
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-amber" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.39 7.36h7.74l-6.26 4.55 2.39 7.36L12 16.72l-6.26 4.55 2.39-7.36L1.87 9.36h7.74L12 2z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-semibold text-white">
                {specialist.reviews.rating.toFixed(1)}
              </span>
              <span className="text-sm text-white/50">
                · {specialist.reviews.count}+ reviews
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {specialist.reviews.quotes.map((review, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col">
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg key={j} className="w-3.5 h-3.5 text-amber" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.39 7.36h7.74l-6.26 4.55 2.39 7.36L12 16.72l-6.26 4.55 2.39-7.36L1.87 9.36h7.74L12 2z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-white/80 leading-relaxed flex-1">"{review.quote}"</p>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
                <img
                  src={review.avatar}
                  alt={review.author}
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-white/15 flex-shrink-0"
                  loading="lazy"
                />
                <p className="text-xs text-white/60 leading-tight">{review.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-white/30 text-xs mt-10 max-w-xl mx-auto text-center leading-relaxed">
        Pre-qualification is based on the information you provided. Final approval is subject to your specialist's review, full underwriting, appraisal, and lender guidelines. This is not a loan offer or commitment to lend. DSCRBroker.com is a matching service, not a lender or mortgage broker. {specialist.name} is a licensed loan officer with {specialist.company} (NMLS #{specialist.nmls}).
      </p>

      {/* Matched-specialist licensing block. Renders only when the matched broker
          carries a licensing disclaimer (currently John Peisner / Barrett Financial). */}
      {specialist.licensing && (
        <div className="mt-8 pt-6 border-t border-white/10 text-white/30 text-[11px] leading-relaxed space-y-3 max-w-3xl mx-auto">
          <p>
            <strong className="text-white/50">Licensing:</strong> {specialist.licensing.line}
          </p>
          <p>{specialist.licensing.paragraph}</p>
        </div>
      )}
    </div>
  );
}
