/**
 * Motion spine for the /forms/lp-t4/ landing page (FORM-LP-BRIEF section 2a).
 *
 * Ported from clients/dscr-funnel-template-4/src/scripts/motion.ts with the
 * scrolling logo/claim strip feature removed (no such strip on this page).
 * Everything else (scroll-to, reveals, counters, draw, seam, pin, tilt,
 * magnet) is kept as-is; the data-attribute contract is unchanged so lp-t4
 * components can reuse template 4's markup verbatim.
 *
 * Side-effect module imported by the lp-t4 page ONLY, from a <script> tag in
 * the page file itself (never on other routes in this repo).
 *
 * Load discipline:
 *   - nothing is imported before `window load`; then a 1200ms delay; then
 *     gsap + ScrollTrigger (dynamic), and Lenis only on desktop fine-pointer.
 *   - every hidden "from" state is applied FROM JS (gsap.set), so a failed
 *     load can never hide content.
 *   - belowFold(): anything in or near the viewport at boot renders static
 *     (hiding an on-screen element after load creates a late repaint that
 *     Lantern bills to the whole JS chain).
 *   - the H1 and the form wrapper (#start) never receive any set/tween.
 *   - never ScrollTrigger.normalizeScroll() (conflicts with Lenis).
 *
 * Data-attribute contract:
 *   data-reveal="fade-up|slide-left|slide-right|scale-up|rotate-in|clip-up"
 *   data-stagger (+ [data-child] descendants, 0.1s in DOM order)
 *   data-counter="620" data-from="0" data-decimals="0"  (from > value counts DOWN)
 *   data-draw (svg or a wrapper of paths), data-seam, data-pin="advantages"
 *   (+ data-pin-end="advantages" on the sibling end-trigger), data-persist,
 *   data-tilt, data-magnet, data-scroll-to="#start" (always on an <a href="#start">).
 *
 * Perf-cut switches: flip these from QA if the mobile Lighthouse median lands
 * under 90.
 */
export {};

/** Cut 1: rotate-in / clip-up become fade-up on mobile. */
const MOBILE_SIMPLE_REVEALS = false;
/** Cut 2: post-load delay before the gsap import (1200 default, 2200 fallback). */
const POST_LOAD_DELAY_MS = 1200;

const MQ_DESKTOP = '(min-width: 1024px)';
const MQ_DESKTOP_FINE = '(min-width: 1024px) and (pointer: fine)';
const MQ_HOVER_FINE = '(hover: hover) and (pointer: fine)';
const MQ_MOBILE = '(max-width: 767px)';
const CARD_SEL = '.card, .card-lg, .card-dark, .card-tilt, details, [data-card]';

type RevealType = 'fade-up' | 'slide-left' | 'slide-right' | 'scale-up' | 'rotate-in' | 'clip-up';
type Vars = Record<string, string | number>;
type RevealSpec = { from: Vars; to: Vars; duration: number; ease: string };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function safe(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (import.meta.env.DEV) console.warn(`[lp-motion] ${label} skipped:`, err);
  }
}

/* ------------------------------------------------------------------------ */
/* [data-scroll-to]: registered on every device, before any library loads.   */
/* Lenis takes over when present; otherwise the anchor jump is upgraded to a */
/* rAF-driven smooth scroll (the href still works with no JS). A native      */
/* scrollIntoView({behavior:'smooth'}) is NOT used here: cv-auto sections    */
/* fire contentvisibilityautostatechange as they stream past, the debounced  */
/* ScrollTrigger.refresh() that follows cancels the native smooth scroll     */
/* mid-flight, and the page strands short of the target. The rAF loop        */
/* re-reads the target position every frame, so late layout shifts and       */
/* refresh() cannot derail it; any real user input (wheel, touch, key)       */
/* cancels it immediately.                                                   */
/* ------------------------------------------------------------------------ */
let cancelScrollAnim: (() => void) | null = null;

