/**
 * IndexNow bulk submitter for dscrbroker.com.
 *
 * Pushes every sitemap URL to the IndexNow endpoint so Bing (and Yandex,
 * Seznam, Naver) discover new and changed pages immediately instead of
 * waiting on a crawl. ChatGPT search grounding is Bing-backed, so Bing
 * freshness is load-bearing for the AI-assistant channel.
 *
 * Run AFTER any deploy that adds or meaningfully changes pages
 * (e.g. a new city-page wave):
 *   node scripts/indexnow-submit.mjs
 *
 * The key file must stay live at /<KEY>.txt (it ships from public/).
 */

const HOST = 'dscrbroker.com';
const KEY = 'eef7c16dad327f56bfeb306c0da88556';
const SITEMAP = `https://${HOST}/sitemap-0.xml`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const keyFileUrl = `https://${HOST}/${KEY}.txt`;
const keyRes = await fetch(keyFileUrl);
const keyBody = (await keyRes.text()).trim();
if (!keyRes.ok || keyBody !== KEY) {
  console.error(`Key file check FAILED: ${keyFileUrl} -> ${keyRes.status}, body "${keyBody.slice(0, 60)}"`);
  console.error('Deploy the key file before submitting; a bad key file voids the whole batch.');
  process.exit(1);
}
console.log(`Key file live: ${keyFileUrl}`);

const xml = await (await fetch(SITEMAP)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].trim())
  // /qualify/ is meta-noindexed; asking engines to index it is noise.
  .filter((u) => !u.includes('/qualify'));

if (urls.length === 0) {
  console.error(`No URLs parsed from ${SITEMAP}`);
  process.exit(1);
}
console.log(`Submitting ${urls.length} URLs from the sitemap...`);

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: keyFileUrl, urlList: urls }),
});
const body = await res.text();
console.log(`IndexNow response: HTTP ${res.status}${body ? ` ${body}` : ''}`);
if (res.status !== 200 && res.status !== 202) process.exit(1);
console.log('Accepted. Engines will verify the key file and process the batch asynchronously.');
