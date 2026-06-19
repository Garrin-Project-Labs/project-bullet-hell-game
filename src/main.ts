import Phaser from 'phaser';
import './style.css';

const GAME_WIDTH = 800;
const HUD_WIDTH = 220;
const PLAY_X = HUD_WIDTH;
const PLAY_RIGHT = PLAY_X + GAME_WIDTH;
const PLAY_CENTER = PLAY_X + GAME_WIDTH / 2;
const WIDTH = GAME_WIDTH + HUD_WIDTH * 2;
const HEIGHT = 600;
const PLAY_TOP = 88;
const PLAYER_SPEED = 255;
const PLAYER_SPEED_UPGRADE = 28;
const PLAYER_RADIUS = 10;
const PLAYER_HIT_CIRCLES = [
  { x: -9, y: 1, radius: 7 },
  { x: -1, y: 8, radius: 9 },
  { x: 8, y: 14, radius: 7 }
];
const PLAYER_LASER_HALF_WIDTH = 18;
const BULLET_RADIUS = 8;
const ENEMY_BULLET_HITBOX_SCALE = 1;
const ENEMY_BULLET_STROKE_WIDTH = 3;
const GRAZE_RADIUS = 20;
const PLAYER_FIRE_MS = 170;
const PLAYER_FIRE_RATE_UPGRADE = 0.87; // each fire-rate upgrade ≈ +15% shots/sec (lower delay)
const MIN_PLAYER_FIRE_MS = 70; // floor so stacked upgrades can't break firing
const BASE_PLAYER_SHOT_SPEED = 440;
const BULLET_SIZE_UPGRADE = 4;
const SPREAD_CHANCE_UPGRADE = 0.12;
const POWER_UP_DROP_CHANCE = 0.03;
const POWER_UP_TTL_MS = 3000;
const POWER_UP_DURATION_MS = 7000;
const BIO_POWER_UP_DURATION_MS = 5000;
const DEBUG_BIO_SHIELD_MS = 60 * 60 * 1000;
const BIO_POWER_UP_WEIGHT = 0.12;
const POWER_UP_MIN_GAP_MS = 4000;
const ATTACK_PATTERN_MS = 5000;
const LEVEL_FIVE_INDEX = 4;
const LEVEL_FIVE_WALL_ROWS = 13;
const LEVEL_FIVE_WALL_LANES = 10;
const LEVEL_SEVEN_INDEX = 6;
const LEVEL_SEVEN_PHASE_MS = 10000;
const LEVEL_SEVEN_PHASE_SETTLE_MS = 2500; // post-orbit cooldown so slow orbs clear before normal attacks resume
const LEVEL_SEVEN_PHASE_FIRE_MS = 260;
const LEVEL_SEVEN_PHASE_BULLET_RADIUS = 23;
const LEVEL_SEVEN_ORB_COUNT = 5;
const FINAL_BOSS_INDEX = 9;
const ENDLESS_INDEX = 10;
const STORY_LEVEL_COUNT = 10;
const LEADERBOARD_LIMIT = 10;
const LEADERBOARD_NAME_LIMIT = 8;
const LEADERBOARD_NAME_STORAGE_KEY = 'bulletHellLeaderboardName';
const AUDIO_MUTED_STORAGE_KEY = 'bulletHellAudioMuted';
// Audio is intentionally subtle/background. Master scales every SFX; per-sound
// volumes are relative to it, so effective loudness stays low.
const SFX_MASTER_VOLUME = 0.32;
const SFX_VOLUMES: Record<string, number> = {
  shoot: 0.16,
  hit: 0.3,
  explosion: 0.5,
  damage: 0.55,
  powerup: 0.5
};
const SYNTH_VOLUME_SCALE = 0.45;
// Shared leaderboard endpoint backed by the Google Apps Script web app.
const SHARED_LEADERBOARD_URL = import.meta.env.VITE_LEADERBOARD_URL || '';

type PowerUpKind = 'big' | 'rapid' | 'spread' | 'bio';
type UpgradeKind = 'speed' | 'size' | 'spreadChance' | 'moveSpeed';
type AttackPattern = 'ring' | 'burst' | 'heavy' | 'spiral';
type EnemyMovePattern = 'sway' | 'figureEight' | 'hoverDash' | 'drift';