function animateScrollTo(target: Element): void {
  cancelScrollAnim?.();
  const startY = window.scrollY;
  const targetY = () => target.getBoundingClientRect().top + window.scrollY;
  const duration = clamp(Math.abs(targetY() - startY) / 3, 320, 900);
  let begin: number | null = null;
  let raf = 0;
  const cancel = () => {
    cancelAnimationFrame(raf);
    (['wheel', 'touchstart', 'keydown'] as const).forEach((t) => window.removeEventListener(t, cancel));
    cancelScrollAnim = null;
  };
  cancelScrollAnim = cancel;
  (['wheel', 'touchstart', 'keydown'] as const).forEach((t) =>
    window.addEventListener(t, cancel, { passive: true }),
  );
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const step = (now: number) => {
    if (begin === null) begin = now;
    const p = Math.min(1, (now - begin) / duration);
    window.scrollTo(0, startY + (targetY() - startY) * ease(p));
    if (p < 1) raf = requestAnimationFrame(step);
    else cancel();
  };
  raf = requestAnimationFrame(step);
}

function bindScrollTo(): void {
  document.addEventListener('click', (e: MouseEvent) => {
    try {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest<HTMLElement>('[data-scroll-to]');
      if (!a) return;
      const sel = a.dataset.scrollTo || a.getAttribute('href') || '';
      if (!sel.startsWith('#') || sel.length < 2) return;
      const target = document.getElementById(sel.slice(1));
      if (!target) return;
      e.preventDefault();
      const lenis = window.__lenis;
      if (lenis) {
        lenis.scrollTo(target, { offset: -16 });
      } else {
        animateScrollTo(target);
      }
      if (typeof history.replaceState === 'function') history.replaceState(null, '', sel);
    } catch {
      /* fall through to the native anchor */
    }
  });
}

