import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';

interface Testimonial {
  name: string;
  state: string;
  type: string;
  quote: string;
  outcome: string;
  ltv: string;
  closeDays: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Marcus T.',
    state: 'Florida',
    type: 'Portfolio (5 SFRs)',
    quote: 'I own 14 rentals across three states. My broker structured a portfolio deal at 75% LTV. No income docs, no tax returns, closed in 19 days. I\'ve worked with a lot of loan officers. This was the smoothest DSCR close I\'ve had.',
    outcome: '5 SFRs in one close',
    ltv: '75%',
    closeDays: '19 Days',
  },
  {
    name: 'Jessica W.',
    state: 'Texas',
    type: 'Single-family rental',
    quote: 'I had no idea DSCR loans existed until I found this site. Filled out the form in two minutes, got a call within an hour, and had a structured plan by the next morning. Closed on my first rental at 25% down without a single tax return submitted.',
    outcome: 'First rental, no W-2s',
    ltv: '75%',
    closeDays: '23 Days',
  },
  {
    name: 'Anthony R.',
    state: 'Georgia',
    type: 'Single-family rental',
    quote: 'My local credit union told me my self-employed income wouldn\'t qualify and tried to push me into a worse program. My matched broker structured a DSCR loan that ignored my personal income entirely and qualified on the property\'s rent.',
    outcome: 'Self-employed, declined elsewhere',
    ltv: '75%',
    closeDays: 'Fast Closing',
  },
  {
    name: 'Keisha D.',
    state: 'North Carolina',
    type: 'Duplex (2-unit)',
    quote: 'I\'m a nurse who bought her first rental property. I was worried about qualifying because I already have a mortgage on my primary home. My broker explained that DSCR doesn\'t look at my personal debt at all. The duplex qualified on its own rental income.',
    outcome: 'First investment, primary mortgage in place',
    ltv: '75%',
    closeDays: '25 Days',
  },
  {
    name: 'Daniel P.',
    state: 'Arizona',
    type: 'Condo',
    quote: 'I\'ve closed 9 DSCR loans in the past two years. My first lender declined the deal because of a condo association issue. My broker pivoted to a different lender within 48 hours and we closed on time. That doesn\'t happen when you\'re locked into one lender.',
    outcome: 'Saved after first decline',
    ltv: '75%',
    closeDays: '27 Days',
  },
  {
    name: 'Carlos V.',
    state: 'Florida',
    type: 'SFR (Foreign National)',
    quote: 'I live in Toronto and own two rentals in Florida. Getting a US mortgage as a Canadian used to be nearly impossible. My broker walked me through the foreign national program, handled the foreign credit report, and I closed a $390K loan with no SSN required.',
    outcome: 'Foreign national, no SSN',
    ltv: '70%',
    closeDays: '28 Days',
  },
  {
    name: 'Mike L.',
    state: 'Tennessee',
    type: 'Short-term rental (cabin)',
    quote: 'I run 3 Airbnbs in the Smoky Mountains. Most lenders won\'t touch STR income. My matched broker found a lender that uses AirDNA projections and accepted my trailing 12-month revenue on a cabin that does $50K a year in gross bookings.',
    outcome: 'STR income approved',
    ltv: '75%',
    closeDays: '23 Days',
  },
  {
    name: 'Brian H.',
    state: 'Ohio',
    type: 'Townhome',
    quote: 'My CPA told me I\'d never qualify for another mortgage because of how my tax returns look after depreciation. Two days after submitting the form, I had a pre-approval letter for a DSCR loan. No income verification at all.',
    outcome: 'Heavy write-offs, still approved',
    ltv: '75%',
    closeDays: '22 Days',
  },
];

function StarIcon() {
  return (
    <svg className="h-4 w-4 text-amber" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function TestimonialCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true,
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  return (
    <div className="relative">
      {/* Carousel viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="min-w-0 flex-[0_0_100%] md:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)]"
            >
              <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                {/* Stars */}
                <div className="mb-4 flex gap-0.5">
                  {[...Array(5)].map((_, j) => <StarIcon key={j} />)}
                </div>

                {/* Quote */}
                <p className="flex-1 text-sm leading-relaxed text-gray-500">"{t.quote}"</p>

                {/* Deal stats */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="mb-3">
                    <p className="text-xs uppercase tracking-wider text-amber font-semibold">Outcome</p>
                    <p className="font-semibold text-navy text-sm mt-0.5">{t.outcome}</p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-400">LTV</p>
                      <p className="font-semibold text-navy text-sm">{t.ltv}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-400">Close</p>
                      <p className="font-semibold text-navy text-sm">{t.closeDays}</p>
                    </div>
                  </div>
                </div>

                {/* Attribution */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.state} · {t.type}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md disabled:opacity-40"
          aria-label="Previous testimonial"
        >
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={scrollNext}
          disabled={!canScrollNext}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md disabled:opacity-40"
          aria-label="Next testimonial"
        >
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
