import { useState, useEffect } from 'react';

const navLinks = [
  { label: 'Loan Programs', href: '/programs/' },
  { label: 'Deal Analyzer', href: '/analyze/' },
  { label: 'States', href: '/states/' },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-50 flex h-11 w-11 items-center justify-center rounded-lg text-white"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        <svg
          className="h-6 w-6 transition-transform duration-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 z-40 h-full w-72 bg-navy-light border-l border-navy-mid transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav className="flex flex-col gap-1 px-4 pt-20" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-3 text-base font-medium text-slate-300 transition-colors hover:bg-navy-mid hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}

          <div className="mt-4 border-t border-navy-mid pt-4">
            <a
              href="/qualify/"
              className="flex items-center justify-center rounded-lg bg-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-dark"
              onClick={() => setIsOpen(false)}
            >
              Match Me With a Specialist
            </a>
          </div>
        </nav>
      </div>
    </>
  );
}
