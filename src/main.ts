import Phaser from 'phaser';
import './style.css';

const WIDTH = 800;
const HEIGHT = 600;
const PLAYER_SPEED = 270;
const PLAYER_RADIUS = 10;
const BULLET_RADIUS = 5;
const GRAZE_RADIUS = 20;
const PLAYER_FIRE_MS = 110;

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
    enemyHp: 12,
    fireMs: 560,
    bulletCount: 14,
    bulletSpeed: 105,
    spin: 0.18
  },
  {
    name: 'Emerald Drift',
    background: '#071611',
    enemyColor: 0x43ff91,
    enemyHp: 18,
    fireMs: 470,
    bulletCount: 18,
    bulletSpeed: 135,
    spin: 0.25
  },
  {
    name: 'Crimson Core',
    background: '#18070c',
    enemyColor: 0xff5d73,
    enemyHp: 26,
    fireMs: 390,
    bulletCount: 22,
    bulletSpeed: 165,
    spin: 0.32
  }
];

class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private enemy!: Phaser.GameObjects.Triangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private bullets!: Phaser.Physics.Arcade.Group;
  private playerShots!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private bossText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private enemyFireEvent?: Phaser.Time.TimerEvent;

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

  constructor() {
    super('main');
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

    this.addBackground();

    this.player = this.add.circle(WIDTH / 2, HEIGHT - 80, PLAYER_RADIUS, 0x7cf7ff, 1);
    this.player.setStrokeStyle(3, 0xffffff, 1);
    this.physics.add.existing(this.player);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setCircle(PLAYER_RADIUS);
    playerBody.setCollideWorldBounds(true);

    this.enemy = this.add.triangle(WIDTH / 2, 85, 0, 34, 26, 0, 52, 34, LEVELS[0].enemyColor, 1);
    this.enemy.setStrokeStyle(2, 0xffffff, 0.7);
    this.physics.add.existing(this.enemy);
    (this.enemy.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    this.bullets = this.physics.add.group({ classType: Phaser.GameObjects.Arc, maxSize: 800 });
    this.playerShots = this.physics.add.group({ classType: Phaser.GameObjects.Rectangle, maxSize: 90 });

    this.physics.add.overlap(this.player, this.bullets, (_, bullet) => this.hitByBullet(bullet as Phaser.GameObjects.Arc));
    this.physics.add.overlap(this.enemy, this.playerShots, (_, shot) => this.hitEnemy(shot as Phaser.GameObjects.Rectangle));

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,R') as Record<string, Phaser.Input.Keyboard.Key>;
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.addCapture([Phaser.Input.Keyboard.KeyCodes.SPACE]);

    this.scoreText = this.add.text(16, 12, '', { fontFamily: 'monospace', fontSize: '18px', color: '#e8f8ff' });
    this.hpText = this.add.text(WIDTH - 16, 12, '', { fontFamily: 'monospace', fontSize: '18px', color: '#e8f8ff' }).setOrigin(1, 0);
    this.levelText = this.add.text(16, 40, '', { fontFamily: 'monospace', fontSize: '16px', color: '#c8f7ff' });
    this.bossText = this.add.text(WIDTH - 16, 40, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffd6e6' }).setOrigin(1, 0);
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
    if (this.gameOver || this.victory) return;

    this.movePlayer(delta);
    this.moveEnemy(time);

    if (this.fireKey.isDown && time - this.lastPlayerFire > PLAYER_FIRE_MS) {
      this.firePlayerShot(time);
    }

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

    const level = LEVELS[this.levelIndex];
    this.enemyHp = level.enemyHp;
    this.enemy.setActive(true).setVisible(true);
    this.enemy.setFillStyle(level.enemyColor, 1);
    this.enemy.setPosition(WIDTH / 2, 85);
    this.cameras.main.setBackgroundColor(level.background);
    this.clearProjectiles();

    this.enemyFireEvent?.remove(false);
    this.enemyFireEvent = this.time.addEvent({ delay: level.fireMs, loop: true, callback: () => this.firePattern() });

    this.showLevelBanner(level);
    this.updateHud();
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

  private moveEnemy(time: number) {
    const level = LEVELS[this.levelIndex];
    this.enemy.x = WIDTH / 2 + Math.sin(time / (900 - this.levelIndex * 120)) * (230 + this.levelIndex * 25);
    this.enemy.y = 82 + Math.sin(time / 500) * (12 + this.levelIndex * 4);
    this.enemy.rotation += 0.002 + this.levelIndex * 0.001;
    this.enemy.setFillStyle(level.enemyColor, 1);
    (this.enemy.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
  }

  private firePattern() {
    if (this.gameOver || this.victory) return;
    this.wave++;

    const level = LEVELS[this.levelIndex];
    const base = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y, this.player.x, this.player.y);
    const scoreBoost = Math.min(8, Math.floor(this.score / 18));
    const count = level.bulletCount + scoreBoost;
    const speed = level.bulletSpeed + Math.min(60, this.score);
    const spin = this.wave * level.spin;

    for (let i = 0; i < count; i++) {
      const angle = base + spin + (Math.PI * 2 * i) / count;
      this.spawnEnemyBullet(this.enemy.x, this.enemy.y + 18, angle, speed, 0xffd166);
    }

    if (this.wave % 3 === 0) {
      for (let i = -2; i <= 2; i++) {
        this.spawnEnemyBullet(this.enemy.x, this.enemy.y + 18, base + i * 0.12, speed + 90, level.enemyColor);
      }
    }
  }

  private spawnEnemyBullet(x: number, y: number, angle: number, speed: number, color: number) {
    const bullet = this.bullets.get(x, y, BULLET_RADIUS, color) as Phaser.GameObjects.Arc | null;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true).setData('grazed', false);
    bullet.setFillStyle(color, 1);
    bullet.setStrokeStyle(1, 0xffffff, 0.45);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setCircle(BULLET_RADIUS);
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private firePlayerShot(time: number) {
    this.lastPlayerFire = time;
    const shot = this.playerShots.get(this.player.x, this.player.y - 18, 8, 22, 0x9cff6a) as Phaser.GameObjects.Rectangle | null;
    if (!shot) return;
    shot.setActive(true).setVisible(true);
    shot.setFillStyle(0x9cff6a, 1);
    shot.setStrokeStyle(1, 0xffffff, 0.7);
    const body = shot.body as Phaser.Physics.Arcade.Body;
    body.setSize(8, 22);
    body.setVelocity(0, -520);
  }

  private hitEnemy(shot: Phaser.GameObjects.Rectangle) {
    if (this.gameOver || this.victory) return;

    shot.destroy();
    this.enemyHp--;
    this.score++;
    this.enemy.setFillStyle(0xffffff, 1);
    this.cameras.main.flash(45, 255, 255, 255, false);
    this.time.delayedCall(55, () => this.enemy?.setFillStyle(LEVELS[this.levelIndex].enemyColor, 1));
    this.updateHud();

    if (this.enemyHp <= 0) this.defeatEnemy();
  }

  private defeatEnemy() {
    this.score += 10 * (this.levelIndex + 1);
    this.enemyFireEvent?.remove(false);
    this.clearProjectiles();
    this.cameras.main.shake(180, 0.006);
    this.updateHud();

    if (this.levelIndex < LEVELS.length - 1) {
      this.time.delayedCall(650, () => this.startLevel(this.levelIndex + 1));
    } else {
      this.endVictory();
    }
  }

  private hitByBullet(bullet: Phaser.GameObjects.Arc) {
    if (this.time.now < this.invulnerableUntil || this.gameOver || this.victory) return;
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
  }

  private updateHud() {
    const level = LEVELS[this.levelIndex];
    this.scoreText?.setText(`Score ${this.score}  Grazes ${this.grazes}`);
    this.hpText?.setText(`HP ${'♥'.repeat(Math.max(0, this.hp))}`);
    this.levelText?.setText(`Level ${this.levelIndex + 1}/${LEVELS.length}: ${level.name}`);
    this.bossText?.setText(`Boss HP ${Math.max(0, this.enemyHp)}/${level.enemyHp}`);
  }

  private endGame() {
    this.gameOver = true;
    this.enemyFireEvent?.remove(false);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.player.setFillStyle(0xff3355, 1);

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
    this.enemy.setVisible(false).setActive(false);

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