type LeaderboardEntry = {
  name: string;
  score: number;
  level: number;
  grazes: number;
  date: string;
};

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
    fireMs: 760,
    bulletCount: 7,
    bulletSpeed: 85,
    spin: 0.12
  },
  {
    name: 'Emerald Drift',
    background: '#071611',
    enemyColor: 0x43ff91,
    enemyHp: 14,
    fireMs: 720,
    bulletCount: 8,
    bulletSpeed: 94,
    spin: 0.13
  },
  {
    name: 'Violet Shoals',
    background: '#100b20',
    enemyColor: 0xa477ff,
    enemyHp: 16,
    fireMs: 820,
    bulletCount: 8,
    bulletSpeed: 86,
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
    fireMs: 720,
    bulletCount: 8,
    bulletSpeed: 108,
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
    fireMs: 665,
    bulletCount: 11,
    bulletSpeed: 183,
    spin: 0.2
  },
  {
    name: 'Banana Singularity',
    background: '#1d0708',
    enemyColor: 0xff3355,
    enemyHp: 60,
    fireMs: 430,
    bulletCount: 16,
    bulletSpeed: 201,
    spin: 0.22
  },
  {
    name: 'Endless Peel',
    background: '#050915',
    enemyColor: 0x9cff6a,
    enemyHp: 64,
    fireMs: 420,
    bulletCount: 15,
    bulletSpeed: 190,
    spin: 0.23
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
  private scoreLabelText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private levelLabelText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private upgradeLabelText!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Rectangle;
  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private bossNameText!: Phaser.GameObjects.Text;
  private powerText!: Phaser.GameObjects.Text;
  private upgradeText!: Phaser.GameObjects.Text;
  private miniLeaderboardPanel!: Phaser.GameObjects.Rectangle;
  private miniLeaderboardTitle!: Phaser.GameObjects.Text;
  private miniLeaderboardText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private debugHitboxKey!: Phaser.Input.Keyboard.Key;
  private debugHitboxGraphics?: Phaser.GameObjects.Graphics;
  private debugBulletLabels: Phaser.GameObjects.Text[] = [];
  private overlay?: Phaser.GameObjects.Container;
  private startOverlay?: Phaser.GameObjects.Container;
  private startLeaderboardText?: Phaser.GameObjects.Text;
  private audioContext?: AudioContext;
  private muteText?: Phaser.GameObjects.Text;
  private audioMuted = false;
  private scoreSubmitted = false;
  private sharedLeaderboard: LeaderboardEntry[] = [];
  private leaderboardStatus = 'Local scores only';
  private leaderboardNameEntryActive = false;
  private lastLeaderboardName = '';
  private enemyFireEvent?: Phaser.Time.TimerEvent;
  private bossLaserActive = false;
  private levelFiveWallActive = false;
  private levelFiveWallUsed = false;
  private levelSevenOrbPhaseActive = false;
  private levelSevenOrbPhase25Used = false;
  private enemyOverlap?: Phaser.Physics.Arcade.Collider;
  private powerUpOverlap?: Phaser.Physics.Arcade.Collider;
  private immunityRing?: Phaser.GameObjects.Arc;

  private hp = 5;
  private score = 0;
  private grazes = 0;
  private wave = 0;
  private levelIndex = 0;
  private enemyHp = 0;
  private enemyMaxHp = 0;
  private invulnerableUntil = 0;
  private lastPlayerFire = 0;
  private gameOver = false;
  private victory = false;
  private gameStarted = false;
  private levelTransitioning = false;
  private waitingForUpgradeChoice = false;
  private enemyInvulnerableUntil = 0;
  private activePowerUp?: PowerUpKind;
  private powerUpUntil = 0;
  private levelStartedAt = 0;
  private endlessStartedAt = 0;
  private endlessWave = 0;
  private lastPowerUpSpawn = -POWER_UP_MIN_GAP_MS;
  private enemyMovePattern: EnemyMovePattern = 'sway';
  private enemyMoveSeed = 0;
  private fireRateUpgrades = 0;
  private bulletSizeUpgrades = 0;
  private spreadChanceUpgrades = 0;
  private moveSpeedUpgrades = 0;
  private debugHitboxes = false;
  private debugBioShieldActive = false;

  constructor() {
    super('main');
  }

  preload() {
    this.load.svg('banana-boss', 'assets/banana-boss.svg', { width: 80, height: 80 });
    this.load.svg('final-boss', 'assets/final-boss.svg', { width: 96, height: 96 });
    this.load.svg('enemy-drone', 'assets/enemy-drone.svg', { width: 82, height: 82 });
    this.load.svg('enemy-cruiser', 'assets/enemy-cruiser.svg', { width: 82, height: 82 });
    this.load.svg('enemy-orb', 'assets/enemy-orb.svg', { width: 82, height: 82 });
    this.load.svg('enemy-starblade', 'assets/enemy-starblade.svg', { width: 82, height: 82 });
    this.load.audio('shoot', 'assets/audio/shoot.ogg');
    this.load.audio('hit', 'assets/audio/hit.ogg');
    this.load.audio('explosion', 'assets/audio/explosion.ogg');
    this.load.audio('damage', 'assets/audio/damage.ogg');
    this.load.audio('powerup', 'assets/audio/powerup.ogg');
  }

  create() {
    this.hp = 5;
    this.score = 0;
    this.grazes = 0;
    this.wave = 0;
    this.levelIndex = 0;
    this.enemyHp = 0;
    this.enemyMaxHp = 0;
    this.invulnerableUntil = 0;
    this.lastPlayerFire = 0;
    this.gameOver = false;
    this.victory = false;
    this.gameStarted = false;
    this.audioMuted = this.loadSavedMutePreference();
    this.sound.volume = SFX_MASTER_VOLUME;
    this.sound.mute = this.audioMuted;
    this.levelTransitioning = false;
    this.waitingForUpgradeChoice = false;
    this.enemyInvulnerableUntil = 0;
    this.activePowerUp = undefined;
    this.powerUpUntil = 0;
    this.immunityRing?.destroy();
    this.immunityRing = undefined;
    this.levelStartedAt = 0;
    this.endlessStartedAt = 0;
    this.endlessWave = 0;
    this.lastPowerUpSpawn = -POWER_UP_MIN_GAP_MS;
    this.enemyMovePattern = 'sway';
    this.enemyMoveSeed = 0;
    this.fireRateUpgrades = 0;
    this.bulletSizeUpgrades = 0;
    this.spreadChanceUpgrades = 0;
    this.moveSpeedUpgrades = 0;
    this.debugHitboxes = false;
    this.scoreSubmitted = false;
    this.bossLaserActive = false;
    this.levelFiveWallActive = false;
    this.levelFiveWallUsed = false;
    this.levelSevenOrbPhaseActive = false;
    this.levelSevenOrbPhase25Used = false;
    this.sharedLeaderboard = [];
    this.leaderboardStatus = 'Loading shared leaderboard...';
    this.leaderboardNameEntryActive = false;
    this.lastLeaderboardName = this.loadSavedLeaderboardName();

    this.addBackground();
    this.physics.world.setBounds(PLAY_X, PLAY_TOP, GAME_WIDTH, HEIGHT - PLAY_TOP);

    this.player = this.add.image(PLAY_CENTER, HEIGHT - 80, 'banana-boss').setScale(0.55);
    this.physics.add.existing(this.player);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(80, 80);
    playerBody.setOffset(0, 0);
    playerBody.setCollideWorldBounds(true);

    this.bullets = this.physics.add.group({ classType: Phaser.GameObjects.Arc, maxSize: 800 });
    this.playerShots = this.physics.add.group({ classType: Phaser.GameObjects.Rectangle, maxSize: 120 });
    this.powerUps = this.physics.add.group({ classType: Phaser.GameObjects.Arc, maxSize: 1 });

    this.physics.add.overlap(this.player, this.bullets, (_, bullet) => this.checkPlayerBulletHit(bullet as Phaser.GameObjects.Arc | Phaser.GameObjects.Ellipse));
    this.powerUpOverlap = this.physics.add.overlap(this.player, this.powerUps, (_, powerUp) => this.collectPowerUp(powerUp as Phaser.GameObjects.Arc));

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,R,M') as Record<string, Phaser.Input.Keyboard.Key>;
    this.debugHitboxKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.NINE);
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.addCapture([Phaser.Input.Keyboard.KeyCodes.SPACE]);

    this.add.rectangle(18, 118, 3, 196, 0x7cf7ff, 0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(20);
    this.add.rectangle(92, 92, 136, 2, 0xffd166, 0.62)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(20);
    this.add.rectangle(86, 204, 124, 2, 0xc77dff, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(20);
    this.scoreLabelText = this.add.text(28, 28, 'SCORE', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#7cf7ff',
      stroke: '#020712',
      strokeThickness: 3
    }).setShadow(0, 0, '#7cf7ff', 8, true, true);
    this.scoreText = this.add.text(28, 46, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#fff7a8',
      stroke: '#020712',
      strokeThickness: 5
    }).setShadow(0, 0, '#ff4d8d', 10, true, true);
    this.hpText = this.add.text(PLAY_RIGHT - 16, 12, '', { fontFamily: 'monospace', fontSize: '18px', color: '#e8f8ff' }).setOrigin(1, 0);
    this.levelLabelText = this.add.text(28, 106, 'LEVEL', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ff8fda',
      stroke: '#020712',
      strokeThickness: 3
    }).setShadow(0, 0, '#ff4d8d', 7, true, true);
    this.levelText = this.add.text(28, 124, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#e8f8ff',
      stroke: '#020712',
      strokeThickness: 4
    });
    this.add.rectangle(PLAY_CENTER, 70, GAME_WIDTH - 18, 2, 0x28344f, 0.8);
    this.add.rectangle(PLAY_CENTER, 30, 560, 26, 0x050714, 0.92).setStrokeStyle(2, 0x7cf7ff, 0.28);
    this.bossBar = this.add.rectangle(PLAY_CENTER, 30, 548, 16, 0x24111b, 0.95);
    this.bossBarFill = this.add.rectangle(PLAY_CENTER - 274, 30, 548, 16, 0xff4d8d, 1).setOrigin(0, 0.5);
    this.bossNameText = this.add.text(PLAY_CENTER, 45, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ffd6e6' }).setOrigin(0.5, 0);
    this.powerText = this.add.text(PLAY_CENTER, 12, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fff0a6' }).setOrigin(0.5, 0);
    this.upgradeLabelText = this.add.text(28, 218, 'UPGRADES', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#c77dff',
      stroke: '#020712',
      strokeThickness: 3
    }).setShadow(0, 0, '#c77dff', 7, true, true);
    this.upgradeText = this.add.text(28, 240, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#dff9ff',
      stroke: '#020712',
      strokeThickness: 3,
      wordWrap: { width: HUD_WIDTH - 52 },
      lineSpacing: 6
    });
    this.helpText = this.add.text(28, 386, 'CONTROLS\nWASD / Arrows\nSpace to shoot\nR restart\nM mute sound', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#6f819a',
      stroke: '#020712',
      strokeThickness: 2,
      lineSpacing: 4
    });
    this.muteText = this.add.text(28, 460, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#9cff6a',
      stroke: '#020712',
      strokeThickness: 3
    }).setShadow(0, 0, '#9cff6a', 6, true, true);
    this.updateMuteText();
    this.debugHitboxGraphics = this.add.graphics().setDepth(40).setVisible(false);

    this.scoreLabelText.setDepth(21);
    this.scoreText.setDepth(21);
    this.levelLabelText.setDepth(21);
    this.levelText.setDepth(21);
    this.upgradeLabelText.setDepth(21);
    this.upgradeText.setDepth(21);
    this.helpText.setDepth(21);
    this.muteText.setDepth(21);

    this.add.rectangle(PLAY_RIGHT + HUD_WIDTH / 2, PLAY_TOP + 96, HUD_WIDTH - 26, 174, 0x7cf7ff, 0.06)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(19);
    this.miniLeaderboardPanel = this.add.rectangle(PLAY_RIGHT + HUD_WIDTH / 2, PLAY_TOP + 96, HUD_WIDTH - 36, 164, 0x050714, 0.88)
      .setStrokeStyle(2, 0x7cf7ff, 0.55)
      .setDepth(20);
    this.add.rectangle(PLAY_RIGHT + HUD_WIDTH / 2, PLAY_TOP + 38, HUD_WIDTH - 70, 2, 0x7cf7ff, 0.8)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(21);
    this.miniLeaderboardTitle = this.add.text(PLAY_RIGHT + HUD_WIDTH / 2, PLAY_TOP + 48, '◆ TOP 3 ◆', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#7cf7ff',
      stroke: '#050714',
      strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(21);
    this.miniLeaderboardText = this.add.text(PLAY_RIGHT + 24, PLAY_TOP + 82, this.formatMiniLeaderboard(), {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e8f8ff',
      lineSpacing: 9
    }).setDepth(21);

    void this.loadSharedLeaderboard();
    this.showStartScreen();
  }

  update(time: number, delta: number) {
    if (!this.leaderboardNameEntryActive && Phaser.Input.Keyboard.JustDown(this.wasd.R)) {
      this.scene.restart();
      return;
    }
    if (!this.leaderboardNameEntryActive && Phaser.Input.Keyboard.JustDown(this.wasd.M)) {
      this.toggleMute();
    }
    if (!this.gameStarted) {
      if (Phaser.Input.Keyboard.JustDown(this.fireKey)) this.beginGame();
      return;
    }
    if (!this.leaderboardNameEntryActive && Phaser.Input.Keyboard.JustDown(this.debugHitboxKey)) {
      this.debugHitboxes = !this.debugHitboxes;
      this.debugHitboxGraphics?.setVisible(this.debugHitboxes);
      if (this.debugHitboxes) {
        this.activateDebugBioShield(time);
      } else {
        this.clearDebugHitboxOverlay();
        this.deactivateDebugBioShield();
      }
    }
    if (this.debugHitboxes) this.refreshDebugBioShield(time);
    if (this.gameOver || this.victory || this.levelTransitioning || this.waitingForUpgradeChoice || !this.enemy) return;

    this.movePlayer(delta);
    this.moveEnemy(time);

    if (!this.levelSevenOrbPhaseActive && this.fireKey.isDown) {
      this.firePlayerShot(time);
    }

    this.syncPowerUpLabels();
    this.expirePowerUp(time);
    this.cleanupOffscreen();
    this.checkGrazes();
    this.drawDebugHitboxes();
  }

  private addBackground() {
    this.cameras.main.setBackgroundColor(LEVELS[0].background);
    for (let i = 0; i < 95; i++) {
      const x = Phaser.Math.Between(PLAY_X, PLAY_RIGHT);
      const y = Phaser.Math.Between(0, HEIGHT);
      const alpha = Phaser.Math.FloatBetween(0.18, 0.75);
      const size = Phaser.Math.FloatBetween(0.7, 2.2);
      this.add.circle(x, y, size, 0xffffff, alpha);
    }
    this.add.rectangle(PLAY_CENTER, (HEIGHT + PLAY_TOP) / 2, GAME_WIDTH - 28, HEIGHT - PLAY_TOP - 18).setStrokeStyle(2, 0x28344f, 0.55);
    this.add.rectangle(PLAY_CENTER, (HEIGHT + PLAY_TOP) / 2, GAME_WIDTH - 18, HEIGHT - PLAY_TOP - 8).setStrokeStyle(1, 0x7cf7ff, 0.18);
    this.add.rectangle(HUD_WIDTH / 2, HEIGHT / 2, HUD_WIDTH, HEIGHT, 0x050714, 0.62);
    this.add.rectangle(PLAY_RIGHT + HUD_WIDTH / 2, HEIGHT / 2, HUD_WIDTH, HEIGHT, 0x050714, 0.62);
    this.add.rectangle(PLAY_X - 1, HEIGHT / 2, 2, HEIGHT, 0x7cf7ff, 0.18).setBlendMode(Phaser.BlendModes.ADD);
    this.add.rectangle(PLAY_RIGHT + 1, HEIGHT / 2, 2, HEIGHT, 0x7cf7ff, 0.18).setBlendMode(Phaser.BlendModes.ADD);
  }

  private showStartScreen() {
    const panelGlow = this.add.rectangle(0, 0, 650, 330, 0x7cf7ff, 0.07).setBlendMode(Phaser.BlendModes.ADD);
    const panel = this.add.rectangle(0, 0, 610, 300, 0x050714, 0.94).setStrokeStyle(2, 0x7cf7ff, 0.75);
    const title = this.add.text(0, -106, 'BANANA BULLET HELL', {
      fontFamily: 'monospace',
      fontSize: '38px',
      color: '#fff7a8',
      stroke: '#ff4d8d',
      strokeThickness: 2
    }).setOrigin(0.5).setShadow(0, 0, '#ff4d8d', 12, true, true);
    const subtitle = this.add.text(0, -60, 'Dodge the storm. Split the boss. Top the board.', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#dff9ff'
    }).setOrigin(0.5);
    const controls = this.add.text(-250, 4, 'MOVE\nWASD / ARROWS\n\nFIRE\nSPACE\n\nPOWER\nCollect glowing BIO, RAPID, BIG, SPREAD drops', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#a9bad1',
      lineSpacing: 5
    }).setOrigin(0, 0.5);
    const topScores = this.add.text(118, 0, this.formatStartLeaderboard(), {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e8f8ff',
      lineSpacing: 8
    }).setOrigin(0.5);
    this.startLeaderboardText = topScores;
    const prompt = this.add.text(0, 120, 'PRESS SPACE TO START', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#9cff6a',
      stroke: '#020712',
      strokeThickness: 4
    }).setOrigin(0.5).setShadow(0, 0, '#9cff6a', 10, true, true);

    this.startOverlay = this.add.container(PLAY_CENTER, HEIGHT / 2, [panelGlow, panel, title, subtitle, controls, topScores, prompt]).setDepth(80);
    this.tweens.add({ targets: panelGlow, alpha: 0.16, yoyo: true, repeat: -1, duration: 900 });
    this.tweens.add({ targets: prompt, alpha: 0.45, yoyo: true, repeat: -1, duration: 520 });
  }

  private beginGame() {
    if (this.gameStarted) return;
    this.gameStarted = true;
    this.resumeAudio();
    this.playTone(523, 0.08, 'triangle', 0.05);
    this.playTone(784, 0.12, 'triangle', 0.045, 0.07);
    this.startOverlay?.destroy();
    this.startOverlay = undefined;
    this.startLevel(0);
  }

  private formatStartLeaderboard() {
    const entries = this.getLeaderboard().slice(0, 3);
    const lines = ['◆ TOP PILOTS ◆'];
    if (entries.length === 0) {
      lines.push('No scores yet');
      lines.push('Be the first banana');
      return lines.join('\n');
    }

    entries.forEach((entry, index) => {
      lines.push(`${index + 1}. ${entry.name.slice(0, 8).padEnd(8, ' ')} ${String(entry.score).padStart(5, ' ')}`);
    });
    return lines.join('\n');
  }

  private startLevel(index: number) {
    this.levelIndex = index;
    this.wave = 0;
    this.levelTransitioning = false;
    this.waitingForUpgradeChoice = false;
    this.levelStartedAt = this.time.now;
    if (this.isEndlessLevel() && this.endlessStartedAt === 0) this.endlessStartedAt = this.time.now;
    this.pickEnemyMovement();
    this.enemyInvulnerableUntil = this.time.now + 500;
    this.levelFiveWallActive = false;
    this.levelFiveWallUsed = false;
    this.levelSevenOrbPhaseActive = false;
    this.levelSevenOrbPhase25Used = false;

    const level = this.currentLevelConfig();
    this.enemyHp = level.enemyHp;
    this.enemyMaxHp = level.enemyHp;
    this.createEnemyForLevel(level);
    this.cameras.main.setBackgroundColor(level.background);
    this.clearProjectiles();

    this.enemyFireEvent?.remove(false);
    this.enemyFireEvent = this.time.addEvent({ delay: level.fireMs, loop: true, callback: () => this.firePattern() });

    this.showLevelBanner(level);
    this.playTone(330 + this.levelIndex * 28, 0.09, 'triangle', 0.035);
    this.playTone(495 + this.levelIndex * 28, 0.11, 'triangle', 0.028, 0.08);
    this.updateHud();
  }

  private createEnemyForLevel(level: LevelConfig) {
    this.enemyOverlap?.destroy();
    this.enemy?.destroy();

    const enemySprites = ['enemy-drone', 'enemy-cruiser', 'enemy-orb', 'enemy-starblade'];
    if (this.isFinalBossLevel()) {
      this.enemy = this.add.image(PLAY_CENTER, PLAY_TOP + 36, 'final-boss').setScale(0.92);
    } else if (this.isEndlessLevel()) {
      this.enemy = this.add.image(PLAY_CENTER, PLAY_TOP + 30, 'enemy-starblade').setScale(0.98).setTint(level.enemyColor);
    } else {
      const spriteKey = enemySprites[this.levelIndex % enemySprites.length];
      this.enemy = this.add.image(PLAY_CENTER, PLAY_TOP + 28, spriteKey).setScale(0.94).setTint(level.enemyColor);
    }

    this.setEnemyStroke();
    this.physics.add.existing(this.enemy);
    const body = this.enemy.body as Phaser.Physics.Arcade.Body;
    if (this.enemy instanceof Phaser.GameObjects.Image) {
      const bodyWidth = this.isFinalBossLevel() ? 54 : 50;
      const bodyHeight = this.isFinalBossLevel() ? 78 : 54;
      body.setSize(bodyWidth, bodyHeight);
      body.setOffset((this.enemy.displayWidth - bodyWidth) / 2, (this.enemy.displayHeight - bodyHeight) / 2);
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
      this.enemy.setFillStyle(this.currentLevelConfig().enemyColor, 1);
    } else {
      this.enemy.clearTint();
    }
  }

  private showLevelBanner(level: LevelConfig) {
    const titleText = this.isEndlessLevel() ? `HIDDEN LEVEL 11: ${level.name}` : `LEVEL ${this.levelIndex + 1}: ${level.name}`;
    const hintText = this.levelFlavorText();
    const glow = this.add.rectangle(PLAY_CENTER, HEIGHT / 2 - 80, 620, 86, level.enemyColor, 0.08)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(29);
    const banner = this.add.text(PLAY_CENTER, HEIGHT / 2 - 110, titleText, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(30);
    const hint = this.add.text(PLAY_CENTER, HEIGHT / 2 - 72, hintText, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#dff9ff',
      stroke: '#020712',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: [banner, hint, glow],
      y: banner.y - 24,
      alpha: 0,
      delay: 700,
      duration: 650,
      onComplete: () => {
        banner.destroy();
        hint.destroy();
        glow.destroy();
      }
    });
  }

  private levelFlavorText() {
    const hints = [
      'Warm-up pattern: read the ring, keep moving.',
      'Needles track you. Drift, then cut back.',
      'Bursts fan wide. Small moves beat panic.',
      'Crossfire lanes. Watch the side walls.',
      'Bloom phase: find the shield-wall gap.',
      'Spirals punish straight lines.',
      'Big solar orbs. Slow is smooth.',
      'Undertow drops from above. Own the gaps.',
      'Prism fans stack up. Stay light.',
      'Final banana singularity. Commit to the lane.'
    ];
    if (this.isEndlessLevel()) return 'Endless peel pressure. Survive the climb.';
    return hints[this.levelIndex] ?? 'New pattern incoming.';
  }

  private movePlayer(delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left?.isDown || this.wasd.A.isDown;
    const right = this.cursors.right?.isDown || this.wasd.D.isDown;
    const up = this.cursors.up?.isDown || this.wasd.W.isDown;
    const down = this.cursors.down?.isDown || this.wasd.S.isDown;

    const velocity = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));
    const playerSpeed = PLAYER_SPEED + this.moveSpeedUpgrades * PLAYER_SPEED_UPGRADE;
    if (velocity.lengthSq() > 0) velocity.normalize().scale(playerSpeed);
    body.setVelocity(velocity.x, velocity.y);

    const flicker = this.activePowerUp !== 'bio' && this.time.now < this.invulnerableUntil && Math.floor(this.time.now / 80) % 2 === 0;
    this.player.setAlpha(flicker ? 0.35 : 1);
    this.updateImmunityRing();
  }

  private pickEnemyMovement() {
    const patterns: EnemyMovePattern[] = ['sway', 'figureEight', 'hoverDash', 'drift'];
    this.enemyMovePattern = Phaser.Utils.Array.GetRandom(patterns);
    this.enemyMoveSeed = Phaser.Math.FloatBetween(0, Math.PI * 2);
  }

  private moveEnemy(time: number) {
    const level = this.currentLevelConfig();
    if (!this.enemy) return;

    const t = (time - this.levelStartedAt) / 1000;
    const phase = t + this.enemyMoveSeed;
    let x = PLAY_CENTER;
    let y = PLAY_TOP + 28;

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

    this.enemy.x = Phaser.Math.Clamp(x, PLAY_X + 70, PLAY_RIGHT - 70);
    this.enemy.y = Phaser.Math.Clamp(y, PLAY_TOP + 16, PLAY_TOP + 92);
    if (!(this.enemy instanceof Phaser.GameObjects.Image)) {
      this.enemy.rotation += 0.002 + this.levelIndex * 0.001;
    }
    if (this.levelSevenOrbPhaseActive) {
      this.enemy.x = PLAY_CENTER;
      this.enemy.y = HEIGHT / 2;
    }
    this.setEnemyFill(level.enemyColor);
    (this.enemy.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
  }

  private isEndlessLevel() {
    return this.levelIndex === ENDLESS_INDEX;
  }

  private currentLevelConfig(): LevelConfig {
    const base = LEVELS[this.levelIndex] ?? LEVELS[LEVELS.length - 1];
    if (!this.isEndlessLevel()) return base;

    const elapsedMinutes = this.endlessStartedAt > 0 ? Math.max(0, (this.time.now - this.endlessStartedAt) / 60000) : 0;
    const pressure = this.endlessWave + elapsedMinutes * 1.5;
    return {
      ...base,
      enemyHp: Math.round(base.enemyHp + pressure * 9),
      fireMs: Math.max(245, Math.round(base.fireMs - pressure * 14)),
      bulletCount: Math.min(34, Math.round(base.bulletCount + pressure)),
      bulletSpeed: base.bulletSpeed + pressure * 8,
      spin: base.spin + pressure * 0.008
    };
  }

  private levelProgressLabel() {
    return this.isEndlessLevel() ? `Level 11 ∞\nWave ${this.endlessWave + 1}` : `Level ${this.levelIndex + 1}/${STORY_LEVEL_COUNT}`;
  }

  private leaderboardLevel() {
    return this.isEndlessLevel() ? ENDLESS_INDEX + 1 : this.levelIndex + 1;
  }

  private firePattern() {
    if (this.gameOver || this.victory || this.levelFiveWallActive || this.levelSevenOrbPhaseActive) return;
    this.wave++;

    const level = this.currentLevelConfig();
    if (!this.enemy || this.levelTransitioning) return;

    const base = Phaser.Math.Angle.Between(this.enemy.x, this.enemy.y, this.player.x, this.player.y);
    const speed = level.bulletSpeed + Math.min(25, this.score * 0.35);

    if (this.isFinalBossLevel() && this.wave % 4 === 0) {
      this.fireFinalBossLaser();
    }

    this.fireLevelPattern(level, base, speed);
  }

  private fireLevelPattern(level: LevelConfig, base: number, speed: number) {
    if (this.isEndlessLevel()) {
      this.fireEndlessPattern(level, base, speed);
      return;
    }

    switch (this.levelIndex) {
      case 0:
        this.fireRingPattern(level, base, speed);
        break;
      case 1:
        this.fireAimedNeedlePattern(level, base, speed);
        break;
      case 2:
        this.fireBurstPattern(level, base, speed);
        break;
      case 3:
        this.fireCrosshatchPattern(level, speed);
        break;
      case 4:
        this.fireBloomPattern(level, speed);
        break;
      case 5:
        this.fireSpiralPattern(level, speed);
        break;
      case 6:
        this.fireLevelSevenBigOrbPattern(level);
        break;
      case 7:
        this.fireUndertowPattern(level, base, speed);
        break;
      case 8:
        this.firePrismPattern(level, base, speed);
        break;
      case 9:
        this.fireHeavyPattern(level, speed);
        break;
      default:
        this.fireEndlessPattern(level, base, speed);
    }
  }

  private currentAttackPattern(): AttackPattern {
    const patterns: AttackPattern[] = ['ring', 'burst', 'heavy', 'spiral'];
    const elapsed = Math.max(0, this.time.now - this.levelStartedAt);
    return patterns[Math.floor(elapsed / ATTACK_PATTERN_MS) % patterns.length];
  }

  private isLevelFiveBoss() {
    return this.levelIndex === LEVEL_FIVE_INDEX;
  }

  private isLevelSevenBoss() {
    return this.levelIndex === LEVEL_SEVEN_INDEX;
  }

  private shouldTriggerLevelSevenOrbPhase() {
    if (!this.isLevelSevenBoss() || this.levelSevenOrbPhaseActive || this.levelTransitioning) return false;
    const hpRatio = this.enemyHp / Math.max(1, this.enemyMaxHp);

    if (!this.levelSevenOrbPhase25Used && hpRatio <= 0.25) {
      this.levelSevenOrbPhase25Used = true;
      return true;
    }

    return false;
  }

  private startLevelSevenOrbPhase() {
    if (!this.enemy || this.levelSevenOrbPhaseActive || this.levelTransitioning || this.gameOver || this.victory) return;

    this.levelSevenOrbPhaseActive = true;
    this.enemyInvulnerableUntil = this.time.now + LEVEL_SEVEN_PHASE_MS + 450;
    this.clearProjectiles();
    this.resetEnemyVisual();

    const enemyBody = this.enemy.body as Phaser.Physics.Arcade.Body;
    enemyBody.setVelocity(0, 0);
    this.tweens.killTweensOf(this.enemy);
    this.tweens.add({
      targets: this.enemy,
      x: PLAY_CENTER,
      y: HEIGHT / 2,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 420,
      ease: 'Cubic.easeOut',
      onUpdate: () => enemyBody.updateFromGameObject()
    });

    const shield = this.add.circle(PLAY_CENTER, HEIGHT / 2, 56, 0x7cf7ff, 0)
      .setStrokeStyle(4, 0x7cf7ff, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(17);
    const label = this.add.text(PLAY_CENTER, HEIGHT / 2 - 94, 'SOLAR ORBIT IMMUNITY', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#fff0a6',
      stroke: '#020712',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(24);
    const hint = this.add.text(PLAY_CENTER, HEIGHT / 2 - 66, '10 seconds — dodge the slow 360° orbs', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e8f8ff',
      stroke: '#020712',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(24);
    const timerText = this.add.text(PLAY_CENTER, HEIGHT / 2 + 76, '10.0', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#7cf7ff',
      stroke: '#020712',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(24);

    this.tweens.add({ targets: shield, scale: 1.32, alpha: 0.22, yoyo: true, repeat: -1, duration: 520 });
    this.tweens.add({ targets: [label, hint], alpha: 0.35, yoyo: true, repeat: 5, duration: 240 });

    const start = this.time.now;
    const timerEvent = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!this.levelSevenOrbPhaseActive || this.gameOver || this.victory || this.levelTransitioning) {
          timerEvent.remove(false);
          return;
        }
        const remaining = Math.max(0, LEVEL_SEVEN_PHASE_MS - (this.time.now - start));
        timerText.setText((remaining / 1000).toFixed(1));
      }
    });

    let volley = 0;
    const fireEvent = this.time.addEvent({
      delay: LEVEL_SEVEN_PHASE_FIRE_MS,
      loop: true,
      callback: () => {
        if (!this.levelSevenOrbPhaseActive || this.gameOver || this.victory || this.levelTransitioning) {
          fireEvent.remove(false);
          return;
        }
        volley++;
        this.fireLevelSevenOrbVolley(volley);
      }
    });

    this.time.delayedCall(LEVEL_SEVEN_PHASE_MS, () => {
      // Stop spawning orbs and the countdown, but DON'T hand control back yet.
      // Keep the boss pinned + immune through a short settle window so the slow
      // orbs can drift clear before normal attacks resume (prevents the desync).
      timerEvent.remove(false);
      fireEvent.remove(false);
      timerText.destroy();
      hint.setText('Orbit powering down...');
      this.enemyInvulnerableUntil = this.time.now + LEVEL_SEVEN_PHASE_SETTLE_MS + 400;

      this.tweens.killTweensOf(shield);
      this.tweens.killTweensOf(label);
      this.tweens.add({ targets: [shield, label, hint], alpha: 0, duration: LEVEL_SEVEN_PHASE_SETTLE_MS, ease: 'Cubic.easeIn' });

      this.time.delayedCall(LEVEL_SEVEN_PHASE_SETTLE_MS, () => {
        shield.destroy();
        label.destroy();
        hint.destroy();
        this.fadeOutOrbitOrbs();
        this.levelSevenOrbPhaseActive = false;
        this.enemyInvulnerableUntil = this.time.now + 350;
        if (this.enemy && !this.gameOver && !this.victory && !this.levelTransitioning) {
          this.tweens.add({ targets: this.enemy, scaleX: 0.94, scaleY: 0.94, duration: 180, ease: 'Cubic.easeOut' });
          this.resetEnemyVisual();
        }
      });
    });
  }

  private fadeOutOrbitOrbs() {
    // Gracefully dissolve any slow orbit orbs still on screen so they don't
    // overlap with the boss's resumed normal attacks.
    for (const obj of [...this.bullets.getChildren()]) {
      const bullet = obj as Phaser.GameObjects.Arc | Phaser.GameObjects.Ellipse;
      if (!bullet.active || bullet.getData('debugId') !== 'level7-orbit-large-orb') continue;
      const body = bullet.body as Phaser.Physics.Arcade.Body | null;
      body?.setVelocity(0, 0);
      body?.setEnable(false);
      this.tweens.add({
        targets: bullet,
        alpha: 0,
        scale: 0.4,
        duration: 320,
        ease: 'Cubic.easeIn',
        onComplete: () => bullet.destroy()
      });
    }
  }

  private fireLevelSevenOrbVolley(volley: number) {
    if (!this.enemy) return;
    const count = LEVEL_SEVEN_ORB_COUNT;
    const spin = -Math.PI / 2 + volley * (0.14 + volley * 0.018);
    const spacing = 0.18;
    const speed = 72;

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spacing;
      const angle = spin + offset;
      this.spawnEnemyBullet(this.enemy.x, this.enemy.y, angle, speed, 0xff8f4d, LEVEL_SEVEN_PHASE_BULLET_RADIUS, 'level7-orbit-large-orb');
    }
  }

  private fireLevelSevenBigOrbPattern(level: LevelConfig) {
    if (!this.enemy) return;
    const count = 3;
    const spread = 0.72;
    const sway = Math.sin(this.wave * 0.75) * 0.22;
    const speed = level.bulletSpeed * 0.55;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = Math.PI / 2 + sway + Phaser.Math.Linear(-spread, spread, t);
      this.spawnLevelSevenBossOrb(this.enemy.x, this.enemy.y + 22, angle, speed, i % 2 === 0 ? 0xffe066 : 0xff8f4d);
    }
  }

  private startLevelFiveWallPhase() {
    if (!this.enemy || this.levelFiveWallActive || this.levelTransitioning || this.gameOver || this.victory) return;

    this.levelFiveWallActive = true;
    this.levelFiveWallUsed = true;
    const phaseMs = 620 + LEVEL_FIVE_WALL_ROWS * 340 + 1000;
    this.enemyInvulnerableUntil = this.time.now + phaseMs;
    this.clearProjectiles();
    this.setEnemyFill(0xb9f6ff);
    if (this.enemy instanceof Phaser.GameObjects.Shape) {
      this.enemy.setStrokeStyle(4, 0xffffff, 0.9);
    }

    const label = this.add.text(PLAY_CENTER, PLAY_TOP + 118, 'AZURE SHIELD WALL', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#b9f6ff',
      stroke: '#020712',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(24);
    const hint = this.add.text(PLAY_CENTER, PLAY_TOP + 146, 'regular fire paused — find the gap', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e8f8ff',
      stroke: '#020712',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(24);

    this.tweens.add({ targets: [label, hint], alpha: 0.35, yoyo: true, repeat: 4, duration: 240 });

    let gapLane = Phaser.Math.Clamp(
      Math.floor((this.player.x - PLAY_X) / (GAME_WIDTH / LEVEL_FIVE_WALL_LANES)),
      1,
      LEVEL_FIVE_WALL_LANES - 2
    );

    for (let row = 0; row < LEVEL_FIVE_WALL_ROWS; row++) {
      this.time.delayedCall(620 + row * 340, () => {
        if (!this.levelFiveWallActive || this.levelTransitioning || this.gameOver || this.victory) return;
        gapLane = Phaser.Math.Clamp(gapLane + Phaser.Math.Between(-1, 1), 1, LEVEL_FIVE_WALL_LANES - 2);
        this.spawnLevelFiveWallRow(row, gapLane);
      });
    }

    this.time.delayedCall(620 + LEVEL_FIVE_WALL_ROWS * 340 + 900, () => {
      label.destroy();
      hint.destroy();
      this.levelFiveWallActive = false;
      this.enemyInvulnerableUntil = this.time.now + 350;
      this.resetEnemyVisual();
      this.setEnemyStroke();
    });
  }

  private spawnLevelFiveWallRow(row: number, gapLane: number) {
    const laneWidth = GAME_WIDTH / LEVEL_FIVE_WALL_LANES;
    const y = PLAY_TOP - 18;
    const warningY = PLAY_TOP + 28 + row * 4;
    const gapMarker = this.add.rectangle(PLAY_X + gapLane * laneWidth + laneWidth / 2, warningY, laneWidth - 10, 8, 0x9cff6a, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(17);
    this.tweens.add({ targets: gapMarker, alpha: 0, duration: 420, onComplete: () => gapMarker.destroy() });

    for (let lane = 0; lane < LEVEL_FIVE_WALL_LANES; lane++) {
      if (lane === gapLane) continue;
      const x = PLAY_X + lane * laneWidth + laneWidth / 2;
      const bullet = this.spawnEnemyBullet(x, y, Math.PI / 2, 185 + row * 7, 0x4dd7ff, 13, 'level5-wall-row');
      bullet?.setData('wallBullet', true);
    }
  }

  private fireRingPattern(level: LevelConfig, base: number, speed: number) {
    const scoreBoost = Math.min(3, Math.floor(this.score / 28));
    const count = level.bulletCount + scoreBoost;
    const spin = this.wave * level.spin;

    for (let i = 0; i < count; i++) {
      const angle = base + spin + (Math.PI * 2 * i) / count;
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 18, angle, speed, 0xffd166, 9, 'ring');
    }
  }

  private fireAimedNeedlePattern(level: LevelConfig, base: number, speed: number) {
    const fanCount = 3 + Math.floor(this.wave % 3);
    const spread = 0.18 + this.levelIndex * 0.025;

    for (let i = 0; i < fanCount; i++) {
      const t = fanCount === 1 ? 0.5 : i / (fanCount - 1);
      const angle = base + Phaser.Math.Linear(-spread, spread, t);
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 20, angle, speed + 42, level.enemyColor, 8, 'aimed-needle');
    }

    if (this.wave % 3 === 0) {
      const side = this.wave % 2 === 0 ? -1 : 1;
      this.spawnEnemyBullet(this.enemy!.x + side * 34, this.enemy!.y + 18, base + side * 0.38, speed * 0.82, 0x9cff6a, 10, 'aimed-side');
    }
  }

  private fireBurstPattern(level: LevelConfig, base: number, speed: number) {
    const isVioletShoals = this.levelIndex === 2;
    const fanCount = isVioletShoals ? 4 : Math.min(8, 4 + Math.floor(this.levelIndex / 2));
    const spread = isVioletShoals ? 0.5 : 0.55 + Math.min(0.45, this.levelIndex * 0.05);
    const mainSpeed = isVioletShoals ? speed * 0.92 : speed + 75;
    for (let i = 0; i < fanCount; i++) {
      const offset = Phaser.Math.Linear(-spread, spread, fanCount === 1 ? 0.5 : i / (fanCount - 1));
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 22, base + offset, mainSpeed, 0xff6b9d, 9, 'burst-main');
    }

    if (!isVioletShoals && this.wave % 2 === 0) {
      const side = this.wave % 4 === 0 ? -1 : 1;
      for (let i = 0; i < 4; i++) {
        this.spawnEnemyBullet(this.enemy!.x + side * 26, this.enemy!.y + 16, base + side * (0.35 + i * 0.12), speed + 35, 0xfff06a, 9, 'burst-side');
      }
    }
  }

  private fireCrosshatchPattern(level: LevelConfig, speed: number) {
    const laneCount = 4 + Math.floor(this.levelIndex / 4);
    const direction = this.wave % 2 === 0 ? 1 : -1;
    const startX = direction > 0 ? PLAY_X + 24 : PLAY_RIGHT - 24;
    const angle = direction > 0 ? 0.58 : Math.PI - 0.58;

    for (let i = 0; i < laneCount; i++) {
      const y = PLAY_TOP + 38 + i * 72;
      this.spawnEnemyBullet(startX, y, angle, speed * 0.72, i % 2 === 0 ? level.enemyColor : 0xff6b35, 10, 'crosshatch');
    }

    if (this.wave % 3 === 0) {
      this.fireRingPattern(level, Math.PI / 2, speed * 0.75);
    }
  }

  private fireBloomPattern(level: LevelConfig, speed: number) {
    const count = level.bulletCount + Math.min(3, Math.floor(this.wave / 5));
    const spin = this.wave * level.spin * 1.4;
    const pulse = this.wave % 2 === 0 ? 0 : Math.PI / count;

    for (let i = 0; i < count; i++) {
      const angle = spin + pulse + (Math.PI * 2 * i) / count;
      const radius = i % 3 === 0 ? 12 : 9;
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 18, angle, speed * 0.86, level.enemyColor, radius, `bloom-r${radius}`);
    }

    if (this.wave % 4 === 0) {
      const aimed = Phaser.Math.Angle.Between(this.enemy!.x, this.enemy!.y, this.player.x, this.player.y);
      this.fireBurstPattern(level, aimed, speed * 0.9);
    }
  }

  private fireHeavyPattern(level: LevelConfig, speed: number) {
    if (this.isFinalBossLevel()) {
      this.fireFinalBossGapPattern(level, speed);
      return;
    }

    const lanes = this.levelIndex < 3 ? [0] : this.levelIndex < 6 ? [-38, 38] : [-56, 0, 56];
    for (const offset of lanes) {
      const wobble = Math.sin((this.wave + offset) * 0.8) * 0.08;
      this.spawnEnemyBullet(this.enemy!.x + offset, this.enemy!.y + 30, Math.PI / 2 + wobble, speed * 0.62, 0xff4d4d, BULLET_RADIUS * 2.35, 'heavy-lane');
    }

    if (this.wave % 3 === 0) {
      const aimed = Phaser.Math.Angle.Between(this.enemy!.x, this.enemy!.y, this.player.x, this.player.y);
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 22, aimed, speed * 0.85, 0xfff7a8, BULLET_RADIUS * 1.85, 'heavy-aimed');
    }
  }

  private fireFinalBossGapPattern(level: LevelConfig, speed: number) {
    const laneCount = 6;
    const laneWidth = GAME_WIDTH / laneCount;
    const playerLane = Phaser.Math.Clamp(Math.floor((this.player.x - PLAY_X) / laneWidth), 0, laneCount - 1);
    const gapLane = Phaser.Math.Clamp(playerLane + Phaser.Math.Between(-1, 1), 0, laneCount - 1);

    for (let lane = 0; lane < laneCount; lane++) {
      if (lane === gapLane) continue;
      const laneCenter = PLAY_X + lane * laneWidth + laneWidth / 2;
      const wobble = Math.sin(this.wave * 0.55 + lane) * 0.06;
      this.spawnEnemyBullet(laneCenter, PLAY_TOP - 18, Math.PI / 2 + wobble, speed * 0.58, 0xff4d4d, BULLET_RADIUS * 2.35, 'final-gap-drop');
    }

    const markerX = PLAY_X + gapLane * laneWidth + laneWidth / 2;
    const gapMarker = this.add.rectangle(markerX, PLAY_TOP + 22, laneWidth - 22, 6, level.enemyColor, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(17);
    this.tweens.add({ targets: gapMarker, alpha: 0, duration: 340, onComplete: () => gapMarker.destroy() });
  }

  private fireSpiralPattern(level: LevelConfig, speed: number) {
    const arms = Math.min(5, 2 + Math.floor(this.levelIndex / 3));
    const spin = this.wave * (0.42 + this.levelIndex * 0.08);
    for (let i = 0; i < arms; i++) {
      const angle = spin + (Math.PI * 2 * i) / arms;
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 18, angle, speed + 25, i % 2 === 0 ? 0xffd166 : 0xc77dff, 9, 'spiral-forward');
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 18, angle + Math.PI, speed * 0.78, 0x7cf7ff, 9, 'spiral-back');
    }
  }

  private fireUndertowPattern(level: LevelConfig, _base: number, speed: number) {
    const laneCount = 8;
    const laneWidth = GAME_WIDTH / laneCount;
    const playerLane = Phaser.Math.Clamp(Math.floor((this.player.x - PLAY_X) / laneWidth), 0, laneCount - 1);
    const gapLane = Phaser.Math.Clamp(playerLane + Phaser.Math.Between(-1, 1), 0, laneCount - 1);

    for (let lane = 0; lane < laneCount; lane++) {
      if (lane === gapLane) continue;
      const laneCenter = PLAY_X + lane * laneWidth + laneWidth / 2;
      const scatter = Phaser.Math.Between(-18, 18);
      const x = Phaser.Math.Clamp(laneCenter + scatter, PLAY_X + 42, PLAY_RIGHT - 42);
      const wobble = Math.sin(this.wave * 0.45 + lane) * 0.07;
      this.spawnEnemyBullet(x, PLAY_TOP - 14, Math.PI / 2 + wobble, speed * 0.58, level.enemyColor, 12, 'undertow-drop');
    }

    if (this.wave % 3 === 0) {
      const markerX = PLAY_X + gapLane * laneWidth + laneWidth / 2;
      const gapMarker = this.add.rectangle(markerX, PLAY_TOP + 28, laneWidth - 18, 7, 0x9cff6a, 0.75)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(17);
      this.tweens.add({ targets: gapMarker, alpha: 0, duration: 360, onComplete: () => gapMarker.destroy() });
    }
  }

  private firePrismPattern(level: LevelConfig, base: number, speed: number) {
    const count = Math.min(9, 5 + Math.floor(this.wave % 5));
    const spread = 0.85;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = base + Phaser.Math.Linear(-spread, spread, t);
      const color = i % 3 === 0 ? level.enemyColor : i % 3 === 1 ? 0x7cf7ff : 0xffd166;
      this.spawnEnemyBullet(this.enemy!.x, this.enemy!.y + 18, angle, speed + i * 8, color, 9 + (i % 2), 'prism-fan');
    }

    if (this.wave % 3 === 0) {
      this.fireSpiralPattern(level, speed * 0.82);
    }
  }

  private fireEndlessPattern(level: LevelConfig, base: number, speed: number) {
    switch (this.wave % 4) {
      case 0:
        this.firePrismPattern(level, base, speed);
        break;
      case 1:
        this.fireSpiralPattern(level, speed);
        break;
      case 2:
        this.fireHeavyPattern(level, speed);
        break;
      default:
        this.fireBloomPattern(level, speed);
    }
  }

  private isFinalBossLevel() {
    return this.levelIndex === FINAL_BOSS_INDEX;
  }

  private fireFinalBossLaser() {
    if (!this.enemy || this.bossLaserActive || this.levelTransitioning || this.gameOver || this.victory) return;

    this.bossLaserActive = true;
    const laserX = Phaser.Math.Clamp(this.player.x, PLAY_X + 46, PLAY_RIGHT - 46);
    const laserWidth = 56;
    const laserHeight = HEIGHT - PLAY_TOP - 16;
    const laserY = PLAY_TOP + laserHeight / 2 + 8;

    const warning = this.add.rectangle(laserX, laserY, laserWidth, laserHeight, 0xff3355, 0.16)
      .setStrokeStyle(3, 0xfff7a8, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(18);
    const warningCore = this.add.rectangle(laserX, laserY, 8, laserHeight, 0xffffff, 0.45)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(19);
    const warningText = this.add.text(laserX, PLAY_TOP + 18, 'LASER', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#fff7a8',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({ targets: warning, alpha: 0.34, yoyo: true, repeat: 3, duration: 110 });
    this.tweens.add({ targets: warningCore, alpha: 0.9, yoyo: true, repeat: 3, duration: 110 });
    this.tweens.add({ targets: warningText, y: PLAY_TOP + 8, alpha: 0.35, yoyo: true, repeat: 3, duration: 110 });

    this.time.delayedCall(850, () => {
      warning.destroy();
      warningCore.destroy();
      warningText.destroy();
      if (this.levelTransitioning || this.gameOver || this.victory) {
        this.bossLaserActive = false;
        return;
      }

      const beam = this.add.rectangle(laserX, laserY, laserWidth, laserHeight, 0xff3355, 0.72)
        .setStrokeStyle(4, 0xffffff, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(18);
      const core = this.add.rectangle(laserX, laserY, 16, laserHeight, 0xffffff, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(19);
      const sweep = this.add.rectangle(laserX, PLAY_TOP + 12, laserWidth + 12, 22, 0xfff7a8, 0.75)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(20);

      this.tweens.add({ targets: sweep, y: HEIGHT - 18, duration: 260, ease: 'Cubic.easeIn', onComplete: () => sweep.destroy() });
      this.cameras.main.shake(120, 0.003);
      this.damagePlayerWithLaser(laserX, laserWidth);

      this.time.delayedCall(320, () => {
        beam.destroy();
        core.destroy();
        this.bossLaserActive = false;
      });
    });
  }

  private damagePlayerWithLaser(laserX: number, laserWidth: number) {
    if (this.time.now < this.invulnerableUntil || this.gameOver || this.victory) return;
    if (Math.abs(this.player.x - laserX) <= laserWidth / 2 + PLAYER_LASER_HALF_WIDTH) {
      this.damagePlayer();
    }
  }

  private spawnEnemyBullet(x: number, y: number, angle: number, speed: number, color: number, radius = BULLET_RADIUS, debugId = 'enemy-bullet') {
    const bullet = this.bullets.get(x, y, radius, 0, 360, false, color, 1) as Phaser.GameObjects.Arc | null;
    if (!bullet) return undefined;
    return this.configureEnemyBullet(bullet, angle, speed, color, radius, debugId, 'Phaser.GameObjects.Arc/full-circle/group-pool');
  }

  private spawnFreshEnemyBullet(x: number, y: number, angle: number, speed: number, color: number, radius = BULLET_RADIUS, debugId = 'enemy-bullet') {
    const bullet = this.add.circle(x, y, radius, color, 1);
    this.bullets.add(bullet);
    return this.configureEnemyBullet(bullet, angle, speed, color, radius, debugId, 'Phaser.GameObjects.Arc/full-circle/fresh');
  }

  private spawnLevelSevenBossOrb(x: number, y: number, angle: number, speed: number, color: number) {
    const radius = LEVEL_SEVEN_PHASE_BULLET_RADIUS;
    const orb = this.add.ellipse(x, y, radius * 2, radius * 2, color, 1);
    this.bullets.add(orb);
    return this.configureEllipseEnemyBullet(orb, angle, speed, color, radius, 'level7-boss-large-orb', 'Phaser.GameObjects.Ellipse/full-circle/fresh');
  }

  private configureEnemyBullet(bullet: Phaser.GameObjects.Arc, angle: number, speed: number, color: number, radius: number, debugId: string, assetType: string) {
    const visibleRadius = radius;
    bullet.setActive(true).setVisible(true).setData('grazed', false);
    bullet.setScale(1);
    bullet.setRadius(visibleRadius);
    bullet.setStartAngle(0, false);
    bullet.setEndAngle(360, false);
    bullet.setFillStyle(color, 1);
    bullet.setStrokeStyle(ENEMY_BULLET_STROKE_WIDTH, 0xffffff, 0.95);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    return this.configureEnemyBulletPhysics(bullet, angle, speed, radius, debugId, assetType);
  }

  private configureEllipseEnemyBullet(bullet: Phaser.GameObjects.Ellipse, angle: number, speed: number, color: number, radius: number, debugId: string, assetType: string) {
    bullet.setActive(true).setVisible(true).setData('grazed', false);
    bullet.setScale(1);
    bullet.setDisplaySize(radius * 2, radius * 2);
    bullet.setFillStyle(color, 1);
    bullet.setStrokeStyle(0, color, 0);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    return this.configureEnemyBulletPhysics(bullet, angle, speed, radius, debugId, assetType);
  }

  private configureEnemyBulletPhysics(bullet: Phaser.GameObjects.Arc | Phaser.GameObjects.Ellipse, angle: number, speed: number, visibleRadius: number, debugId: string, assetType: string) {
    const hitRadius = visibleRadius * ENEMY_BULLET_HITBOX_SCALE;
    const hitOffset = visibleRadius - hitRadius;
    bullet.setData('debugId', debugId);
    bullet.setData('assetType', assetType);
    bullet.setData('visibleRadius', visibleRadius);
    bullet.setData('hitRadius', hitRadius);
    bullet.setData('speed', speed);
    bullet.setData('angleDeg', Math.round(Phaser.Math.RadToDeg(angle)));
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.setCircle(hitRadius, hitOffset, hitOffset);
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    return bullet;
  }

  private firePlayerShot(time: number) {
    const upgradedFireMs = PLAYER_FIRE_MS * Math.pow(PLAYER_FIRE_RATE_UPGRADE, this.fireRateUpgrades);
    const fireDelay = Math.max(MIN_PLAYER_FIRE_MS, this.activePowerUp === 'rapid' ? upgradedFireMs * 0.65 : upgradedFireMs);
    if (time - this.lastPlayerFire < fireDelay) return;
    this.lastPlayerFire = time;

    const width = 8 + this.bulletSizeUpgrades * BULLET_SIZE_UPGRADE + (this.activePowerUp === 'big' ? 8 : 0);
    const height = 22 + this.bulletSizeUpgrades * (BULLET_SIZE_UPGRADE + 2) + (this.activePowerUp === 'big' ? 12 : 0);
    const speed = -(BASE_PLAYER_SHOT_SPEED + (this.activePowerUp === 'rapid' ? 140 : 0));
    const spreadChance = Math.min(0.45, this.spreadChanceUpgrades * SPREAD_CHANCE_UPGRADE);
    const shouldSpread = this.activePowerUp === 'spread' || Phaser.Math.FloatBetween(0, 1) < spreadChance;

    if (shouldSpread) {
      this.spawnPlayerShot(this.player.x - 8, this.player.y - 18, -95, speed * 0.93, width, height);
      this.spawnPlayerShot(this.player.x, this.player.y - 20, 0, speed, width, height);
      this.spawnPlayerShot(this.player.x + 8, this.player.y - 18, 95, speed * 0.93, width, height);
      this.playShootSound();
      return;
    }

    this.spawnPlayerShot(this.player.x, this.player.y - 18, 0, speed, width, height);
    this.playShootSound();
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

    if (this.enemyHp <= 0) {
      this.defeatEnemy();
      return;
    }

    this.playSfx('hit');

    if (this.shouldTriggerLevelFiveWall()) {
      this.startLevelFiveWallPhase();
    }

    if (this.shouldTriggerLevelSevenOrbPhase()) {
      this.startLevelSevenOrbPhase();
    }
  }

  private shouldTriggerLevelFiveWall() {
    if (!this.isLevelFiveBoss() || this.levelFiveWallUsed || this.levelFiveWallActive) return false;
    return this.enemyHp <= LEVELS[LEVEL_FIVE_INDEX].enemyHp / 2;
  }

  private defeatEnemy() {
    if (this.levelTransitioning || !this.enemy) return;
    this.levelTransitioning = true;
    const defeatedLevel = this.levelIndex;
    const defeatedEndless = this.isEndlessLevel();
    const nextLevel = defeatedEndless ? ENDLESS_INDEX : defeatedLevel + 1;
    const defeatedEnemy = this.enemy;
    const explosionX = defeatedEnemy.x;
    const explosionY = defeatedEnemy.y;
    const defeatedColor = this.currentLevelConfig().enemyColor;

    if (defeatedEndless) {
      this.endlessWave++;
      this.score += 35 + this.endlessWave * 5;
    } else {
      this.score += 10 * (defeatedLevel + 1);
    }
    this.enemyHp = 0;
    this.enemyFireEvent?.remove(false);
    this.enemyOverlap?.destroy();
    this.enemyOverlap = undefined;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const enemyBody = defeatedEnemy.body as Phaser.Physics.Arcade.Body | null;
    enemyBody?.setEnable(false);
    defeatedEnemy.setActive(false);
    this.clearProjectiles();
    this.updateHud();
    this.playEnemyExplosion(explosionX, explosionY, defeatedColor);

    const message = defeatedEndless
      ? `ENDLESS WAVE ${this.endlessWave} CLEARED`
      : nextLevel === ENDLESS_INDEX
        ? 'HIDDEN ENDLESS MODE UNLOCKED'
        : 'CHOOSE AN UPGRADE TO CONTINUE';
    const transitionText = this.add.text(PLAY_CENTER, HEIGHT / 2 + 48, message, {
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
      this.showUpgradeChoices(nextLevel);
    });
  }

  private showUpgradeChoices(nextLevel: number) {
    this.waitingForUpgradeChoice = true;
    this.levelTransitioning = true;
    this.clearProjectiles();
    const panelGlow = this.add.rectangle(0, 0, 780, 332, 0x7cf7ff, 0.05).setBlendMode(Phaser.BlendModes.ADD);
    const panel = this.add.rectangle(0, 0, 750, 306, 0x050714, 0.97).setStrokeStyle(2, 0x7cf7ff, 0.68);
    const title = this.add.text(0, -116, 'CHOOSE YOUR UPGRADE', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#7cf7ff',
      strokeThickness: 1
    }).setOrigin(0.5);
    const hint = this.add.text(0, -84, 'Click a card or press 1 / 2 / 3 / 4', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#a9bad1'
    }).setOrigin(0.5);

    const overlay = this.add.container(PLAY_CENTER, HEIGHT / 2 + 12, [panelGlow, panel, title, hint]);
    const choices: Array<{ kind: UpgradeKind; title: string; subtitle: string; description: string; color: number; icon: string }> = [
      { kind: 'speed', title: 'Faster Fire', subtitle: 'Rapid Core', description: '+15% fire rate', color: 0x7cf7ff, icon: '➜' },
      { kind: 'size', title: 'Heavy Peel', subtitle: 'Wide Rounds', description: '+4 shot size', color: 0xffd166, icon: '●' },
      { kind: 'spreadChance', title: 'Forked Fire', subtitle: 'Chaos Split', description: '+12% split chance', color: 0xc77dff, icon: '✦' },
      { kind: 'moveSpeed', title: 'Slipstream', subtitle: 'Nimble Drift', description: '+28 move speed', color: 0x9cff6a, icon: '◆' }
    ];

    let chosen = false;
    const choose = (kind: UpgradeKind) => {
      if (chosen) return;
      chosen = true;
      this.applyUpgrade(kind);
      this.input.keyboard?.off('keydown-ONE');
      this.input.keyboard?.off('keydown-TWO');
      this.input.keyboard?.off('keydown-THREE');
      this.input.keyboard?.off('keydown-FOUR');
      this.waitingForUpgradeChoice = false;
      overlay.destroy();
      this.startLevel(nextLevel);
    };

    choices.forEach((choice, index) => {
      const x = -270 + index * 180;
      const glow = this.add.rectangle(x, 34, 170, 160, choice.color, 0.06).setBlendMode(Phaser.BlendModes.ADD);
      const card = this.add.rectangle(x, 34, 160, 150, 0x11182a, 0.98)
        .setStrokeStyle(2, choice.color, 0.9)
        .setInteractive({ useHandCursor: true });
      const topLine = this.add.rectangle(x, -38, 132, 3, choice.color, 0.95).setBlendMode(Phaser.BlendModes.ADD);
      const icon = this.add.text(x, -10, choice.icon, { fontFamily: 'monospace', fontSize: '32px', color: '#ffffff', stroke: Phaser.Display.Color.IntegerToColor(choice.color).rgba, strokeThickness: 1 }).setOrigin(0.5);
      const numberBadge = this.add.circle(x - 60, -24, 14, choice.color, 0.92);
      const number = this.add.text(x - 60, -24, `${index + 1}`, { fontFamily: 'monospace', fontSize: '16px', color: '#050714' }).setOrigin(0.5);
      const cardTitle = this.add.text(x, 25, choice.title, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      const subtitle = this.add.text(x, 47, choice.subtitle.toUpperCase(), { fontFamily: 'monospace', fontSize: '10px', color: Phaser.Display.Color.IntegerToColor(choice.color).rgba }).setOrigin(0.5);
      const description = this.add.text(x, 70, choice.description, { fontFamily: 'monospace', fontSize: '12px', color: '#a9bad1' }).setOrigin(0.5);
      card.on('pointerdown', () => choose(choice.kind));
      card.on('pointerover', () => {
        card.setFillStyle(0x1c2742, 1);
        glow.setAlpha(0.18);
        icon.setScale(1.12);
        topLine.setDisplaySize(132, 3);
      });
      card.on('pointerout', () => {
        card.setFillStyle(0x11182a, 0.98);
        glow.setAlpha(0.08);
        icon.setScale(1);
        topLine.setDisplaySize(132, 3);
      });
      this.tweens.add({ targets: glow, alpha: 0.14, yoyo: true, repeat: -1, duration: 650 + index * 90 });
      overlay.add([glow, card, topLine, icon, numberBadge, number, cardTitle, subtitle, description]);
    });

    this.input.keyboard?.once('keydown-ONE', () => choose('speed'));
    this.input.keyboard?.once('keydown-TWO', () => choose('size'));
    this.input.keyboard?.once('keydown-THREE', () => choose('spreadChance'));
    this.input.keyboard?.once('keydown-FOUR', () => choose('moveSpeed'));
  }

  private applyUpgrade(kind: UpgradeKind) {
    if (kind === 'speed') this.fireRateUpgrades++;
    if (kind === 'size') this.bulletSizeUpgrades++;
    if (kind === 'spreadChance') this.spreadChanceUpgrades++;
    if (kind === 'moveSpeed') this.moveSpeedUpgrades++;
    this.updateHud();
  }

  private playEnemyExplosion(x: number, y: number, color: number) {
    this.enemy?.setVisible(false);
    this.playSfx('explosion');

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

  private checkPlayerBulletHit(bullet: Phaser.GameObjects.Arc | Phaser.GameObjects.Ellipse) {
    if (this.time.now < this.invulnerableUntil || this.gameOver || this.victory) return;
    if (!this.isBulletTouchingBanana(bullet)) return;
    this.hitByBullet(bullet);
  }

  private isBulletTouchingBanana(bullet: Phaser.GameObjects.Arc | Phaser.GameObjects.Ellipse) {
    const radius = Number(bullet.getData('hitRadius') || BULLET_RADIUS);

    return PLAYER_HIT_CIRCLES.some((circle) => {
      const hitX = this.player.x + circle.x;
      const hitY = this.player.y + circle.y;
      return Phaser.Math.Distance.Between(bullet.x, bullet.y, hitX, hitY) <= radius + circle.radius;
    });
  }

  private hitByBullet(bullet: Phaser.GameObjects.Arc | Phaser.GameObjects.Ellipse) {
    bullet.destroy();
    this.damagePlayer();
  }

  private damagePlayer() {
    this.hp--;
    this.invulnerableUntil = this.time.now + 1100;
    this.playSfx('damage');
    this.cameras.main.shake(120, 0.008);
    this.updateHud();
    if (this.hp <= 0) this.endGame();
  }

  private checkGrazes() {
    for (const obj of this.bullets.getChildren()) {
      const bullet = obj as Phaser.GameObjects.Arc | Phaser.GameObjects.Ellipse;
      if (!bullet.active || bullet.getData('grazed')) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, bullet.x, bullet.y);
      const radius = Number(bullet.getData('hitRadius') || BULLET_RADIUS);
      if (dist > PLAYER_RADIUS + radius && dist < GRAZE_RADIUS + radius) {
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

    const normalKinds: PowerUpKind[] = ['big', 'rapid', 'spread'];
    const kind: PowerUpKind = Phaser.Math.FloatBetween(0, 1) < BIO_POWER_UP_WEIGHT ? 'bio' : Phaser.Utils.Array.GetRandom(normalKinds);
    const colors: Record<PowerUpKind, number> = { big: 0xffd166, rapid: 0x7cf7ff, spread: 0xc77dff, bio: 0x9cff6a };
    const powerUp = this.powerUps.get(
      Phaser.Math.Clamp(x + Phaser.Math.Between(-120, 120), PLAY_X + 70, PLAY_RIGHT - 70),
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

    const glyphs: Record<PowerUpKind, string> = { big: '+', rapid: 'R', spread: 'S', bio: 'BIO' };
    const label = this.add.text(powerUp.x, powerUp.y, glyphs[kind], {
      fontFamily: 'monospace',
      fontSize: kind === 'bio' ? '11px' : '18px',
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
    this.applyPowerUp(kind, kind === 'bio' ? BIO_POWER_UP_DURATION_MS : POWER_UP_DURATION_MS);
    this.spawnPowerUpText(kind);
  }

  private applyPowerUp(kind: PowerUpKind, durationMs: number) {
    this.activePowerUp = kind;
    this.powerUpUntil = this.time.now + durationMs;
    if (kind === 'bio') {
      this.invulnerableUntil = Math.max(this.invulnerableUntil, this.powerUpUntil);
      this.showImmunityRing();
    } else {
      this.hideImmunityRing();
    }
    this.updateHud();
    this.playSfx('powerup', kind === 'bio' ? 1 : 0.85);
  }

  private activateDebugBioShield(time: number) {
    this.debugBioShieldActive = true;
    this.applyPowerUp('bio', DEBUG_BIO_SHIELD_MS);
    this.powerUpUntil = time + DEBUG_BIO_SHIELD_MS;
    this.invulnerableUntil = this.powerUpUntil;
    this.spawnPowerUpText('bio');
  }

  private refreshDebugBioShield(time: number) {
    if (!this.debugBioShieldActive || this.activePowerUp !== 'bio' || this.powerUpUntil - time > 1000) return;
    this.powerUpUntil = time + DEBUG_BIO_SHIELD_MS;
    this.invulnerableUntil = this.powerUpUntil;
    this.showImmunityRing();
    this.updateHud();
  }

  private deactivateDebugBioShield() {
    if (!this.debugBioShieldActive) return;
    this.debugBioShieldActive = false;
    if (this.activePowerUp === 'bio') {
      this.activePowerUp = undefined;
      this.powerUpUntil = 0;
      this.invulnerableUntil = this.time.now;
      this.hideImmunityRing();
      this.updateHud();
    }
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
    const labels: Record<PowerUpKind, string> = { big: 'BIG SHOTS', rapid: 'RAPID FIRE', spread: 'SPREAD SHOT', bio: 'BIO SHIELD' };
    const text = this.add.text(this.player.x, this.player.y - 34, labels[kind], {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#fff0a6',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.tweens.add({ targets: text, y: text.y - 24, alpha: 0, duration: 700, onComplete: () => text.destroy() });
  }

  private showImmunityRing() {
    this.hideImmunityRing();
    this.immunityRing = this.add.circle(this.player.x, this.player.y, 34, 0x9cff6a, 0)
      .setStrokeStyle(5, 0x9cff6a, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16);
    this.tweens.add({ targets: this.immunityRing, scale: 1.08, yoyo: true, repeat: -1, duration: 260 });
  }

  private hideImmunityRing() {
    this.immunityRing?.destroy();
    this.immunityRing = undefined;
  }

  private resumeAudio() {
    if (this.audioMuted) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.audioContext ??= new AudioContextClass();
    if (this.audioContext.state === 'suspended') void this.audioContext.resume();
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.03, delay = 0, endFrequency?: number) {
    if (this.audioMuted) return;
    this.resumeAudio();
    if (!this.audioContext) return;

    const start = this.audioContext.currentTime + delay;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency && endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume * SYNTH_VOLUME_SCALE, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private playSfx(key: string, volumeScale = 1) {
    if (this.audioMuted) return;
    if (!this.sound || !this.cache.audio.exists(key)) return;
    const base = SFX_VOLUMES[key] ?? 0.4;
    this.sound.play(key, { volume: base * volumeScale });
  }

  private playShootSound() {
    // Real laser SFX, kept very quiet since it fires constantly.
    this.playSfx('shoot');
  }

  private toggleMute() {
    this.audioMuted = !this.audioMuted;
    this.saveMutePreference(this.audioMuted);
    this.updateMuteText();
    if (this.sound) this.sound.mute = this.audioMuted;
    if (this.audioMuted) {
      if (this.audioContext && this.audioContext.state === 'running') void this.audioContext.suspend();
    } else {
      this.resumeAudio();
      this.playTone(660, 0.07, 'sine', 0.03);
    }
  }

  private updateMuteText() {
    this.muteText?.setText(this.audioMuted ? '\uD83D\uDD07 SOUND OFF (M)' : '\uD83D\uDD0A SOUND ON (M)');
    this.muteText?.setColor(this.audioMuted ? '#6f819a' : '#9cff6a');
  }

  private loadSavedMutePreference() {
    try {
      return window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private saveMutePreference(muted: boolean) {
    try {
      window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, muted ? '1' : '0');
    } catch {
      // ignore storage failures
    }
  }

  private updateImmunityRing() {
    if (this.activePowerUp !== 'bio' || !this.immunityRing) return;
    this.immunityRing.setPosition(this.player.x, this.player.y);
    const remaining = Math.max(0, this.powerUpUntil - this.time.now);
    this.immunityRing.setAlpha(remaining < 1200 && Math.floor(this.time.now / 110) % 2 === 0 ? 0.35 : 1);
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
      if (this.debugBioShieldActive && this.debugHitboxes) {
        this.refreshDebugBioShield(time);
        return;
      }
      this.activePowerUp = undefined;
      this.powerUpUntil = 0;
      this.hideImmunityRing();
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
    const labels: Record<PowerUpKind, string> = { big: 'Big Shots', rapid: 'Rapid Fire', spread: 'Spread Shot', bio: 'BIO Shield' };
    this.powerText?.setText(`${labels[this.activePowerUp]} ${seconds}s`);
  }

  private cleanupOffscreen() {
    const kill = (obj: Phaser.GameObjects.GameObject) => {
      const item = obj as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
      if (item.x < -60 || item.x > PLAY_RIGHT + 60 || item.y < -80 || item.y > HEIGHT + 80) obj.destroy();
    };
    this.bullets.getChildren().forEach(kill);
    this.playerShots.getChildren().forEach(kill);
  }

  private drawDebugHitboxes() {
    const graphics = this.debugHitboxGraphics;
    if (!graphics || !this.debugHitboxes) return;

    this.clearDebugBulletLabels();
    graphics.clear();
    graphics.lineStyle(2, 0x00ff66, 0.85);
    for (const circle of PLAYER_HIT_CIRCLES) {
      graphics.strokeCircle(this.player.x + circle.x, this.player.y + circle.y, circle.radius);
    }

    for (const obj of this.bullets.getChildren()) {
      const bullet = obj as Phaser.GameObjects.Arc | Phaser.GameObjects.Ellipse;
      if (!bullet.active || !bullet.visible) continue;
      const fallbackRadius = bullet instanceof Phaser.GameObjects.Arc ? bullet.radius : bullet.displayWidth / 2;
      const visibleRadius = Number(bullet.getData('visibleRadius') || fallbackRadius || BULLET_RADIUS);
      const hitRadius = Number(bullet.getData('hitRadius') || visibleRadius);
      const debugId = String(bullet.getData('debugId') || 'enemy-bullet');
      const assetType = String(bullet.getData('assetType') || 'unknown-asset');
      const speed = Math.round(Number(bullet.getData('speed') || 0));
      const angleDeg = Number(bullet.getData('angleDeg') || 0);

      graphics.lineStyle(1, 0xffffff, 0.28);
      graphics.strokeCircle(bullet.x, bullet.y, visibleRadius);
      graphics.lineStyle(2, 0xff3355, 0.88);
      graphics.strokeCircle(bullet.x, bullet.y, hitRadius);
      this.addDebugBulletLabel(bullet.x, bullet.y - visibleRadius - 12, `${debugId}\n${assetType}\nr${visibleRadius}/h${hitRadius} v${speed} a${angleDeg}`);
    }
  }

  private addDebugBulletLabel(x: number, y: number, label: string) {
    const text = this.add.text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#fff7a8',
      stroke: '#020712',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5).setDepth(41);
    this.debugBulletLabels.push(text);
  }

  private clearDebugBulletLabels() {
    this.debugBulletLabels.forEach((label) => label.destroy());
    this.debugBulletLabels = [];
  }

  private clearDebugHitboxOverlay() {
    this.debugHitboxGraphics?.clear();
    this.clearDebugBulletLabels();
  }

  private clearProjectiles() {
    this.clearDebugHitboxOverlay();
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
    const level = this.currentLevelConfig();
    this.scoreText?.setText(String(this.score).padStart(4, '0'));
    this.hpText?.setText(`HP ${'♥'.repeat(Math.max(0, this.hp))}`);
    this.levelText?.setText(this.levelProgressLabel());
    this.updateBossHealthBar(level);
    this.updatePowerUpHud();
    const spreadPct = Math.round(Math.min(0.45, this.spreadChanceUpgrades * SPREAD_CHANCE_UPGRADE) * 100);
    this.upgradeText?.setText(`FIRE RATE +${this.fireRateUpgrades}\nSHOT SIZE +${this.bulletSizeUpgrades}\nMOVE SPD  +${this.moveSpeedUpgrades}\nSPREAD    ${spreadPct}%`);
  }

  private updateBossHealthBar(level: LevelConfig) {
    const ratio = Phaser.Math.Clamp(this.enemyHp / Math.max(1, this.enemyMaxHp), 0, 1);
    this.bossBarFill?.setDisplaySize(548 * ratio, 16);
    this.bossBarFill?.setFillStyle(level.enemyColor, 1);
    this.bossNameText?.setText(this.isEndlessLevel() ? `${level.name} • Wave ${this.endlessWave + 1}` : `${level.name}`);
    this.bossBar?.setVisible(!this.victory);
    this.bossBarFill?.setVisible(!this.victory);
    this.bossNameText?.setVisible(!this.victory);
  }

  private endGame() {
    this.gameOver = true;
    this.enemyFireEvent?.remove(false);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.player.setTint(0xff3355);
    this.showLeaderboardOverlay('GAME OVER', '#ff5d73');
  }

  private endVictory() {
    this.victory = true;
    this.enemyFireEvent?.remove(false);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.enemy?.setVisible(false).setActive(false);
    this.showLeaderboardOverlay('VICTORY!', '#9cff6a');
  }

  private showLeaderboardOverlay(titleText: string, titleColor: string) {
    const qualifies = this.scoreQualifiesForLeaderboard();
    const panel = this.add.rectangle(0, 0, 600, 440, 0x050714, 0.94).setStrokeStyle(2, 0x7cf7ff, 0.85);
    const title = this.add.text(0, -192, titleText, { fontFamily: 'monospace', fontSize: '34px', color: titleColor }).setOrigin(0.5);
    const stats = this.add.text(0, -148, `Score: ${this.score}   Level: ${this.leaderboardLevel()}   Grazes: ${this.grazes}`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e8f8ff'
    }).setOrigin(0.5);
    const prompt = this.add.text(0, -118, qualifies ? 'NEW TOP 10! Enter your name:' : 'Not top 10 yet — keep dodging.', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: qualifies ? '#fff0a6' : '#a9bad1'
    }).setOrigin(0.5);
    const nameText = this.add.text(0, -91, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#fff0a6',
      backgroundColor: '#11182a',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5);
    const saveHint = this.add.text(0, -51, qualifies ? `Edit name (${LEADERBOARD_NAME_LIMIT} max), Enter to save • Esc to skip` : 'Press R to restart', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#c8f7ff'
    }).setOrigin(0.5);
    const statusText = this.add.text(0, -18, this.leaderboardStatus, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#a9bad1'
    }).setOrigin(0.5);
    const leaderboardText = this.add.text(0, 8, this.formatLeaderboard(), {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e8f8ff',
      align: 'left',
      lineSpacing: -2
    }).setOrigin(0.5, 0);

    if (!qualifies) {
      nameText.setVisible(false);
    }

    this.overlay = this.add.container(PLAY_CENTER, HEIGHT / 2, [panel, title, stats, prompt, nameText, saveHint, statusText, leaderboardText]);
    this.leaderboardNameEntryActive = qualifies;

    if (!qualifies) return;

    let playerName = this.lastLeaderboardName.slice(0, LEADERBOARD_NAME_LIMIT);
    const refreshName = () => nameText.setText(playerName || '_');
    refreshName();

    const finishNameEntry = (message: string) => {
      this.leaderboardNameEntryActive = false;
      prompt.setText(message);
      saveHint.setText('Press R to restart');
      nameText.setVisible(false);
    };

    const submitScore = () => {
      if (this.scoreSubmitted) return;
      const safeName = playerName.trim().slice(0, LEADERBOARD_NAME_LIMIT).toUpperCase();
      if (!safeName) {
        prompt.setText('Enter a name first, or Esc to skip');
        return;
      }
      this.lastLeaderboardName = safeName;
      this.saveLeaderboardName(safeName);
      this.scoreSubmitted = true;
      finishNameEntry(`Saved as ${safeName}!`);
      void this.submitSharedScore(safeName, statusText, leaderboardText);
    };

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.leaderboardNameEntryActive || this.scoreSubmitted) return;
      if (event.key === 'Enter') {
        submitScore();
        return;
      }
      if (event.key === 'Escape') {
        finishNameEntry('Skipped leaderboard submission');
        return;
      }
      if (event.key === 'Backspace') {
        playerName = playerName.slice(0, -1);
        refreshName();
        return;
      }
      if (event.key.length === 1 && /^[a-zA-Z0-9 _-]$/.test(event.key) && playerName.length < LEADERBOARD_NAME_LIMIT) {
        playerName += event.key;
        refreshName();
      }
    });
  }

  private loadSavedLeaderboardName() {
    try {
      const saved = (window.localStorage.getItem(LEADERBOARD_NAME_STORAGE_KEY) || '')
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .slice(0, LEADERBOARD_NAME_LIMIT)
        .toUpperCase();
      if (saved === 'BANANA') {
        window.localStorage.removeItem(LEADERBOARD_NAME_STORAGE_KEY);
        return '';
      }
      return saved;
    } catch {
      return this.lastLeaderboardName;
    }
  }

  private saveLeaderboardName(name: string) {
    try {
      window.localStorage.setItem(LEADERBOARD_NAME_STORAGE_KEY, name);
    } catch {
      // Name memory is only a convenience; gameplay should keep flowing if storage is blocked.
    }
  }

  private scoreQualifiesForLeaderboard() {
    const entries = this.getLeaderboard();
    if (entries.length < LEADERBOARD_LIMIT) return true;

    const cutoff = entries[LEADERBOARD_LIMIT - 1];
    if (this.score !== cutoff.score) return this.score > cutoff.score;
    if (this.leaderboardLevel() !== cutoff.level) return this.leaderboardLevel() > cutoff.level;
    return this.grazes > cutoff.grazes;
  }

  private getLeaderboard(): LeaderboardEntry[] {
    return [...this.sharedLeaderboard]
      .sort((a, b) => b.score - a.score || b.level - a.level || b.grazes - a.grazes)
      .slice(0, LEADERBOARD_LIMIT);
  }

  private async loadSharedLeaderboard() {
    if (!SHARED_LEADERBOARD_URL) {
      this.leaderboardStatus = 'Shared leaderboard not configured';
      return;
    }
    try {
      const response = await fetch(SHARED_LEADERBOARD_URL, { method: 'GET' });
      if (!response.ok) throw new Error(`leaderboard ${response.status}`);
      const data = await response.json();
      const entries = Array.isArray(data?.scores) ? data.scores : [];
      this.sharedLeaderboard = entries.filter((entry: LeaderboardEntry) => typeof entry?.score === 'number').slice(0, LEADERBOARD_LIMIT);
      this.leaderboardStatus = 'Shared leaderboard online';
      this.startLeaderboardText?.setText(this.formatStartLeaderboard());
      this.updateMiniLeaderboard();
    } catch {
      this.leaderboardStatus = 'Shared leaderboard unavailable';
      this.updateMiniLeaderboard()
    }
  }

  private async submitSharedScore(name: string, statusText: Phaser.GameObjects.Text, leaderboardText: Phaser.GameObjects.Text) {
    if (!SHARED_LEADERBOARD_URL) {
      this.leaderboardStatus = 'Shared leaderboard not configured';
      statusText.setText(this.leaderboardStatus);
      return;
    }
    statusText.setText('Submitting shared score...');
    try {
      const response = await this.sendSharedScore(name);
      if (!response.ok) throw new Error(`leaderboard ${response.status}`);
      const data = await response.json();
      const entries = Array.isArray(data?.scores) ? data.scores : [];
      this.sharedLeaderboard = entries.filter((entry: LeaderboardEntry) => typeof entry?.score === 'number').slice(0, LEADERBOARD_LIMIT);
      this.leaderboardStatus = 'Shared score saved';
      this.updateMiniLeaderboard();
    } catch {
      this.leaderboardStatus = 'Shared save failed; try again later';
      this.updateMiniLeaderboard();
    }
    statusText.setText(this.leaderboardStatus);
    leaderboardText.setText(this.formatLeaderboard());
  }

  private sendSharedScore(name: string) {
    const payload = { name, score: this.score, level: this.leaderboardLevel(), grazes: this.grazes };
    if (SHARED_LEADERBOARD_URL.includes('script.google.com')) {
      const url = new URL(SHARED_LEADERBOARD_URL);
      url.searchParams.set('action', 'submit');
      url.searchParams.set('name', payload.name);
      url.searchParams.set('score', String(payload.score));
      url.searchParams.set('level', String(payload.level));
      url.searchParams.set('grazes', String(payload.grazes));
      return fetch(url.toString(), { method: 'GET' });
    }

    return fetch(SHARED_LEADERBOARD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  private updateMiniLeaderboard() {
    this.miniLeaderboardText?.setText(this.formatMiniLeaderboard());
  }

  private formatMiniLeaderboard() {
    const entries = this.getLeaderboard().slice(0, 3);
    if (entries.length === 0) {
      return 'SYNCING...\nNo scores yet';
    }

    return entries.map((entry, index) => {
      const rank = `${index + 1}`.padStart(2, '0');
      const name = entry.name.slice(0, 8).padEnd(8, ' ');
      const score = String(entry.score).padStart(5, ' ');
      return `${rank}  ${name}  ${score}`;
    }).join('\n');
  }

  private formatLeaderboard() {
    const entries = this.getLeaderboard();
    const lines = ['SHARED LEADERBOARD'];
    if (entries.length === 0) {
      lines.push(SHARED_LEADERBOARD_URL ? 'No scores yet. Be the first banana.' : 'Leaderboard endpoint missing.');
      return lines.join('\n');
    }

    entries.slice(0, LEADERBOARD_LIMIT).forEach((entry, index) => {
      const rank = `${index + 1}.`.padEnd(3, ' ');
      const name = entry.name.padEnd(12, ' ');
      const score = String(entry.score).padStart(5, ' ');
      const date = this.formatLeaderboardDate(entry.date).padEnd(5, ' ');
      lines.push(`${rank} ${name} ${score}  ${date}  L${entry.level}`);
    });
    return lines.join('\n');
  }

  private formatLeaderboardDate(value: string) {
    const shortDate = value.match(/\b(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\b/);
    if (shortDate) return `${Number(shortDate[1])}/${Number(shortDate[2])}`;

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
    }

    return '--/--';
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
