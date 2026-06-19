import fs from 'node:fs';

const source = fs.readFileSync('src/main.ts', 'utf8');
const match = source.match(/private spawnEnemyBullet\([\s\S]*?\n  }\n\n  private firePlayerShot/);
if (!match) throw new Error('spawnEnemyBullet method not found');

const body = match[0];
const failures = [];

if (body.includes('this.bullets.get(x, y, radius, color)')) {
  failures.push('Arc pool creation still passes color as startAngle instead of fillColor');
}
if (!body.includes('this.bullets.get(x, y, radius, 0, 360, false, color, 1)')) {
  failures.push('Arc pool creation does not use full-circle constructor args');
}
if (!body.includes('bullet.setStartAngle(0, false);')) {
  failures.push('Reused Arc bullets do not reset start angle');
}
if (!body.includes('bullet.setEndAngle(360, false);')) {
  failures.push('Reused Arc bullets do not reset end angle');
}
if (!body.includes("bullet.setData('assetType', 'Phaser.GameObjects.Arc/full-circle')")) {
  failures.push('Debug metadata does not identify bullet asset type');
}

for (const failure of failures) console.error('FAIL:', failure);
if (failures.length) process.exit(1);

console.log('PASS: enemy bullets construct/reset as full-circle Arc assets with asset metadata');
