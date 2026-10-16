import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';
import WaveManager from '../systems/WaveManager.js';
import IdleManager from '../systems/IdleManager.js';
import SaveManager from '../systems/SaveManager.js';
import AchievementManager from '../systems/AchievementManager.js';
import ComboManager from '../systems/ComboManager.js';
import LaserMonument from '../entities/LaserMonument.js';
import Archer from '../entities/Archer.js';
import Cannon from '../entities/Cannon.js';
import FrostTower from '../entities/FrostTower.js';
import Catapult from '../entities/Catapult.js';
import { formatNumber } from '../utils/NumberFormatter.js';
import AssetProvider from '../systems/AssetProvider.js';
import { t as i18n } from '../i18n/index.js';
import Enemy from '../entities/Enemy.js';
import Projectile from '../entities/Projectile.js';
import ObjectPool from '../systems/ObjectPool.js';

/**
 * GameScene — Ana savaş alanı.
 * Duvar, lavalar, şeritler, savunucular, dalga yönetimi.
 */
export default class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    // Oyun gerçekten başladı — otomatik kaydı burada başlat
    // (menüdeyken kaydın bozulmaması için Boot'tan buraya taşındı)
    SaveManager.startAutoSave();

    // Nesne havuzları — Enemy ve Projectile recycling (Faz 10 object pooling).
    // GameScene ömrü boyunca yaşar; shutdown'da drain edilir.
    this.enemyPool = new ObjectPool((pool, ...args) => new Enemy(...args));
    this.projectilePool = new ObjectPool((pool, ...args) => new Projectile(...args));
    this.events.once('shutdown', () => {
      this.enemyPool?.drain();
      this.projectilePool?.drain();
    });

    AssetProvider.createAnims(this);
    this.drawBackground();
    this.drawWall();
    this.drawLava();
    this.drawLanes();

    // Savunucular
    this.laserMonument = new LaserMonument(this, CONFIG.WALL_X + 40, Math.round((CONFIG.CORRIDOR_TOP + CONFIG.CORRIDOR_BOTTOM) / 2));
    this.archers = [];
    this.cannons = [];
    this.frostTowers = [];
    this.catapults = [];

    // Dalga yöneticisi
    this.waveManager = new WaveManager(this);

    // Floating text listesi
    this.floatingTexts = [];

    // Event dinleyicileri
    this.events.on('enemy-killed', this.onEnemyKilled, this);
    this.events.on('wave-complete', this.onWaveComplete, this);
    this.events.on('boss-wave', this.onBossWave, this);

    // Kritik vuruş bildirimi
    this.game.events.off('crit-hit', this.onCritHit, this);
    this.game.events.on('crit-hit', this.onCritHit, this);
    this.events.once('shutdown', () => this.game.events.off('crit-hit', this.onCritHit, this));

    // Combo yeni oyun/sahne başında sıfır
    ComboManager.reset();

    // Dev panel: belirli bir wave'e atla
    this.game.events.off('dev-jump-wave', this.onDevJumpWave, this);
    this.game.events.on('dev-jump-wave', this.onDevJumpWave, this);
    this.events.once('shutdown', () => this.game.events.off('dev-jump-wave', this.onDevJumpWave, this));

    // Upgrade alınınca ilgili savunucu(lar) kısa bir pulse yapsın
    this.game.events.off('defender-upgraded', this.onDefenderUpgraded, this);
    this.game.events.on('defender-upgraded', this.onDefenderUpgraded, this);
    this.events.once('shutdown', () => this.game.events.off('defender-upgraded', this.onDefenderUpgraded, this));

    // Splitter: ölünce çocuklar spawn olur
    this.game.events.off('enemy-split', this.onEnemySplit, this);
    this.game.events.on('enemy-split', this.onEnemySplit, this);
    this.events.once('shutdown', () => this.game.events.off('enemy-split', this.onEnemySplit, this));

    // UIScene'i başlat
    this.scene.launch('UIScene');

    // Idle kazancı varsa popup göster
    const idleEarnings = this.registry.get('idleEarnings');
    if (idleEarnings) {
      this.registry.remove('idleEarnings');
      this.showIdlePopup(idleEarnings);
    }

    // Kazanım hızı örnekleyici başlangıcı (idle için gerçek EXP/Food/sn)
    this._rateSampleTime = 0;
    this._lastRateExp = GameState.stats.totalExpEarned;
    this._lastRateFood = GameState.stats.totalFoodEarned;
  }

  /** Idle gelir popup'ı gösterir. */
  showIdlePopup(earnings) {
    const cx = CONFIG.CANVAS_WIDTH / 2;
    const cy = CONFIG.CANVAS_HEIGHT / 2;

    // Arka plan
    const bg = this.add.rectangle(cx, cy, 320, 180, 0x0a0a2a, 0.95).setDepth(300).setStrokeStyle(2, 0xffd700);
    const hours = Math.floor(earnings.elapsedSeconds / 3600);
    const mins = Math.floor((earnings.elapsedSeconds % 3600) / 60);
    const timeStr = hours > 0 ? i18n('idle.timeHM', { h: hours, m: mins }) : i18n('idle.timeM', { m: mins });

    const title = this.add.text(cx, cy - 60, i18n('idle.welcomeBack'), {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(301);

    const info = this.add.text(cx, cy - 25, i18n('idle.awayFor', { time: timeStr }), {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaaaaa',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(301);

    const expLine = this.add.text(cx, cy + 5, i18n('idle.expGain', { n: formatNumber(earnings.exp) }), {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(301);

    const foodLine = this.add.text(cx, cy + 30, i18n('idle.foodGain', { n: formatNumber(earnings.food) }), {
      fontSize: '16px', fontFamily: 'monospace', color: '#66ff66',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(301);

    // Topla butonu
    const collectBtn = this.add.rectangle(cx, cy + 65, 120, 30, 0x1a6a1a).setDepth(302).setInteractive({ useHandCursor: true });
    const collectLabel = this.add.text(cx, cy + 65, i18n('idle.collect'), {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(303);

    collectBtn.on('pointerover', () => collectBtn.setFillStyle(0x2a8a2a));
    collectBtn.on('pointerout', () => collectBtn.setFillStyle(0x1a6a1a));
    collectBtn.on('pointerdown', () => {
      IdleManager.applyEarnings(earnings);
      // Toplanan lump'ı kazanım hızına saymamak için baseline'ı güncelle
      this._lastRateExp = GameState.stats.totalExpEarned;
      this._lastRateFood = GameState.stats.totalFoodEarned;
      // Elementleri temizle
      [bg, title, info, expLine, foodLine, collectBtn, collectLabel].forEach(el => el.destroy());
    });
  }

  // ═══════════════ Çizim ═══════════════
  drawBackground() {
    const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;

    // Gökyüzü — hafif dikey degrade (üst koyu → ufka doğru biraz açılır)
    const sky = this.add.graphics().setDepth(0);
    sky.fillGradientStyle(
      CONFIG.COLORS.SKY_TOP, CONFIG.COLORS.SKY_TOP,
      CONFIG.COLORS.SKY_BOTTOM, CONFIG.COLORS.SKY_BOTTOM, 1
    );
    sky.fillRect(0, 0, W, H);

    // Zemin bandı (koridor) — gökyüzüyle aynı aileden, bir tık koyu lacivert
    const groundTop = CONFIG.CORRIDOR_BOTTOM - 100;  // zemin bandi oyun alaninin altini kaplar
    const groundH = 150;
    this.add.rectangle(W / 2, groundTop + groundH / 2, W, groundH, CONFIG.COLORS.GROUND).setDepth(0);

    // Ufuk / zemin üst kenarı — ince vurgu çizgisi
    this.add.rectangle(W / 2, groundTop, W, 2, CONFIG.COLORS.GROUND_EDGE, 0.6).setDepth(0);
  }

  drawWall() {
    const wallH = CONFIG.CORRIDOR_BOTTOM - CONFIG.CORRIDOR_TOP;
    // Ana duvar
    const wallCenterY = CONFIG.CORRIDOR_TOP + wallH / 2;
    this.add.rectangle(CONFIG.WALL_X, wallCenterY, 36, wallH, CONFIG.COLORS.WALL).setDepth(2);
    // Üst kısım
    this.add.rectangle(CONFIG.WALL_X, CONFIG.CORRIDOR_TOP, 40, 8, CONFIG.COLORS.WALL_TOP).setDepth(3);

    // Tuğla deseni
    const brickG = this.add.graphics().setDepth(3);
    brickG.lineStyle(1, 0x3a3a5a, 0.4);
    for (let row = 0; row < wallH / 12; row++) {
      const by = CONFIG.CORRIDOR_TOP + row * 12;
      brickG.lineBetween(CONFIG.WALL_X - 15, by, CONFIG.WALL_X + 15, by);
      const offset = row % 2 === 0 ? 0 : 10;
      for (let bx = CONFIG.WALL_X - 15 + offset; bx < CONFIG.WALL_X + 15; bx += 20) {
        brickG.lineBetween(bx, by, bx, by + 12);
      }
    }
  }

  drawLava() {
    // Lava: lazer (WALL_X+40) hemen sağında, corridor boyunca dikey ateş şeridi
    const laserX = CONFIG.WALL_X + 40;
    const lavaW = 18;
    const lavaCX = laserX + 22 + lavaW / 2;  // lazer sağından 22px boşluk (biraz daha sağa)
    const lavaH = CONFIG.CORRIDOR_BOTTOM - CONFIG.CORRIDOR_TOP;
    const lavaCY = CONFIG.CORRIDOR_TOP + lavaH / 2;

    // CONFIG.LAVA_X'i runtime'da güncelle — Enemy trigger buradan okur
    CONFIG.LAVA_X = Math.round(lavaCX - lavaW / 2);

    this.lavaRect = this.add.rectangle(
      lavaCX, lavaCY, lavaW, lavaH, CONFIG.COLORS.LAVA
    ).setDepth(3).setAlpha(0.75);

    this.tweens.add({
      targets: this.lavaRect, alpha: 0.45,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Glow: sağ tarafında ince şerit
    const glowRect = this.add.rectangle(
      lavaCX + lavaW / 2 + 3, lavaCY, 6, lavaH, CONFIG.COLORS.LAVA_GLOW
    ).setDepth(3).setAlpha(0.4);
    this.tweens.add({
      targets: glowRect, alpha: 0.12,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  drawLanes() {
    const g = this.add.graphics().setDepth(1);
    const corridorTop = CONFIG.CORRIDOR_TOP;
    const corridorBottom = CONFIG.CORRIDOR_BOTTOM;
    const laneCount = CONFIG.LANE_COUNT;
    const laneSpacing = (corridorBottom - corridorTop) / laneCount;

    g.lineStyle(1, CONFIG.COLORS.GROUND_LIGHT, 0.25);
    for (let i = 0; i <= laneCount; i++) {
      const y = corridorTop + laneSpacing * i;
      g.lineBetween(0, y, CONFIG.CANVAS_WIDTH, y);
    }
  }

  // ═══════════════ Güncelleme ═══════════════
  update(time, deltaMs) {
    // Oyun hızı çarpanı (dev panel) — tüm simülasyona uygulanır
    const delta = (deltaMs / 1000) * (CONFIG.DEBUG?.timeScale ?? 1);

    // Dalga yöneticisi
    this.waveManager.update(delta);

    // Tüm düşmanlar listesi
    const enemies = this.waveManager.enemies;

    // Laser Monument (her zaman aktif)
    this.laserMonument.update(delta, enemies);

    // Archers
    this.syncDefenders('archer', this.archers, Archer);
    for (const a of this.archers) a.update(delta, enemies);

    // Cannons
    this.syncDefenders('cannon', this.cannons, Cannon);
    for (const c of this.cannons) c.update(delta, enemies);

    // Frost Towers
    this.syncDefenders('frost', this.frostTowers, FrostTower);
    for (const f of this.frostTowers) f.update(delta, enemies);

    // Catapults
    this.syncDefenders('catapult', this.catapults, Catapult);
    for (const ct of this.catapults) ct.update(delta, enemies);

    // Floating text güncelleme
    this.updateFloatingTexts(delta);

    // Combo penceresi
    ComboManager.update(delta);

    // Başarım kontrolü (gerçek zamanlı ~1 sn'de bir)
    this._achvTimer = (this._achvTimer ?? 0) - deltaMs / 1000;
    if (this._achvTimer <= 0) { this._achvTimer = 1; AchievementManager.check(); }

    // Kazanım hızı örnekleme (idle gelir için gerçek EXP/Food/sn, EMA ile)
    this._rateSampleTime = (this._rateSampleTime ?? 0) + deltaMs / 1000;
    if (this._rateSampleTime >= 2) {
      const dt = this._rateSampleTime;
      const dExp = Math.max(0, GameState.stats.totalExpEarned - (this._lastRateExp ?? GameState.stats.totalExpEarned));
      const dFood = Math.max(0, GameState.stats.totalFoodEarned - (this._lastRateFood ?? GameState.stats.totalFoodEarned));
      const a = 0.3; // EMA yumuşatma
      GameState.meta.expRate = (GameState.meta.expRate || 0) * (1 - a) + (dExp / dt) * a;
      GameState.meta.foodRate = (GameState.meta.foodRate || 0) * (1 - a) + (dFood / dt) * a;
      this._lastRateExp = GameState.stats.totalExpEarned;
      this._lastRateFood = GameState.stats.totalFoodEarned;
      this._rateSampleTime = 0;
    }
  }

  /** Savunucu sayısını GameState ile senkronize eder. */
  syncDefenders(type, list, DefenderClass) {
    const state = GameState.defenders[type];
    const targetCount = state.count || 0;

    while (list.length < targetCount) {
      const idx = list.length;
      const corridorTop = CONFIG.CORRIDOR_TOP;
      const corridorBottom = CONFIG.CORRIDOR_BOTTOM;
      const laneCount = CONFIG.LANE_COUNT;
      // Kolon x'leri: archer duvarda, diger tipler surun arkasinda
      // Archer: sur ustunde | Cannon/Frost/Catapult: surun solunda (kale arkasi)
      const colX = { archer: CONFIG.WALL_X, cannon: 118, frost: 68, catapult: 28 };
      const x = colX[type] ?? (CONFIG.DEFENDER_X + 15);
      const laneSpacing = (corridorBottom - corridorTop) / laneCount;
      let y;
      if (type === 'catapult') {
        // Catapult: lane araları 2.5 ve 3.5 (şeritlerin tam ortasında, simetrik)
        const catapultLanes = [2.5, 3.5];
        const lanePos = catapultLanes[idx % catapultLanes.length] ?? 2.5;
        y = corridorTop + laneSpacing * lanePos;
      } else {
        // Diğerleri: ortadan köşeye açılan sıra (0→orta, 1→orta-1, 2→orta+1, ...)
        const midLane = Math.floor(laneCount / 2);
        const offsets = [0, -1, 1, -2, 2, -3, 3];
        const laneIdx = midLane + (offsets[idx] ?? idx);
        const clampedLane = Phaser.Math.Clamp(laneIdx, 0, laneCount - 1);
        y = corridorTop + laneSpacing * (clampedLane + 0.5);
      }
      list.push(new DefenderClass(this, x, y, idx));
    }

    while (list.length > targetCount) {
      const removed = list.pop();
      removed.destroy();
    }
  }

  // ═══════════════ Olaylar ═══════════════
  onEnemyKilled(data) {
    if (data.exp > 0) {
      this.showFloatingText(i18n('game.expGain', { n: Math.floor(data.exp) }), data.x, data.y - 10, CONFIG.COLORS.UI_GOLD);
    }
    if (data.food > 0) {
      this.showFloatingText(i18n('game.foodGain', { n: Math.floor(data.food) }), data.x, data.y + 5, CONFIG.COLORS.ENEMY_FOOD);
    }
    // Ölüm parçacık efekti
    this.spawnDeathParticles(data.x, data.y, data.killedBy);
    // Elite / boss ölümünde kamera sarsıntısı (boss daha güçlü)
    if (CONFIG.FX?.screenShake && (data.type === 'elite' || data.type === 'boss')) {
      const big = data.type === 'boss';
      this.cameras.main.shake(big ? 350 : 180, big ? 0.016 : 0.008);
    }
    if (data.type === 'boss') {
      this.showFloatingText(i18n('game.bossDefeated'), CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 40, 0xffd700, 26, 1800);
    }
  }

  /** Kritik vuruşta "CRIT!" bildirimi. */
  onCritHit(data) {
    this.showFloatingText(i18n('game.crit'), data.x, data.y - 16, 0xff8800, 16, 700);
  }

  /** Boss dalgası girişinde duyuru. */
  onBossWave(data) {
    const bossName = data.bossType ? i18n(`enemy.${data.bossType}`) : i18n('game.boss');
    this.showFloatingText(i18n('game.bossWave', { boss: bossName, wave: data.wave }), CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 50, 0xff4444, 24, 2000);
    this.game.events.emit('sfx', 'prestige');
  }

  /** Basit ölüm parçacık efekti. */
  spawnDeathParticles(x, y, killedBy) {
    const color = killedBy === 'lava' ? CONFIG.COLORS.LAVA : 0xffffff;
    const count = killedBy === 'lava' ? 4 : 6;
    for (let i = 0; i < count; i++) {
      const px = x + (Math.random() - 0.5) * 10;
      const py = y + (Math.random() - 0.5) * 10;
      const size = 2 + Math.random() * 3;
      const p = this.add.circle(px, py, size, color, 0.8).setDepth(40);
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      this.tweens.add({
        targets: p,
        x: px + Math.cos(angle) * dist,
        y: py + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  onWaveComplete(data) {
    this.showFloatingText(
      i18n('game.waveComplete', { n: data.completedWave }),
      CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 30,
      0xffd700, 24, 1500
    );
  }

  /** Upgrade geri bildirimi: ilgili savunucu sprite'larını kısa pulse ile büyüt. */
  onDefenderUpgraded(data) {
    const type = data && data.type;
    const list = type === 'laser' ? [this.laserMonument]
      : type === 'archer' ? this.archers
      : type === 'cannon' ? this.cannons : [];
    for (const d of list) {
      if (!d || !d.sprite) continue;
      this.tweens.add({
        targets: d.sprite, scaleX: 1.35, scaleY: 1.35,
        duration: 110, yoyo: true, ease: 'Quad.easeOut',
      });
    }
  }

  /** Splitter öldü — WaveManager çocukları spawn etsin. */
  onEnemySplit(data) {
    if (this.waveManager) this.waveManager.spawnChildren(data);
  }

  /** Dev panel: belirli bir wave'e atla. */
  onDevJumpWave(n) {
    const wave = Math.max(1, Math.floor(n) || 1);
    GameState.wave.current = wave;
    if (this.waveManager) {
      this.waveManager.clearAll();
      this.waveManager.calculateWaveEnemies();
    }
    this.showFloatingText(i18n('game.nextWave', { n: wave }), CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 30, 0x00ffff, 22, 1200);
  }

  showFloatingText(text, x, y, color = 0xffffff, size = 14, duration = 800) {
    const t = this.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'monospace',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50).setAlpha(1).setScale(0.4);

    // Pop: hızlı yaylanarak büyü
    this.tweens.add({ targets: t, scaleX: 1, scaleY: 1, duration: 160, ease: 'Back.easeOut' });
    // Yüksel + solup kaybol
    this.tweens.add({
      targets: t, y: y - 30, alpha: 0, duration,
      ease: 'Power1',
      onComplete: () => t.destroy(),
    });
  }

  updateFloatingTexts(_delta) {
    // Tweens yönetiyor, ekstra bir şeye gerek yok
  }
}
