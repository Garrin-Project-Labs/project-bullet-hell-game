import fs from 'node:fs';
const source = fs.readFileSync('src/main.ts', 'utf8');
const updateMatch = source.match(/  update\(time: number, delta: number\) \{[\s\S]*?\n  \}\n\n  private addBackground/);
const fireMatch = source.match(/  private firePlayerShot\(time: number\) \{[\s\S]*?\n  \}\n\n  private spawnPlayerShot/);
if (!updateMatch) throw new Error('update method not found');
if (!fireMatch) throw new Error('firePlayerShot method not found');
const updateBody = updateMatch[0];
const fireBody = fireMatch[0];
let ok = true;
if (updateBody.includes('time - this.lastPlayerFire > PLAYER_FIRE_MS')) {
  console.error('FAIL: update loop still applies base fire-rate gate before firePlayerShot can use rapid fire delay');
  ok = false;
}
const expectations = [
  ['spacebar delegates fire-rate gating to firePlayerShot', 'if (!this.levelSevenOrbPhaseActive && this.fireKey.isDown) {'],
  ['rapid power-up lowers the fire delay', "const fireDelay = this.activePowerUp === 'rapid' ? PLAYER_FIRE_MS * 0.65 : PLAYER_FIRE_MS;"],
  ['shot speed upgrade increases projectile velocity', 'BASE_PLAYER_SHOT_SPEED + this.bulletSpeedUpgrades * BULLET_SPEED_UPGRADE'],
  ['rapid power-up also increases projectile velocity', "this.activePowerUp === 'rapid' ? 140 : 0"]
];
for (const [label, needle] of expectations) {
  if (!source.includes(needle) && !fireBody.includes(needle) && !updateBody.includes(needle)) {
    console.error(`FAIL: ${label}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('PASS: shot speed upgrade affects projectile velocity and rapid fire can reduce fire delay');
