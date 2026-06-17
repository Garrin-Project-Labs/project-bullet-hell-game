import Phaser from 'phaser';
import './style.css';

const WIDTH = 800;
const HEIGHT = 600;
const PLAYER_SPEED = 270;
const PLAYER_RADIUS = 10;
const PLAYER_HIT_ELLIPSE_X = 15;
const PLAYER_HIT_ELLIPSE_Y = 21;
const PLAYER_HIT_ELLIPSE_ROTATION = -0.78;
const BULLET_RADIUS = 5;
const GRAZE_RADIUS = 20;
const PLAYER_FIRE_MS = 170;
const BASE_PLAYER_SHOT_SPEED = 440;
const BULLET_SPEED_UPGRADE = 90;
const BULLET_SIZE_UPGRADE = 4;
const SPREAD_CHANCE_UPGRADE = 0.12;
const POWER_UP_DROP_CHANCE = 0.03;
const POWER_UP_TTL_MS = 3000;
const POWER_UP_DURATION_MS = 7000;
const POWER_UP_MIN_GAP_MS = 4000;
const ATTACK_PATTERN_MS = 5000;

type PowerUpKind = 'big' | 'rapid' | 'spread';
type UpgradeKind = 'speed' | 'size' | 'spreadChance';
type AttackPattern = 'ring' | 'burst' | 'heavy' | 'spiral';
type EnemyMovePattern = 'sway' | 'figureEight' | 'hoverDash' | 'drift';

type LevelConfig = {
  name: string;
  background: string;
  enemyColor: number;
  enemyHp: number;
  fireMs: number;
  bulletCount: number;
  bulletSpeed: number;
  spin: number;
};

const LEVELS: LevelConfig[] = [
  {
    name: 'Nebula Gate',
    background: '#080914',
    enemyColor: 0xff4d8d,
    enemyHp: 10,
    fireMs: 760,
    bulletCount: 7,
    bulletSpeed: 85,
    spin: 0.12
  },
  {
    name: 'Emerald Drift',
    background: '#071611',
    enemyColor: 0x43ff91,
    enemyHp: 12,
    fireMs: 720,
    bulletCount: 8,
    bulletSpeed: 94,
    spin: 0.13
  },
  {
    name: 'Violet Shoals',
    background: '#100b20',
    enemyColor: 0xa477ff,
    enemyHp: 14,
    fireMs: 680,
    bulletCount: 8,
    bulletSpeed: 103,
    spin: 0.14
  },
  {
    name: 'Amber Static',
    background: '#171006',
    enemyColor: 0xffb84d,
    enemyHp: 17,
    fireMs: 640,
    bulletCount: 9,
    bulletSpeed: 113,
    spin: 0.15
  },
  {
    name: 'Azure Bloom',
    background: '#061421',
    enemyColor: 0x4dd7ff,
    enemyHp: 20,
    fireMs: 605,
    bulletCount: 10,
    bulletSpeed: 124,
    spin: 0.16
  },
  {
    name: 'Rose Circuit',
    background: '#190718',
    enemyColor: 0xff6bd6,
    enemyHp: 24,
    fireMs: 570,
    bulletCount: 11,
    bulletSpeed: 137,
    spin: 0.17
  },
  {
    name: 'Solar Arcade',
    background: '#1b1305',
    enemyColor: 0xffe066,
    enemyHp: 29,
    fireMs: 535,
    bulletCount: 12,
    bulletSpeed: 151,
    spin: 0.18
  },
  {
    name: 'Neon Undertow',
    background: '#061b1a',
    enemyColor: 0x35ffd1,
    enemyHp: 35,
    fireMs: 500,
    bulletCount: 13,
    bulletSpeed: 166,
    spin: 0.19
  },
  {
    name: 'Prism Break',
    background: '#13091c',
    enemyColor: 0xd36bff,
    enemyHp: 42,
    fireMs: 465,
    bulletCount: 15,
    bulletSpeed: 183,
    spin: 0.2
  },
  {
    name: 'Banana Singularity',
    background: '#1d0708',
    enemyColor: 0xff3355,
    enemyHp: 52,
    fireMs: 430,
    bulletCount: 16,
    bulletSpeed: 201,
    spin: 0.22
  }
]