/* ------------------------------------------------------------------------ */
/* Boot: runs after window load + delay. Everything inside is guarded.       */
/* ------------------------------------------------------------------------ */
async function boot(): Promise<void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
  gsap.registerPlugin(ScrollTrigger);

  // Lenis is fetched only when the desktop fine-pointer query matches at boot
  // (touch scrolling is native in Lenis anyway; mobile never pays the bundle).
  // Its stylesheet is injected inline: a dynamic import of the bare .css file
  // references a chunk Vite never emits in this static build (verified 404),
  // so the handful of rules from lenis/dist/lenis.css ship here verbatim.
  let LenisCtor: (typeof import('lenis'))['default'] | null = null;
  if (window.matchMedia(MQ_DESKTOP_FINE).matches) {
    try {
      const { default: Lenis } = await import('lenis');
      LenisCtor = Lenis;
      if (!document.getElementById('lenis-css')) {
        const style = document.createElement('style');
        style.id = 'lenis-css';
        style.textContent =
          'html.lenis,html.lenis body{height:auto}' +
          '.lenis:not(.lenis-autoToggle).lenis-stopped{overflow:clip}' +
          '.lenis [data-lenis-prevent],.lenis [data-lenis-prevent-wheel],.lenis [data-lenis-prevent-touch],' +
          '.lenis [data-lenis-prevent-vertical],.lenis [data-lenis-prevent-horizontal]{overscroll-behavior:contain}' +
          '.lenis.lenis-smooth iframe{pointer-events:none}' +
          '.lenis.lenis-autoToggle{transition-property:overflow;transition-duration:1ms;transition-behavior:allow-discrete}';
        document.head.appendChild(style);
      }
    } catch {
      LenisCtor = null;
    }
  }

  document.documentElement.classList.add('motion-ready');

  const isMobile = window.matchMedia(MQ_MOBILE).matches;
  const belowFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight * 1.05;
  const isProtected = (el: Element) =>
    !!el.closest('#start') || el.tagName === 'H1' || !!el.querySelector('h1');
  const eligible = (el: Element) => !isProtected(el) && belowFold(el);
  const startFor = (el: Element) => (el.matches(CARD_SEL) ? 'top 90%' : 'top 88%');
  const clear = (els: Element[]) => gsap.set(els, { clearProps: 'opacity,transform,clipPath' });

  function revealSpec(raw: string | undefined): RevealSpec {
    let type = (raw || 'fade-up') as RevealType;
    if (MOBILE_SIMPLE_REVEALS && isMobile && (type === 'rotate-in' || type === 'clip-up')) type = 'fade-up';
    switch (type) {
      case 'slide-left':
        return { from: { opacity: 0, x: isMobile ? -36 : -70 }, to: { opacity: 1, x: 0 }, duration: 0.7, ease: 'power3.out' };
      case 'slide-right':
        return { from: { opacity: 0, x: isMobile ? 36 : 70 }, to: { opacity: 1, x: 0 }, duration: 0.7, ease: 'power3.out' };
      case 'scale-up':
        return { from: { opacity: 0, scale: 0.9 }, to: { opacity: 1, scale: 1 }, duration: 0.7, ease: 'power2.out' };
      case 'rotate-in':
        return {
          from: { opacity: 0, y: isMobile ? 20 : 36, rotation: 2.5 },
          to: { opacity: 1, y: 0, rotation: 0 },
          duration: 0.7,
          ease: 'power3.out',
        };
      case 'clip-up':
        return {
          from: { clipPath: 'inset(100% 0% 0% 0%)' },
          to: { clipPath: 'inset(0% 0% 0% 0%)' },
          duration: 0.9,
          ease: 'power4.out',
        };
      case 'fade-up':
      default:
        return { from: { opacity: 0, y: isMobile ? 24 : 40 }, to: { opacity: 1, y: 0 }, duration: 0.7, ease: 'power3.out' };
    }
  }

  /* ---- reveals: singles, sibling batches (card grids), stagger groups ---- */
  safe('reveals', () => {
    // Carriers are [data-reveal] elements AND bare [data-stagger] parents
    // (TrustBand/StatsBand/HowItWorks/Faq/FinalCta put data-stagger on an
    // un-revealed wrapper whose [data-child] kids carry, or default, the type).
    const carriers = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-child]), [data-stagger]:not([data-child])'),
    ).filter(eligible);
    const byParent = new Map<Element, Map<string, HTMLElement[]>>();

    for (const el of carriers) {
      if (el.hasAttribute('data-stagger')) {
        const kids = Array.from(el.querySelectorAll<HTMLElement>('[data-child]')).filter((k) => !isProtected(k));
        if (kids.length) {
          const tl = gsap.timeline({ paused: true, onComplete: () => clear(kids) });
          kids.forEach((kid, i) => {
            const spec = revealSpec(kid.dataset.reveal || el.dataset.reveal);
            gsap.set(kid, spec.from);
            tl.to(kid, { ...spec.to, duration: spec.duration, ease: spec.ease }, i * 0.1);
          });
          ScrollTrigger.create({ trigger: el, start: startFor(el), once: true, onEnter: () => tl.play() });
          continue;
        }
      }
      // A bare [data-stagger] wrapper with no [data-child] kids and no reveal of
      // its own has nothing to animate.
      if (!el.hasAttribute('data-reveal')) continue;
      const parent = el.parentElement ?? document.body;
      const type = el.dataset.reveal || 'fade-up';
      let group = byParent.get(parent);
      if (!group) byParent.set(parent, (group = new Map()));
      const list = group.get(type);
      if (list) list.push(el);
      else group.set(type, [el]);
    }

    byParent.forEach((group) => {
      group.forEach((list, type) => {
        const spec = revealSpec(type);
        gsap.set(list, spec.from);
        if (list.length > 1) {
          // sibling grids (stat tiles, advantage cards, FAQ rows) share one batch
          ScrollTrigger.batch(list, {
            start: startFor(list[0]),
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                ...spec.to,
                duration: spec.duration,
                ease: spec.ease,
                stagger: 0.1,
                overwrite: 'auto',
                onComplete: () => clear(batch as Element[]),
              }),
          });
        } else {
          const el = list[0];
          gsap.to(el, {
            ...spec.to,
            duration: spec.duration,
            ease: spec.ease,
            onComplete: () => clear([el]),
            scrollTrigger: { trigger: el, start: startFor(el), toggleActions: 'play none none none', once: true },
          });
        }
      });
    });
  });

  /* ---- counters (from > value counts DOWN) ---- */
  safe('counters', () => {
    document.querySelectorAll<HTMLElement>('[data-counter]').forEach((el) => {
      if (!eligible(el)) return;
      const value = parseFloat(el.dataset.counter ?? '');
      if (!Number.isFinite(value)) return;
      const fromRaw = parseFloat(el.dataset.from ?? '0');
      const from = Number.isFinite(fromRaw) ? fromRaw : 0;
      const decRaw = parseInt(el.dataset.decimals ?? '0', 10);
      const decimals = Number.isFinite(decRaw) && decRaw > 0 ? decRaw : 0;
      const fmt = (n: number) => n.toFixed(decimals);
      const proxy = { v: from };
      el.textContent = fmt(from);
      gsap.fromTo(
        proxy,
        { v: from },
        {
          v: value,
          duration: 1.8,
          ease: 'power1.out',
          snap: { v: decimals ? Math.pow(10, -decimals) : 1 },
          onUpdate: () => {
            el.textContent = fmt(proxy.v);
          },
          onComplete: () => {
            el.textContent = fmt(value);
          },
          scrollTrigger: { trigger: el, start: 'top 75%', once: true },
        },
      );
    });
  });

  /* ---- data-draw: stroke-dash draw on enter (retries once a cv-auto section renders) ---- */
  const setupDraw = (el: HTMLElement, deferred = false): void => {
    if (isProtected(el) || (!deferred && !belowFold(el))) return;
    const paths = el.matches('path')
      ? [el as unknown as SVGPathElement]
      : Array.from(el.querySelectorAll<SVGPathElement>('path'));
    if (!paths.length) return;
    const lens = paths.map((p) => {
      // A pathLength attribute (HowItWorks connector uses pathLength="1")
      // rescales dash units, so it IS the length to dash against.
      const attr = parseFloat(p.getAttribute('pathLength') ?? '');
      if (Number.isFinite(attr) && attr > 0) return attr;
      try {
        return p.getTotalLength();
      } catch {
        return 0;
      }
    });
    if (lens.some((l) => !Number.isFinite(l) || l <= 0)) {
      const cv = el.closest('.cv-auto');
      if (cv && !el.dataset.drawRetry) {
        el.dataset.drawRetry = '1';
        cv.addEventListener('contentvisibilityautostatechange', () => safe('draw retry', () => setupDraw(el, true)), {
          once: true,
        });
      }
      return;
    }
    paths.forEach((p, i) => {
      p.style.strokeDasharray = String(lens[i]);
      p.style.strokeDashoffset = String(lens[i]);
    });
    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      stagger: 0.12,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  };
  safe('draw', () => {
    document.querySelectorAll<HTMLElement>('[data-draw]').forEach((el) => setupDraw(el));
  });

  /* ---- data-seam: scaleX 0 -> 1 ---- */
  safe('seam', () => {
    document.querySelectorAll<HTMLElement>('[data-seam]').forEach((el) => {
      if (!eligible(el)) return;
      gsap.set(el, { scaleX: 0 });
      gsap.to(el, {
        scaleX: 1,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      });
    });
  });

  /* ---- desktop-only: Lenis, pin, tilt, magnet (matchMedia contexts revert cleanly) ---- */
  const mm = gsap.matchMedia();

  mm.add(MQ_DESKTOP_FINE, () => {
    if (!LenisCtor) return;
    const lenis = new LenisCtor({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
      anchors: { offset: -16 },
      prevent: (node: HTMLElement) => node.hasAttribute('data-lenis-prevent'),
    });
    lenis.on('scroll', () => ScrollTrigger.update());
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis as unknown as Window['__lenis'];
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      if ((window.__lenis as unknown) === lenis) window.__lenis = undefined;
    };
  });

  mm.add(MQ_DESKTOP, () => {
    safe('pin', () => {
      // Advantages markup: data-pin="advantages" sits ON the prose column and
      // data-pin-end="advantages" on the sibling card column (Lane S contract).
      const prose = document.querySelector<HTMLElement>('[data-pin]');
      if (!prose) return;
      const grid = document.querySelector<HTMLElement>(`[data-pin-end="${prose.dataset.pin ?? ''}"]`);
      if (!grid || prose === grid || prose.contains(grid) || grid.contains(prose)) return;
      // Pin travel must be >= 320px or the pin is a no-op that fights the layout.
      if (grid.offsetHeight - prose.offsetHeight < 320) return;
      ScrollTrigger.create({
        trigger: prose,
        start: 'top 96px',
        endTrigger: grid,
        end: 'bottom bottom',
        pin: prose,
        pinSpacing: false,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      });
    });
  });

  mm.add(MQ_HOVER_FINE, () => {
    const removers: Array<() => void> = [];

    safe('tilt', () => {
      document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
        if (card.closest('#start') || card.tagName === 'H1') return;
        if (card.querySelector('input, select, textarea, h1, [role="listbox"]')) return;
        const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
        const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
        const enter = () => {
          if (!card.parentElement?.classList.contains('card-tilt')) gsap.set(card, { transformPerspective: 1200 });
        };
        const move = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          if (!r.width || !r.height) return;
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          ry(clamp(px * 8, -4, 4));
          rx(clamp(-py * 8, -4, 4));
        };
        const leave = () => {
          rx(0);
          ry(0);
        };
        card.addEventListener('pointerenter', enter);
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        removers.push(() => {
          card.removeEventListener('pointerenter', enter);
          card.removeEventListener('pointermove', move);
          card.removeEventListener('pointerleave', leave);
        });
      });
    });

    safe('magnet', () => {
      document.querySelectorAll<HTMLElement>('[data-magnet]').forEach((btn) => {
        if (btn.closest('#start')) return;
        const qx = gsap.quickTo(btn, 'x', { duration: 0.45, ease: 'power3.out' });
        const qy = gsap.quickTo(btn, 'y', { duration: 0.45, ease: 'power3.out' });
        const move = (e: PointerEvent) => {
          const r = btn.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          qx(clamp(dx * 0.25, -12, 12));
          qy(clamp(dy * 0.25, -8, 8));
        };
        const leave = () => {
          qx(0);
          qy(0);
        };
        btn.addEventListener('pointermove', move);
        btn.addEventListener('pointerleave', leave);
        removers.push(() => {
          btn.removeEventListener('pointermove', move);
          btn.removeEventListener('pointerleave', leave);
        });
      });
    });

    return () => removers.forEach((fn) => fn());
  });

  /* ---- keep trigger positions honest ---- */
  safe('refresh hooks', () => {
    let timer = 0;
    const debouncedRefresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    };
    document.querySelectorAll('.cv-auto').forEach((el) => {
      el.addEventListener('contentvisibilityautostatechange', debouncedRefresh);
    });
    window.addEventListener('scroll', () => ScrollTrigger.refresh(), { once: true, passive: true });
  });
}

/* ------------------------------------------------------------------------ */
/* Entry                                                                     */
/* ------------------------------------------------------------------------ */
try {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bindScrollTo();
    const schedule = () => {
      window.setTimeout(() => {
        boot().catch((err) => {
          if (import.meta.env.DEV) console.warn('[lp-motion] disabled:', err);
        });
      }, POST_LOAD_DELAY_MS);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
  }
} catch {
  /* motion is optional; the page is fully usable without it */
}
