import fs from 'node:fs';

const source = fs.readFileSync('src/main.ts', 'utf8');
const checks = [
  ['debug BIO duration constant exists', 'const DEBUG_BIO_SHIELD_MS = 60 * 60 * 1000;'],
  ['H label mentions BIO while enabled', "'H: hitboxes ON + BIO'"],
  ['H on activates debug BIO shield', 'this.activateDebugBioShield(time);'],
  ['H off deactivates debug BIO shield', 'this.deactivateDebugBioShield();'],
  ['debug BIO applies bio power-up', "this.applyPowerUp('bio', DEBUG_BIO_SHIELD_MS);"],
  ['debug BIO pins invulnerability', 'this.invulnerableUntil = this.powerUpUntil;'],
  ['debug BIO refresh path exists', 'private refreshDebugBioShield']
];
let ok = true;
for (const [label, needle] of checks) {
  if (!source.includes(needle)) {
    console.error(`FAIL: ${label}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('PASS: H debug mode grants and maintains BIO immunity');
