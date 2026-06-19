import fs from 'node:fs';
const source = fs.readFileSync('src/main.ts', 'utf8');
const match = source.match(/private spawnEnemyBullet\([\s\S]*?\n  }\n\n  private firePlayerShot/);
if (!match) throw new Error('spawnEnemyBullet method not found');
const body = match[0];
const methodExpectations = [
  ['visible radius uses requested radius directly', 'const visibleRadius = radius;'],
  ['group get uses requested radius', 'this.bullets.get(x, y, radius, color)'],
  ['body circle offset centers on resized arc', 'const hitOffset = visibleRadius - hitRadius;'],
  ['setCircle receives explicit offset', 'body.setCircle(hitRadius, hitOffset, hitOffset);']
];
const sourceExpectations = [
  ['level 7 normal pattern only uses large orb bullets', 'LEVEL_SEVEN_PHASE_BULLET_RADIUS'],
  ['final boss heavy pattern leaves a lane gap', 'private fireFinalBossGapPattern'],
  ['final boss skips the chosen gap lane', 'if (lane === gapLane) continue;'],
  ['world bounds start at playable top border', 'this.physics.world.setBounds(PLAY_X, PLAY_TOP, GAME_WIDTH, HEIGHT - PLAY_TOP);'],
  ['player body uses full sprite bounds for world collision', 'playerBody.setSize(80, 80);']
];
let ok = true;
for (const [label, needle] of methodExpectations) {
  if (!body.includes(needle)) {
    console.error(`FAIL: ${label}`);
    ok = false;
  }
}
for (const [label, needle] of sourceExpectations) {
  if (!source.includes(needle)) {
    console.error(`FAIL: ${label}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('PASS: bullet sizing, level 7 large-orb-only pattern, and final boss gap lane are in place');
