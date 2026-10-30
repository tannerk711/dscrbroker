// lp-states: captures the form states the step walk cannot show, on both devices:
// the open state combobox list (location step), the checked consent box + green
// SECURE badges (phone step, all fields valid), and the focus-visible ring on an
// option button. Prints geometry facts (list clipping, checkbox glyph, badge colors)
// and writes shots to tools/shots/states/. Exit 1 on any page error.
import { launchBrowser, openPage, VIEWPORTS, settle, shotPath } from './lp-lib.mjs';

const SUB = 'states';

const headline = (page) => page.evaluate(() => (document.querySelector('#start h2')?.textContent || '').trim());

async function clickText(page, text) {
  const before = await headline(page);
  const ok = await page.evaluate((t) => {
    const els = [...document.querySelectorAll('#start button, #start [role="button"]')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !e.disabled;
    });
    const el = els.find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase().includes(t.toLowerCase()));
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok) throw new Error(`click target not found: ${text} (on "${before}")`);
  try {
    await page.waitForFunction((b) => (document.querySelector('#start h2')?.textContent || '').trim() !== b, { timeout: 4000 }, before);
  } catch {
    throw new Error(`headline did not change after clicking "${text}" (still "${before}")`);
  }
  await settle(700);
}

async function typeInto(page, value) {
  const sel = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('#start input')].filter((i) => {
      const r = i.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && i.type !== 'checkbox' && i.type !== 'range' && !i.value;
    });
    if (!inputs.length) return null;
    inputs[0].setAttribute('data-qa-target', '1');
    return '[data-qa-target="1"]';
  });
  if (!sel) throw new Error('no empty visible input');
  await page.click(sel);
  await page.type(sel, value, { delay: 20 });
  await page.evaluate((s) => document.querySelector(s)?.removeAttribute('data-qa-target'), sel);
  await settle(300);
}

async function run(vp) {
  const errors = [];
  const browser = await launchBrowser(vp);
  const page = await openPage(browser, undefined, { vp, errors });
  const out = { viewport: vp.name };

  // focus-visible on an option button (keyboard)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await settle(200);
  out.focus = await page.evaluate(() => {
    const a = document.activeElement;
    if (!a) return null;
    const cs = getComputedStyle(a);
    return { tag: a.tagName, text: (a.textContent || '').trim().slice(0, 40), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, boxShadow: cs.boxShadow.slice(0, 80) };
  });
  await page.screenshot({ path: shotPath(vp.name, 'focus', SUB) });

  // buy path to the location step
  await clickText(page, 'buy a rental');
  await clickText(page, 'Just starting my research');
  await clickText(page, 'Single-family');
  await clickText(page, '740 or above');
  await clickText(page, 'CONTINUE');
  await clickText(page, 'CONTINUE');
  await typeInto(page, 'Te');
  await settle(400);
  out.list = await page.evaluate(() => {
    const list = document.querySelector('#start [role="listbox"], #start ul');
    if (!list) return { present: false };
    const r = list.getBoundingClientRect();
    const items = [...list.querySelectorAll('[role="option"]')].map((li) => li.textContent.trim());
    // walk up looking for an ancestor that clips
    let clipped = null;
    for (let el = list.parentElement; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (/hidden|clip|auto|scroll/.test(cs.overflowY) || /hidden|clip/.test(cs.overflowX)) {
        const pr = el.getBoundingClientRect();
        if (r.bottom > pr.bottom + 1 || r.right > pr.right + 1 || r.left < pr.left - 1) {
          clipped = { by: el.tagName + '.' + el.className.toString().slice(0, 40), overflow: cs.overflowX + '/' + cs.overflowY };
          break;
        }
      }
    }
    return { present: true, top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), viewportH: innerHeight, items: items.slice(0, 5), count: items.length, clipped };
  });
  await page.screenshot({ path: shotPath(vp.name, 'combobox-open', SUB) });

  // pick Texas, continue, contact, phone + consent
  const picked = await page.evaluate(() => {
    const opt = [...document.querySelectorAll('#start [role="option"]')].find((o) => /texas/i.test(o.textContent));
    if (opt) { opt.click(); return true; }
    return false;
  });
  if (!picked) {
    await page.keyboard.type('xas');
  }
  await settle(500);
  out.afterPick = await page.evaluate(() => ({
    picked: undefined,
    value: document.querySelector('#start input[role="combobox"]')?.value,
    listOpen: !!document.querySelector('#start [role="listbox"]'),
    continueDisabled: [...document.querySelectorAll('#start button')].find((b) => /CONTINUE/.test(b.textContent))?.disabled,
  }));
  out.afterPick.picked = picked;
  console.log(JSON.stringify(out));
  await clickText(page, 'CONTINUE');
  await typeInto(page, 'QA');
  await typeInto(page, 'Test DeleteMe');
  await typeInto(page, 'qa@example.com');
  await settle(300);
  out.secureContact = await page.evaluate(() =>
    [...document.querySelectorAll('#start *')]
      .filter((e) => e.children.length === 0 && /^SECURE$/i.test((e.textContent || '').trim()))
      .map((e) => getComputedStyle(e).color)
  );
  await page.screenshot({ path: shotPath(vp.name, 'contact-filled', SUB) });
  await clickText(page, 'CONTINUE');
  await typeInto(page, '5555550140');
  await page.evaluate(() => {
    const cb = document.querySelector('#start input[type="checkbox"]');
    if (cb && !cb.checked) cb.click();
  });
  await settle(400);
  out.phone = await page.evaluate(() => {
    const cb = document.querySelector('#start input[type="checkbox"]');
    const r = cb.getBoundingClientRect();
    const before = getComputedStyle(cb, '::before');
    const secure = [...document.querySelectorAll('#start *')]
      .filter((e) => e.children.length === 0 && /^SECURE$/i.test((e.textContent || '').trim()))
      .map((e) => getComputedStyle(e).color);
    const submit = [...document.querySelectorAll('#start button')].find((b) => /GET MY BROKER/i.test(b.textContent));
    const sr = submit ? submit.getBoundingClientRect() : null;
    return {
      checked: cb.checked,
      box: { w: Math.round(r.width), h: Math.round(r.height) },
      glyph: { content: before.content, bg: before.backgroundColor || before.background.slice(0, 40), clip: before.clipPath.slice(0, 60), w: before.width, h: before.height },
      cbBg: getComputedStyle(cb).backgroundColor,
      secure,
      submit: submit ? { disabled: submit.disabled, h: Math.round(sr.height), bg: getComputedStyle(submit).backgroundColor } : null,
    };
  });
  await page.screenshot({ path: shotPath(vp.name, 'phone-consented', SUB) });

  // 44px audit across every interactive element in #start on this step + the option steps already seen
  out.small = await page.evaluate(() => {
    const els = [...document.querySelectorAll('#start button, #start input, #start a, #start label')];
    return els
      .map((e) => ({ tag: e.tagName, type: e.type || '', text: (e.textContent || e.placeholder || '').trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) }))
      .filter((x) => x.h > 0 && (x.h < 44 || x.w < 44));
  });

  await browser.close();
  return { out, errors };
}

let fail = false;
for (const vp of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
  try {
    const { out, errors } = await run(vp);
    console.log(JSON.stringify(out, null, 1));
    if (errors.length) { fail = true; console.log(errors.join('\n')); }
  } catch (e) {
    fail = true;
    console.log(`FAIL ${vp.name}: ${e.message}`);
  }
}
console.log(fail ? 'lp-states: FAIL' : 'lp-states: done');
process.exit(fail ? 1 : 0);
