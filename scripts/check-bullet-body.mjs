import fs from 'node:fs';
const source = fs.readFileSync('src/main.ts', 'utf8');
const match = source.match(/private spawnEnemyBullet\([\s\S]*?\n  }\n\n  private firePlayerShot/);
if (!match) throw new Error('spawnEnemyBullet method not found');
const body = match[0];
const expectations = [
  ['visible radius uses requested radius directly', 'const visibleRadius = radius;'],
  ['group get uses requested radius', 'this.bullets.get(x, y, radius, color)'],
  ['body circle offset centers on resized arc', 'const hitOffset = visibleRadius - hitRadius;'],
  ['setCircle receives explicit offset', 'body.setCircle(hitRadius, hitOffset, hitOffset);']
];
let ok = true;
for (const [label, needle] of expectations) {
  if (!body.includes(needle)) {
    console.error(`FAIL: ${label}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('PASS: enemy bullet visual radius and physics hitbox are reset together');
