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
if (!source.includes('private configureEnemyBullet')) {
  failures.push('Enemy bullet setup is not centralized');
}
if (!source.includes('bullet.setStartAngle(0, false);')) {
  failures.push('Arc bullets do not reset start angle');
}
if (!source.includes('bullet.setEndAngle(360, false);')) {
  failures.push('Arc bullets do not reset end angle');
}
if (!source.includes("bullet.setData('assetType', assetType)")) {
  failures.push('Debug metadata does not identify bullet asset type');
}
if (!source.includes('private spawnFreshEnemyBullet')) {
  failures.push('No fresh-spawn bypass exists for isolating group pool reuse bugs');
}
if (!source.includes('private spawnLevelSevenBossOrb')) {
  failures.push('Level 7 normal boss bullets do not have an isolated spawn path');
}
if (!source.includes('Phaser.GameObjects.Ellipse/full-circle/fresh')) {
  failures.push('Level 7 normal boss bullets do not report isolated ellipse asset metadata');
}
if (!source.includes('level7-boss-large-orb')) {
  failures.push('Level 7 normal boss bullets are not labelled');
}

for (const failure of failures) console.error('FAIL:', failure);
if (failures.length) process.exit(1);

console.log('PASS: enemy bullets construct/reset as full-circle Arc assets with asset metadata');