class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private enemy?: Phaser.GameObjects.Shape | Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private bullets!: Phaser.Physics.Arcade.Group;
  private playerShots!: Phaser.Physics.Arcade.Group;
  private powerUps!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private bossText!: Phaser.GameObjects.Text;
  private patternText!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private upgradeText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private enemyFireEvent?: Phaser.Time.TimerEvent;
  private enemyOverlap?: Phaser.Physics.Arcade.Collider;
  private powerUpOverlap?: Phaser.Physics.Arcade.Collider;

  private hp = 5;
  private score = 0;
  private grazes = 0;
  private wave = 0;
  private levelIndex = 0;
  private enemyHp = 0;
  private invulnerableUntil = 0;
  private lastPlayerFire = 0;
  private gameOver = false;
  private victory = false;
  private levelTransitioning = false;
  private waitingForUpgradeChoice = false;
  private enemyInvulnerableUntil = 0;
  private activePowerUp?: PowerUpKind;
  private powerUpUntil = 0;
  private levelStartedAt = 0;
  private lastPowerUpSpawn = -POWER_UP_MIN_GAP_MS;
  private enemyMovePattern: EnemyMovePattern = 'sway';
  private enemyMoveSeed = 0;
  private bulletSpeedUpgrades = 0;
  private bulletSizeUpgrades = 0;
  private spreadChanceUpgrades = 0;

  constructor() {
    super('main');
  }

  preload() {
    this.load.svg('banana-boss', 'assets/banana-boss.svg', { width: 80, height: 80 });
    this.load.svg('final-boss', 'assets/final-boss.svg', { width: 96, height: 96 });
  }

  create() {
    this.hp = 5;
    this.score = 0;
    this.grazes = 0;
    this.wave = 0;
    this.levelIndex = 0;
    this.enemyHp = 0;
    this.invulnerableUntil = 0;
    this.lastPlayerFire = 0;
    this.gameOver = false;
    this.victory = false;
    this.levelTransitioning = false;
    this.waitingForUpgradeChoice = false;
    this.enemyInvulnerableUntil = 0;
    this.activePowerUp = undefined;
    this.powerUpUntil = 0;
    this.levelStartedAt = 0;
    this.lastPowerUpSpawn = -POWER_UP_MIN_GAP_MS;
    this.enemyMovePattern = 'sway';
    this.enemyMoveSeed = 0;
    this.bulletSpeedUpgrades = 0;
    this.bulletSizeUpgrades = 0;
    this.spreadChanceUpgrades = 0;

    this.addBackground();

    this.player = this.add.image(WIDTH / 2, HEIGHT - 80, 'banana-boss').setScale(0.55);
    this.physics.add.existing(this.player);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(PLAYER_HIT_ELLIPSE_X * 2, PLAYER_HIT_ELLIPSE_Y * 2);
    playerBody.setOffset(40 - PLAYER_HIT_ELLIPSE_X, 40 - PLAYER_HIT_ELLIPSE_Y);
    playerBody.setCollideWorldBounds(true);

    this.bullets = this.physics.add.group({ classType: Phaser.GameObjects.Arc, maxSize: 800 });
    this.playerShots = this.physics.add.group({ classType: Phaser.GameObjects.Rectangle, maxSize: 120 });
    this.powerUps = this.physics.add.group({ classType: Phaser.GameObjects.Arc, maxSize: 1 });

    this.physics.add.overlap(this.player, this.bullets, (_, bullet) => this.checkPlayerBulletHit(bullet as Phaser.GameObjects.Arc));
    this.powerUpOverlap = this.physics.add.overlap(this.player, this.powerUps, (_, powerUp) => this.collectPowerUp(powerUp as Phaser.GameObjects.Arc));

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,R') as Record<string, Phaser.Input.Keyboard.Key>;
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.addCapture([Phaser.Input.Keyboard.KeyCodes.SPACE]);

    this.scoreText = this.add.text(16, 12, '', { fontFamily: 'monospace', fontSize: '18px', color: '#e8f8ff' });
    this.hpText = this.add.text(WIDTH - 16, 12, '', { fontFamily: 'monospace', fontSize: '18px', color: '#e8f8ff' }).setOrigin(1, 0);
    this.levelText = this.add.text(16, 40, '', { fontFamily: 'monospace', fontSize: '16px', color: '#c8f7ff' });
    this.bossText = this.add.text(WIDTH - 16, 40, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffd6e6' }).setOrigin(1, 0);
    this.patternText = this.add.text(WIDTH / 2, 40, '', { fontFamily: 'monospace', fontSize: '14px', color: '#d7ccff' }).setOrigin(0.5, 0);
    this.powerText = this.add.text(WIDTH / 2, 12, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fff0a6' }).setOrigin(0.5, 0);
    this.upgradeText = this.add.text(WIDTH / 2, HEIGHT - 58, '', { fontFamily: 'monospace', fontSize: '13px', color: '#c8f7ff' }).setOrigin(0.5, 0);
    this.helpText = this.add.text(16, HEIGHT - 34, 'Move: WASD/Arrows • Shoot: Space • Restart: R', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#a9bad1'
    });

    this.startLevel(0);
  }

  update(time: number, delta: number) {
    if (Phaser.Input.Keyboard.JustDown(this.wasd.R)) {
      this.scene.restart();
      return;
    }
    if (this.gameOver || this.victory || this.levelTransitioning || this.waitingForUpgradeChoice || !this.enemy) return;

    this.movePlayer(delta);
    this.moveEnemy(time);

    if (this.fireKey.isDown && time - this.lastPlayerFire > PLAYER_FIRE_MS) {
      this.firePlayerShot(time);
    }

    this.syncPowerUpLabels();
    this.expirePowerUp(time);
    this.updateAttackPatternHud();
    this.cleanupOffscreen();
    this.checkGrazes();
  }

  private addBackground() {
    this.cameras.main.setBackgroundColor(LEVELS[0].background);
    for (let i = 0; i < 95; i++) {
      const x = Phaser.Math.Between(0, WIDTH);
      const y = Phaser.Math.Between(0, HEIGHT);
      const alpha = Phaser.Math.FloatBetween(0.18, 0.75);
      const size = Phaser.Math.FloatBetween(0.7, 2.2);
      this.add.circle(x, y, size, 0xffffff, alpha);
    }
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH - 18, HEIGHT - 18).setStrokeStyle(2, 0x28344f, 0.8);
  }

  private startLevel(index: number) {
    this.levelIndex = index;
    this.wave = 0;
    this.levelTransitioning = false;
    this.waitingForUpgradeChoice = false;
    this.levelStartedAt = this.time.now;
    this.pickEnemyMovement();
    this.enemyInvulnerableUntil = this.time.now + 500;

    const level = LEVELS[this.levelIndex];
    this.enemyHp = level.enemyHp;
    this.createEnemyForLevel(level);
    this.cameras.main.setBackgroundColor(level.background);
    this.clearProjectiles();

    this.enemyFireEvent?.remove(false);
    this.enemyFireEvent = this.time.addEvent({ delay: level.fireMs, loop: true, callback: () => this.firePattern() });

    this.showLevelBanner(level);
    this.updateHud();
  }

  private createEnemyForLevel(level: LevelConfig) {
    this.enemyOverlap?.destroy();
    this.enemy?.destroy();

    const shape = this.levelIndex % 4;
    if (shape === 0) {
      this.enemy = this.add.triangle(WIDTH / 2, 85, 0, 34, 26, 0, 52, 34, level.enemyColor, 1);
    } else if (shape === 1) {
      this.enemy = this.add.rectangle(WIDTH / 2, 85, 50, 50, level.enemyColor, 1).setRotation(Math.PI / 4);
    } else if (shape === 2) {
      this.enemy = this.add.circle(WIDTH / 2, 85, 28, level.enemyColor, 1);
    } else if (this.levelIndex === LEVELS.length - 1) {
      this.enemy = this.add.image(WIDTH / 2, 88, 'final-boss').setScale(0.92);
    } else {
      this.enemy = this.add.star(WIDTH / 2, 85, 5, 18, 34, level.enemyColor, 1);
    }

    this.setEnemyStroke();
    this.physics.add.existing(this.enemy);
    const body = this.enemy.body as Phaser.Physics.Arcade.Body;
    if (this.enemy instanceof Phaser.GameObjects.Image) {
      body.setSize(46, 80);
      body.setOffset(25, 10);
    }
    body.setImmovable(true);
    body.setAllowGravity(false);
    this.enemyOverlap = this.physics.add.overlap(this.enemy, this.playerShots, (_, shot) => this.hitEnemy(shot as Phaser.GameObjects.Rectangle));
  }

  private setEnemyStroke() {
    if (this.enemy instanceof Phaser.GameObjects.Shape) {
      this.enemy.setStrokeStyle(2, 0xffffff, 0.7);
    }
  }

  private setEnemyFill(color: number) {
    if (this.enemy instanceof Phaser.GameObjects.Shape) {
      this.enemy.setFillStyle(color, 1);
    }
  }

  private flashEnemyHit() {
    if (!this.enemy) return;
    if (this.enemy instanceof Phaser.GameObjects.Shape) {
      this.enemy.setFillStyle(0xffffff, 1);
    } else {
      this.enemy.setTint(0xffffff);
    }
  }

  private resetEnemyVisual() {
    if (!this.enemy) return;
    if (this.enemy instanceof Phaser.GameObjects.Shape) {
      this.enemy.setFillStyle(LEVELS[this.levelIndex].enemyColor, 1);
    } else {
      this.enemy.clearTint();
    }
  }

  private showLevelBanner(level: LevelConfig) {
    const banner = this.add.text(WIDTH / 2, HEIGHT / 2 - 110, `LEVEL ${this.levelIndex + 1}: ${level.name}`, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);

    this.tweens.add({
      targets: banner,
      y: banner.y - 24,
      alpha: 0,
      delay: 700,
      duration: 650,
      onComplete: () => banner.destroy()
    });
  }

  private movePlayer(delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left?.isDown || this.wasd.A.isDown;
    const right = this.cursors.right?.isDown || this.wasd.D.isDown;
    const up = this.cursors.up?.isDown || this.wasd.W.isDown;
    const down = this.cursors.down?.isDown || this.wasd.S.isDown;

    const velocity = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));
    if (velocity.lengthSq() > 0) velocity.normalize().scale(PLAYER_SPEED);
    body.setVelocity(velocity.x, velocity.y);

    const flicker = this.time.now < this.invulnerableUntil && Math.floor(this.time.now / 80) % 2 === 0;
    this.player.setAlpha(flicker ? 0.35 : 1);
  }

  private pickEnemyMovement() {
    const patterns: EnemyMovePattern[] = ['sway', 'figureEight', 'hoverDash', 'drift'];
    this.enemyMovePattern = Phaser.Utils.Array.GetRandom(patterns);
    this.enemyMoveSeed = Phaser.Math.FloatBetween(0, Math.PI * 2);
  }

  private moveEnemy(time: number) {
    const level = LEVELS[this.levelIndex];
    if (!this.enemy) return;

    const t = (time - this.levelStartedAt) / 1000;
    const phase = t + this.enemyMoveSeed;
    let x = WIDTH / 2;
    let y = 82;

    switch (this.enemyMovePattern) {
      case 'sway':
        x += Math.sin(phase * (1.05 + this.levelIndex * 0.12)) * (190 + this.levelIndex * 18);
        y += Math.sin(phase * 1.7) * (10 + this.levelIndex * 3);
        break;
      case 'figureEight':
        x += Math.sin(phase * 1.15) * (170 + this.levelIndex * 22);
        y += Math.sin(phase * 2.3) * (22 + this.levelIndex * 4);
        break;
      case 'hoverDash':
        x += Math.tanh(Math.sin(phase * 0.9) * 2.8) * (205 + this.levelIndex * 20);
        y += Math.cos(phase * 2.1) * (12 + this.levelIndex * 4);
        break;
      case 'drift':
        x += Math.sin(phase * 0.85) * (145 + this.levelIndex * 20) + Math.sin(phase * 2.4) * 42;
        y += Math.cos(phase * 1.25) * (18 + this.levelIndex * 5);
        break;
    }

    this.enemy.x = Phaser.Math.Clamp(x, 70, WIDTH - 70);
    this.enemy.y = Phaser.Math.Clamp(y, 58, 145);
    if (!(this.enemy instanceof Phaser.GameObjects.Image)) {
      this.enemy.rotation += 0.002 + this.levelIndex * 0.001;
    }
    this.setEnemyFill(level.enemyColor);
    (this.enemy.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
  }

  private firePattern() {
    if (this.gameOver || this.victory) return;
    this.wave++;

    const level = LEVELS[this.levelIndex];
    if (!this.enemy || this.levelTransitioning) return;

    const pattern = this.currentAttackPattern();
    const base = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y, this.player.x, this.player.y);
    const speed = level.bulletSpeed + Math.min(25, this.score * 0.35);

    switch (pattern) {
      case 'ring':
        this.fireRingPattern(level, base, speed);
        break;
      case 'burst':
        this.fireBurstPattern(level, base, speed);
        break;
      case 'heavy':
        this.fireHeavyPattern(level, speed);
        break;
      case 'spiral':
        this.fireSpiralPattern(level, speed);
        break;
    }
  }

  private currentAttackPattern(): AttackPattern {
    const patterns: AttackPattern[] = ['ring', 'burst', 'heavy', 'spiral'];
    const elapsed = Math.max(0, this.time.now - this.levelStartedAt);
    return patterns[Math.floor(elapsed / ATTACK_PATTERN_MS) % patterns.length];
  }

  private fireRingPattern(level: LevelConfig, base: number, speed: number) {
    const scoreBoost = Math.min(3, Math.floor(this.score / 28));
    const count = level.bulletCount + scoreBoost;
    const spin = this.wave * level.spin;

    for (let i = 0; i < count; i++) {
      const angle = base + spin + (Math.PI * 2 * i) / count;
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 18, angle, speed, 0xffd166);
    }
  }

  private fireBurstPattern(level: LevelConfig, base: number, speed: number) {
    const fanCount = Math.min(8, 4 + Math.floor(this.levelIndex / 2));
    const spread = 0.55 + Math.min(0.45, this.levelIndex * 0.05);
    for (let i = 0; i < fanCount; i++) {
      const offset = Phaser.Math.Linear(-spread, spread, fanCount === 1 ? 0.5 : i / (fanCount - 1));
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 22, base + offset, speed + 75, level.enemyColor);
    }

    if (this.wave % 2 === 0) {
      const side = this.wave % 4 === 0 ? -1 : 1;
      for (let i = 0; i < 4; i++) {
        this.spawnEnemyBullet(this.enemy!.x + side * 26, this.enemy!.y + 16, base + side * (0.35 + i * 0.12), speed + 35, 0xffd166);
      }
    }
  }

  private fireHeavyPattern(level: LevelConfig, speed: number) {
    const lanes = this.levelIndex < 3 ? [0] : this.levelIndex < 6 ? [-38, 38] : [-56, 0, 56];
    for (const offset of lanes) {
      const wobble = Math.sin((this.wave + offset) * 0.8) * 0.08;
      this.spawnEnemyBullet(this.enemy!.x + offset, this.enemy!.y + 30, Math.PI / 2 + wobble, speed * 0.62, level.enemyColor, BULLET_RADIUS * 2.2);
    }

    if (this.wave % 3 === 0) {
      const aimed = Phaser.Math.Angle.Between(this.enemy!.x, this.enemy!.y, this.player.x, this.player.y);
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 22, aimed, speed * 0.85, 0xffffff, BULLET_RADIUS * 1.7);
    }
  }

  private fireSpiralPattern(level: LevelConfig, speed: number) {
    const arms = Math.min(5, 2 + Math.floor(this.levelIndex / 3));
    const spin = this.wave * (0.42 + this.levelIndex * 0.08);
    for (let i = 0; i < arms; i++) {
      const angle = spin + (Math.PI * 2 * i) / arms;
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 18, angle, speed + 25, i % 2 === 0 ? 0xffd166 : level.enemyColor);
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 18, angle + Math.PI, speed * 0.78, 0x7cf7ff);
    }
  }

  private spawnEnemyBullet(x: number, y: number, angle: number, speed: number, color: number, radius = BULLET_RADIUS) {
    const bullet = this.bullets.get(x, y, BULLET_RADIUS, color) as Phaser.GameObjects.Arc | null;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true).setData('grazed', false);
    bullet.setFillStyle(color, 1);
    bullet.setStrokeStyle(1, 0xffffff, radius > BULLET_RADIUS ? 0.65 : 0.45);
    bullet.setScale(radius / BULLET_RADIUS);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setCircle(radius);
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private firePlayerShot(time: number) {
    const fireDelay = this.activePowerUp === 'rapid' ? PLAYER_FIRE_MS * 0.65 : PLAYER_FIRE_MS;
    if (time - this.lastPlayerFire < fireDelay) return;
    this.lastPlayerFire = time;

    const width = 8 + this.bulletSizeUpgrades * BULLET_SIZE_UPGRADE + (this.activePowerUp === 'big' ? 8 : 0);
    const height = 22 + this.bulletSizeUpgrades * (BULLET_SIZE_UPGRADE + 2) + (this.activePowerUp === 'big' ? 12 : 0);
    const speed = -(BASE_PLAYER_SHOT_SPEED + this.bulletSpeedUpgrades * BULLET_SPEED_UPGRADE + (this.activePowerUp === 'rapid' ? 140 : 0));
    const spreadChance = Math.min(0.45, this.spreadChanceUpgrades * SPREAD_CHANCE_UPGRADE);
    const shouldSpread = this.activePowerUp === 'spread' || Phaser.Math.FloatBetween(0, 1) < spreadChance;

    if (shouldSpread) {
      this.spawnPlayerShot(this.player.x - 8, this.player.y - 18, -95, speed * 0.93, width, height);
      this.spawnPlayerShot(this.player.x, this.player.y - 20, 0, speed, width, height);
      this.spawnPlayerShot(this.player.x + 8, this.player.y - 18, 95, speed * 0.93, width, height);
      return;
    }

    this.spawnPlayerShot(this.player.x, this.player.y - 18, 0, speed, width, height);
  }

  private spawnPlayerShot(x: number, y: number, velocityX: number, velocityY: number, width = 8, height = 22) {
    const shot = this.playerShots.get(x, y, width, height, 0x9cff6a) as Phaser.GameObjects.Rectangle | null;
    if (!shot) return;
    shot.setActive(true).setVisible(true);
    shot.setFillStyle(0x9cff6a, 1);
    shot.setStrokeStyle(1, 0xffffff, 0.7);
    const body = shot.body as Phaser.Physics.Arcade.Body;
    body.setSize(width, height);
    body.setVelocity(velocityX, velocityY);
  }

  private hitEnemy(shot: Phaser.GameObjects.Rectangle) {
    if (this.gameOver || this.victory || this.levelTransitioning || this.waitingForUpgradeChoice || !this.enemy) return;

    shot.destroy();
    if (this.time.now < this.enemyInvulnerableUntil) return;
    this.enemyHp--;
    this.score++;
    this.maybeSpawnPowerUp(this.enemy.x, this.enemy.y);
    this.flashEnemyHit();
    this.tweens.add({
      targets: this.enemy,
      scaleX: 1.12,
      scaleY: 1.12,
      yoyo: true,
      duration: 35
    });
    this.time.delayedCall(55, () => this.resetEnemyVisual());
    this.updateHud();

    if (this.enemyHp <= 0) this.defeatEnemy();
  }

  private defeatEnemy() {
    if (this.levelTransitioning || !this.enemy) return;
    this.levelTransitioning = true;
    const defeatedLevel = this.levelIndex;
    const nextLevel = defeatedLevel + 1;
    const defeatedEnemy = this.enemy;
    const explosionX = defeatedEnemy.x;
    const explosionY = defeatedEnemy.y;

    this.score += 10 * (defeatedLevel + 1);
    this.enemyHp = 0;
    this.enemyFireEvent?.remove(false);
    this.enemyOverlap?.destroy();
    this.enemyOverlap = undefined;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const enemyBody = defeatedEnemy.body as Phaser.Physics.Arcade.Body | null;
    enemyBody?.setEnable(false);
    defeatedEnemy.setActive(false);
    this.clearProjectiles();
    this.cameras.main.shake(160, 0.004);
    this.updateHud();
    this.playEnemyExplosion(explosionX, explosionY, LEVELS[defeatedLevel].enemyColor);

    const message = nextLevel < LEVELS.length ? 'CHOOSE AN UPGRADE TO CONTINUE' : 'FINAL BOSS DEFEATED';
    const transitionText = this.add.text(WIDTH / 2, HEIGHT / 2 + 48, message, {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);

    this.tweens.add({ targets: transitionText, alpha: 0.25, yoyo: true, repeat: -1, duration: 350 });

    this.time.delayedCall(750, () => {
      transitionText.destroy();
      defeatedEnemy.destroy();
      if (nextLevel < LEVELS.length) {
        this.showUpgradeChoices(nextLevel);
      } else {
        this.endVictory();
      }
    });
  }

  private showUpgradeChoices(nextLevel: number) {
    this.waitingForUpgradeChoice = true;
    this.levelTransitioning = true;
    this.clearProjectiles();
    const panel = this.add.rectangle(0, 0, 650, 250, 0x050714, 0.94).setStrokeStyle(2, 0x7cf7ff, 0.85);
    const title = this.add.text(0, -92, 'CHOOSE A POWER-UP', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);
    const hint = this.add.text(0, -60, 'Click a card or press 1 / 2 / 3', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#a9bad1'
    }).setOrigin(0.5);

    const overlay = this.add.container(WIDTH / 2, HEIGHT / 2, [panel, title, hint]);
    const choices: Array<{ kind: UpgradeKind; title: string; description: string; color: number }> = [
      { kind: 'speed', title: 'Faster Bullets', description: '+ projectile speed', color: 0x7cf7ff },
      { kind: 'size', title: 'Larger Bullets', description: '+ shot size', color: 0xffd166 },
      { kind: 'spreadChance', title: 'Spread Chance', description: '+12% chance to split', color: 0xc77dff }
    ];

    let chosen = false;
    const choose = (kind: UpgradeKind) => {
      if (chosen) return;
      chosen = true;
      this.applyUpgrade(kind);
      this.input.keyboard?.off('keydown-ONE');
      this.input.keyboard?.off('keydown-TWO');
      this.input.keyboard?.off('keydown-THREE');
      this.waitingForUpgradeChoice = false;
      overlay.destroy();
      this.startLevel(nextLevel);
    };

    choices.forEach((choice, index) => {
      const x = -210 + index * 210;
      const card = this.add.rectangle(x, 36, 180, 120, 0x11182a, 0.98)
        .setStrokeStyle(2, choice.color, 0.9)
        .setInteractive({ useHandCursor: true });
      const number = this.add.text(x - 76, -12, `${index + 1}`, { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
      const cardTitle = this.add.text(x, 20, choice.title, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      const description = this.add.text(x, 48, choice.description, { fontFamily: 'monospace', fontSize: '13px', color: '#a9bad1' }).setOrigin(0.5);
      card.on('pointerdown', () => choose(choice.kind));
      card.on('pointerover', () => card.setFillStyle(0x1c2742, 1));
      card.on('pointerout', () => card.setFillStyle(0x11182a, 0.98));
      overlay.add([card, number, cardTitle, description]);
    });

    this.input.keyboard?.once('keydown-ONE', () => choose('speed'));
    this.input.keyboard?.once('keydown-TWO', () => choose('size'));
    this.input.keyboard?.once('keydown-THREE', () => choose('spreadChance'));
  }

  private applyUpgrade(kind: UpgradeKind) {
    if (kind === 'speed') this.bulletSpeedUpgrades++;
    if (kind === 'size') this.bulletSizeUpgrades++;
    if (kind === 'spreadChance') this.spreadChanceUpgrades++;
    this.updateHud();
  }

  private playEnemyExplosion(x: number, y: number, color: number) {
    this.enemy?.setVisible(false);

    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18;
      const distance = Phaser.Math.Between(36, 86);
      const shard = this.add.circle(x, y, Phaser.Math.Between(3, 7), i % 3 === 0 ? 0xffffff : color, 0.95);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        duration: 650,
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy()
      });
    }

    const ring = this.add.circle(x, y, 14, color, 0).setStrokeStyle(3, color, 0.9);
    this.tweens.add({
      targets: ring,
      scale: 5,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  private checkPlayerBulletHit(bullet: Phaser.GameObjects.Arc) {
    if (this.time.now < this.invulnerableUntil || this.gameOver || this.victory) return;
    if (!this.isBulletTouchingBanana(bullet)) return;
    this.hitByBullet(bullet);
  }

  private isBulletTouchingBanana(bullet: Phaser.GameObjects.Arc) {
    const dx = bullet.x - this.player.x;
    const dy = bullet.y - this.player.y;
    const cos = Math.cos(PLAYER_HIT_ELLIPSE_ROTATION);
    const sin = Math.sin(PLAYER_HIT_ELLIPSE_ROTATION);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const radius = BULLET_RADIUS;
    const normalized =
      (localX * localX) / Math.pow(PLAYER_HIT_ELLIPSE_X + radius, 2) +
      (localY * localY) / Math.pow(PLAYER_HIT_ELLIPSE_Y + radius, 2);

    return normalized <= 1;
  }

  private hitByBullet(bullet: Phaser.GameObjects.Arc) {
    bullet.destroy();
    this.hp--;
    this.invulnerableUntil = this.time.now + 1100;
    this.cameras.main.shake(120, 0.008);
    this.updateHud();
    if (this.hp <= 0) this.endGame();
  }

  private checkGrazes() {
    for (const obj of this.bullets.getChildren()) {
      const bullet = obj as Phaser.GameObjects.Arc;
      if (!bullet.active || bullet.getData('grazed')) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, bullet.x, bullet.y);
      if (dist > PLAYER_RADIUS + BULLET_RADIUS && dist < GRAZE_RADIUS) {
        bullet.setData('grazed', true);
        this.grazes++;
        this.score += 2;
        this.spawnGrazeText(bullet.x, bullet.y);
        this.updateHud();
      }
    }
  }

  private spawnGrazeText(x: number, y: number) {
    const text = this.add.text(x, y, '+graze', { fontFamily: 'monospace', fontSize: '12px', color: '#7cf7ff' }).setOrigin(0.5);
    this.tweens.add({ targets: text, y: y - 18, alpha: 0, duration: 450, onComplete: () => text.destroy() });
  }

  private maybeSpawnPowerUp(x: number, y: number) {
    if (
      this.levelTransitioning ||
      this.powerUps.countActive(true) > 0 ||
      this.time.now - this.lastPowerUpSpawn < POWER_UP_MIN_GAP_MS ||
      Phaser.Math.FloatBetween(0, 1) > POWER_UP_DROP_CHANCE
    ) return;

    const kinds: PowerUpKind[] = ['big', 'rapid', 'spread'];
    const kind = Phaser.Utils.Array.GetRandom(kinds);
    const colors: Record<PowerUpKind, number> = { big: 0xffd166, rapid: 0x7cf7ff, spread: 0xc77dff };
    const powerUp = this.powerUps.get(
      Phaser.Math.Clamp(x + Phaser.Math.Between(-120, 120), 70, WIDTH - 70),
      Phaser.Math.Clamp(y + Phaser.Math.Between(70, 240), 110, HEIGHT - 120),
      12,
      colors[kind]
    ) as Phaser.GameObjects.Arc | null;

    if (!powerUp) return;
    this.lastPowerUpSpawn = this.time.now;
    powerUp.setActive(true).setVisible(true).setData('kind', kind);
    powerUp.setFillStyle(colors[kind], 0.98);
    powerUp.setStrokeStyle(2, 0xffffff, 0.95);
    powerUp.setScale(1);
    const body = powerUp.body as Phaser.Physics.Arcade.Body;
    body.setCircle(12).setAllowGravity(false).setVelocity(0, 30);

    const glow = this.add.circle(powerUp.x, powerUp.y, 22, colors[kind], 0.24).setBlendMode(Phaser.BlendModes.ADD);
    const halo = this.add.circle(powerUp.x, powerUp.y, 15, colors[kind], 0).setStrokeStyle(3, colors[kind], 0.7).setBlendMode(Phaser.BlendModes.ADD);
    powerUp.setData('glow', glow);
    powerUp.setData('halo', halo);

    const glyphs: Record<PowerUpKind, string> = { big: '+', rapid: 'R', spread: 'S' };
    const label = this.add.text(powerUp.x, powerUp.y, glyphs[kind], {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#1b1020'
    }).setOrigin(0.5);
    powerUp.setData('label', label);

    this.tweens.add({ targets: powerUp, scale: 1.16, yoyo: true, repeat: -1, duration: 420 });
    this.tweens.add({ targets: glow, scale: 1.45, alpha: 0.08, yoyo: true, repeat: -1, duration: 520 });
    this.tweens.add({ targets: halo, scale: 1.35, alpha: 0.12, yoyo: true, repeat: -1, duration: 520 });
    this.time.delayedCall(POWER_UP_TTL_MS, () => {
      if (powerUp.active) this.destroyPowerUp(powerUp);
    });
  }

  private collectPowerUp(powerUp: Phaser.GameObjects.Arc) {
    const kind = powerUp.getData('kind') as PowerUpKind;
    this.destroyPowerUp(powerUp);
    this.activePowerUp = kind;
    this.powerUpUntil = this.time.now + POWER_UP_DURATION_MS;
    this.spawnPowerUpText(kind);
    this.updateHud();
  }

  private destroyPowerUp(powerUp: Phaser.GameObjects.Arc) {
    const label = powerUp.getData('label') as Phaser.GameObjects.Text | undefined;
    const glow = powerUp.getData('glow') as Phaser.GameObjects.Arc | undefined;
    const halo = powerUp.getData('halo') as Phaser.GameObjects.Arc | undefined;
    label?.destroy();
    glow?.destroy();
    halo?.destroy();
    powerUp.destroy();
  }

  private spawnPowerUpText(kind: PowerUpKind) {
    const labels: Record<PowerUpKind, string> = { big: 'BIG SHOTS', rapid: 'RAPID FIRE', spread: 'SPREAD SHOT' };
    const text = this.add.text(this.player.x, this.player.y - 34, labels[kind], {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#fff0a6',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.tweens.add({ targets: text, y: text.y - 24, alpha: 0, duration: 700, onComplete: () => text.destroy() });
  }

  private syncPowerUpLabels() {
    for (const obj of this.powerUps.getChildren()) {
      const powerUp = obj as Phaser.GameObjects.Arc;
      const label = powerUp.getData('label') as Phaser.GameObjects.Text | undefined;
      const glow = powerUp.getData('glow') as Phaser.GameObjects.Arc | undefined;
      const halo = powerUp.getData('halo') as Phaser.GameObjects.Arc | undefined;
      label?.setPosition(powerUp.x, powerUp.y);
      glow?.setPosition(powerUp.x, powerUp.y);
      halo?.setPosition(powerUp.x, powerUp.y);
    }
  }

  private expirePowerUp(time: number) {
    if (!this.activePowerUp) return;

    if (time >= this.powerUpUntil) {
      this.activePowerUp = undefined;
      this.powerUpUntil = 0;
      this.updateHud();
      return;
    }

    this.updatePowerUpHud();
  }

  private updatePowerUpHud() {
    if (!this.activePowerUp) {
      this.powerText?.setText('');
      return;
    }

    const seconds = Math.max(0, Math.ceil((this.powerUpUntil - this.time.now) / 1000));
    const labels: Record<PowerUpKind, string> = { big: 'Big Shots', rapid: 'Rapid Fire', spread: 'Spread Shot' };
    this.powerText?.setText(`${labels[this.activePowerUp]} ${seconds}s`);
  }

  private updateAttackPatternHud() {
    if (this.gameOver || this.victory || this.levelTransitioning || this.waitingForUpgradeChoice) {
      this.patternText?.setText('');
      return;
    }

    const patternLabels: Record<AttackPattern, string> = { ring: 'Circle Pattern', burst: 'Burst Fan', heavy: 'Heavy Drop', spiral: 'Spiral Crossfire' };
    this.patternText?.setText(patternLabels[this.currentAttackPattern()]);
  }

  private cleanupOffscreen() {
    const kill = (obj: Phaser.GameObjects.GameObject) => {
      const item = obj as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
      if (item.x < -60 || item.x > WIDTH + 60 || item.y < -80 || item.y > HEIGHT + 80) obj.destroy();
    };
    this.bullets.getChildren().forEach(kill);
    this.playerShots.getChildren().forEach(kill);
  }

  private clearProjectiles() {
    this.bullets?.clear(true, true);
    this.playerShots?.clear(true, true);
    this.clearPowerUps();
  }

  private clearPowerUps() {
    for (const obj of [...this.powerUps.getChildren()]) {
      this.destroyPowerUp(obj as Phaser.GameObjects.Arc);
    }
  }

  private updateHud() {
    const level = LEVELS[this.levelIndex];
    this.scoreText?.setText(`Score ${this.score}  Grazes ${this.grazes}`);
    this.hpText?.setText(`HP ${'♥'.repeat(Math.max(0, this.hp))}`);
    this.levelText?.setText(`Level ${this.levelIndex + 1}/${LEVELS.length}: ${level.name}`);
    this.bossText?.setText(`Boss HP ${Math.max(0, this.enemyHp)}/${level.enemyHp}`);
    this.updateAttackPatternHud();
    this.updatePowerUpHud();
    const spreadPct = Math.round(Math.min(0.45, this.spreadChanceUpgrades * SPREAD_CHANCE_UPGRADE) * 100);
    this.upgradeText?.setText(`Upgrades: Speed +${this.bulletSpeedUpgrades}  Size +${this.bulletSizeUpgrades}  Spread ${spreadPct}%`);
  }

  private endGame() {
    this.gameOver = true;
    this.enemyFireEvent?.remove(false);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.player.setTint(0xff3355);

    const panel = this.add.rectangle(0, 0, 430, 190, 0x050714, 0.92).setStrokeStyle(2, 0x7cf7ff, 0.8);
    const title = this.add.text(0, -58, 'GAME OVER', { fontFamily: 'monospace', fontSize: '36px', color: '#ff5d73' }).setOrigin(0.5);
    const stats = this.add.text(0, -8, `Score: ${this.score}   Grazes: ${this.grazes}`, { fontFamily: 'monospace', fontSize: '18px', color: '#e8f8ff' }).setOrigin(0.5);
    const restart = this.add.text(0, 44, 'Press R to restart', { fontFamily: 'monospace', fontSize: '17px', color: '#a9bad1' }).setOrigin(0.5);
    this.overlay = this.add.container(WIDTH / 2, HEIGHT / 2, [panel, title, stats, restart]);
  }

  private endVictory() {
    this.victory = true;
    this.enemyFireEvent?.remove(false);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.enemy?.setVisible(false).setActive(false);

    const panel = this.add.rectangle(0, 0, 480, 210, 0x050714, 0.92).setStrokeStyle(2, 0x9cff6a, 0.9);
    const title = this.add.text(0, -66, 'VICTORY!', { fontFamily: 'monospace', fontSize: '38px', color: '#9cff6a' }).setOrigin(0.5);
    const stats = this.add.text(0, -10, `Final Score: ${this.score}   Grazes: ${this.grazes}`, { fontFamily: 'monospace', fontSize: '18px', color: '#e8f8ff' }).setOrigin(0.5);
    const restart = this.add.text(0, 50, 'Press R to play again', { fontFamily: 'monospace', fontSize: '17px', color: '#a9bad1' }).setOrigin(0.5);
    this.overlay = this.add.container(WIDTH / 2, HEIGHT / 2, [panel, title, stats, restart]);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: MainScene,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
});
