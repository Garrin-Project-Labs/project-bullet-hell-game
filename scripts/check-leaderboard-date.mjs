import fs from 'node:fs';
const appScript = fs.readFileSync('scripts/google-sheets-leaderboard.gs', 'utf8');
const worker = fs.readFileSync('workers/leaderboard.js', 'utf8');
const game = fs.readFileSync('src/main.ts', 'utf8');
let ok = true;
const checks = [
  ['Apps Script stores short M/d date', appScript.includes("Utilities.formatDate(date, Session.getScriptTimeZone(), 'M/d')")],
  ['Apps Script no longer writes ISO timestamp', !appScript.includes('new Date().toISOString()')],
  ['Worker stores short UTC M/D date', worker.includes('date.getUTCMonth() + 1') && worker.includes('date.getUTCDate()')],
  ['Worker no longer writes ISO timestamp', !worker.includes('new Date().toISOString()')],
  ['Leaderboard renders date column', game.includes("const date = (entry.date || '--/--').slice(0, 5).padEnd(5, ' ')")]
];
for (const [label, pass] of checks) {
  if (!pass) {
    console.error(`FAIL: ${label}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('PASS: leaderboard submissions store and display short M/D dates');
