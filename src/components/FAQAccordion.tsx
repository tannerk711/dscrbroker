import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className={`rounded-2xl bg-white border transition-shadow ${
              isOpen ? 'border-blue/30 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'
            }`}
          >
            <button
              className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left"
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
            >
              <span className="pr-2 text-sm font-semibold text-navy md:text-base">
                {item.question}
              </span>
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                  isOpen ? 'bg-blue text-white rotate-45' : 'bg-blue/10 text-blue'
                }`}
                aria-hidden="true"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-sm leading-relaxed text-gray-500 md:text-[15px]">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
