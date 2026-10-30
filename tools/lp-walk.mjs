// Drives foundation/tools/walk-form.mjs over the four committed scenarios
// (tools/scenarios/{buy,refi,flip,kickout}.json) against /qualify/, both
// devices. FORM-LP-BRIEF.md section 5.
//
// LIVE NOTE (2026-10-30 migration): the scenarios stop at the phone step with
// consent checked and the submit button enabled; they never click submit, so a
// walk against the dev server can never POST a lead. The submit path is proven
// by lp-network.mjs (intercepted POST, payload contract) locally and by the one
// real ?demo=1 submit on production after a deploy.
//
// Scenario JSON is committed RELATIVE (a `route`, no url/outDir): this tool builds
// each scenario in memory, injects `url: QA_BASE + route` and
// `outDir: resolve(ROOT, 'tools/shots/walk')`, writes it to a temp file, and runs
// walk-form.mjs via spawnSync (never a shell string: the workspace path has spaces).
//
// walk-form.mjs never exits non-zero, so this tool parses its combined
// stdout+stderr and FAILS (exit 1) on any of:
//   [pageerror | [console.error | click target not found | no empty visible input |
//   no unchecked checkbox
//
//   node tools/lp-walk.mjs [--device=desktop|mobile|both]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ROOT, QA_BASE } from './lp-lib.mjs';

const argv = process.argv.slice(2);
const deviceArg = (argv.find((a) => a.startsWith('--device=')) || '--device=both').split('=')[1];

// walk-form.mjs lives at the master workspace root's tools/ (the 2026-09-30
// migration retired foundation/tools/, kept here as a legacy fallback).
const WALK_FORM_CANDIDATES = [
  resolve(ROOT, '../../../../tools/walk-form.mjs'),
  resolve(ROOT, '../../foundation/tools/walk-form.mjs'),
];
const walkFormPath = WALK_FORM_CANDIDATES.find((p) => existsSync(p));
if (!walkFormPath) {
  console.error(`lp-walk: walk-form.mjs not found at any of:\n  ${WALK_FORM_CANDIDATES.join('\n  ')}`);
  process.exit(1);
}

const scenariosDir = resolve(ROOT, 'tools/scenarios');
// state-kickout proves the excluded-state guarantee (NY/MI/ND/SD/UT never reach
// the contact steps, so they can never POST): it types New York, expects the
// kick-out screen, and clicks "Change the state", which exists nowhere else.
const SCENARIOS = ['buy', 'refi', 'flip', 'kickout', 'state-kickout'];
const outDir = resolve(ROOT, 'tools/shots/walk');
mkdirSync(outDir, { recursive: true });

const FAIL_RE = /\[pageerror|\[console\.error|click target not found|no empty visible input|no unchecked checkbox/;

const tmpDir = mkdtempSync(join(tmpdir(), 'lp-walk-'));
let failures = 0;
const results = [];

console.log(`lp-walk: QA_BASE=${QA_BASE}  device=${deviceArg}`);

for (const name of SCENARIOS) {
  const scenarioFile = join(scenariosDir, `${name}.json`);
  if (!existsSync(scenarioFile)) {
    console.log(`FAIL  ${name}: scenario file not found (${scenarioFile})`);
    failures++;
    results.push({ name, ok: false, reason: 'scenario file not found' });
    continue;
  }
  const scenario = JSON.parse(readFileSync(scenarioFile, 'utf8'));
  const built = {
    ...scenario,
    url: QA_BASE + scenario.route,
    outDir,
  };
  delete built.route;
  const tmpPath = join(tmpDir, `${name}.json`);
  writeFileSync(tmpPath, JSON.stringify(built, null, 2));

  console.log(`\n== ${name}  (${built.url}) ==`);
  const r = spawnSync(process.execPath, [walkFormPath, tmpPath, `--device=${deviceArg}`], {
    shell: false,
    encoding: 'utf8',
  });
  const combined = `${r.stdout || ''}\n${r.stderr || ''}`;
  console.log(combined.trim());

  // Dev-only exemption (same as lp-lib attachErrorLog): the Astro dev toolbar
  // entrypoint 504s "Outdated Optimize Dep" after Vite re-optimizes gsap + lenis.
  // It is not part of the page and never ships, so that one line is dropped
  // before the fail patterns are matched.
  const scanned = combined
    .split('\n')
    .filter((line) => !/Outdated Optimize Dep/.test(line))
    .join('\n');
  const hit = scanned.match(FAIL_RE);
  const spawnFailed = r.error || (r.status !== 0 && r.status !== null);
  const ok = !hit && !spawnFailed;
  if (!ok) failures++;
  results.push({
    name,
    ok,
    reason: hit ? hit[0] : spawnFailed ? `spawn exit ${r.status} ${r.error?.message || ''}`.trim() : '',
  });
  console.log(`${ok ? 'PASS' : 'FAIL'}  scenario ${name}${hit ? `  (matched: "${hit[0]}")` : ''}`);
}

try {
  rmSync(tmpDir, { recursive: true, force: true });
} catch {
  /* best effort cleanup */
}

console.log('\nlp-walk summary:');
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.reason ? `  (${r.reason})` : ''}`);
console.log(`\nshots -> ${outDir}`);

process.exit(failures ? 1 : 0);
