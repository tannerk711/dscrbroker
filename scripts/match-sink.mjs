// Local webhook sink for QA of the /match/ funnel (and any other form on this site).
//
// Starts an HTTP server on 127.0.0.1:9799 that accepts every POST, appends the JSON body
// to scripts/.match-sink.log (gitignored via scripts/), and answers 200 {"ok":true}.
// Point ALL six broker webhooks at it so no real Zapier hook can fire during QA:
//
//   SINK=http://127.0.0.1:9799/hook
//   CI=true WEBHOOK_BROKER_A=$SINK WEBHOOK_BROKER_B=$SINK WEBHOOK_BROKER_C=$SINK \
//   WEBHOOK_BROKER_D=$SINK WEBHOOK_BROKER_E=$SINK WEBHOOK_BROKER_F=$SINK \
//   npx astro dev --port 4322 --host 127.0.0.1
//
// Then: node scripts/match-sink.mjs   (leave it running; Ctrl+C to stop)
// Every payload prints to the console as it arrives, with the routed broker + state.
import { createServer } from 'node:http';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const LOG = join(here, '.match-sink.log');
const PORT = Number(process.env.SINK_PORT || 9799);

let count = 0;
createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    count += 1;
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = { raw: body };
    }
    const stamp = new Date().toISOString();
    appendFileSync(LOG, JSON.stringify({ stamp, url: req.url, body: parsed }) + '\n');
    console.log(
      `[${stamp}] #${count} ${req.method} ${req.url}  broker=${parsed.matchedBroker ?? '-'}  state=${parsed.stateCode ?? '-'}  consent=${parsed?.consent?.agreed ?? '-'}  keys=${Object.keys(parsed).length}`
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`match-sink listening on http://127.0.0.1:${PORT}/hook  (log: ${LOG})`);
});
