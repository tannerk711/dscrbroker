// State-to-broker routing map
// Note: NY, MI, ND, SD, UT excluded from form (trimmed 2026-08-11; was 13 states from 2026-04-27).
// broker_f = Adam Cunningham / Tall Timbers (added 2026-08-11): AK, HI, LA, MS, MO, NM, OH;
// GA added solo 2026-11-07 (the old 50/50 John/Adam split is retired; every state is
// single-broker, and the server forces GA in src/pages/api/lead.ts SINGLE_OWNER_STATES
// to cover stale client bundles).
// broker_g = Taylor Sundquist / Future Mortgage (added 2026-10-29): CA, ID, MT, OR, WA solo
// (CA/WA moved off broker_b, ID/OR off broker_a, MT off broker_f; also server-forced).
const STATE_TO_BROKER: Record<string, string> = {
  AL: 'broker_a', AR: 'broker_a', CT: 'broker_a',
  DE: 'broker_a', IN: 'broker_a',
  IA: 'broker_a', KS: 'broker_a', KY: 'broker_a', ME: 'broker_a',
  MN: 'broker_a',
  NE: 'broker_a', NH: 'broker_a',
  RI: 'broker_a', VT: 'broker_a', WI: 'broker_a',
  WY: 'broker_a',
  AZ: 'broker_b', CO: 'broker_b', NV: 'broker_b',
  FL: 'broker_c', NC: 'broker_c', SC: 'broker_c',
  TN: 'broker_c', VA: 'broker_c',
  TX: 'broker_d', OK: 'broker_d',
  MD: 'broker_d',
  NJ: 'broker_e', PA: 'broker_e', MA: 'broker_e',
  IL: 'broker_e', DC: 'broker_e', WV: 'broker_e',
  AK: 'broker_f', GA: 'broker_f', HI: 'broker_f', LA: 'broker_f', MS: 'broker_f',
  MO: 'broker_f', NM: 'broker_f', OH: 'broker_f',
  CA: 'broker_g', ID: 'broker_g', MT: 'broker_g', OR: 'broker_g',
  WA: 'broker_g',
};

// States excluded from the form (broker network does not currently cover).
const EXCLUDED_STATES = new Set(['NY', 'MI', 'ND', 'SD', 'UT']);

// The per-broker webhook env NAMES (WEBHOOK_BROKER_A..G) live server-side only, in
// src/pages/api/lead.ts BROKER_WEBHOOK_ENV. The old client-side BROKER_ENV_MAP +
// getBrokerConfig pair (API_KEY_*/EMAIL_* triples) was dead code with zero callers
// and was deleted 2026-10-29; the browser never sees a webhook URL.

export function getBrokerForState(stateAbbr: string): string {
  return STATE_TO_BROKER[stateAbbr.toUpperCase()] || 'broker_a';
}

// Full state names for display
export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// States list for dropdown (sorted by full name, excludes states the network doesn't cover)
export const STATES_LIST = Object.entries(STATE_NAMES)
  .filter(([abbr]) => !EXCLUDED_STATES.has(abbr))
  .map(([abbr, name]) => ({ value: abbr, label: name }))
  .sort((a, b) => a.label.localeCompare(b.label));

// Property type display names
export const PROPERTY_TYPE_NAMES: Record<string, string> = {
  single_family: 'Single-Family Rental',
  warrantable_condo: 'Warrantable Condo',
  non_warrantable_condo: 'Non-Warrantable Condo',
  multi_family_small: 'Multi-Family Property (2-4 Units)',
  multi_family_large: 'Multi-Family Property (5+ Units)',
  // Legacy types still referenced by program pages and historic submissions:
  str: 'Short-Term Rental',
  mixed_use: 'Mixed-Use Property',
  portfolio: 'Portfolio (Multiple Properties)',
};

// Phone formatting
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+1${digits}`;
}

// Device type detection
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
