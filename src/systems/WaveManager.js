import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';
import Enemy from '../entities/Enemy.js';

/** WaveManager — Düşman dalgalarını yönetir. */
export default class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.spawnTimer = 0;
    this.waveBreakTimer = 0;
    this.isWaveBreak = false;

    const corridorTop = CONFIG.CORRIDOR_TOP;
    const corridorBottom = CONFIG.CORRIDOR_BOTTOM;
    const laneCount = CONFIG.LANE_COUNT;
    const laneSpacing = (corridorBottom - corridorTop) / laneCount;
    // Tum lane'leri merkez noktalarinda tut
    this.lanes = Array.from({ length: laneCount }, (_, i) => corridorTop + laneSpacing * (i + 0.5));
    this.calculateWaveEnemies();
  }

  /** Bu wave bir boss dalgası mı? (her CONFIG.WAVES.bossEvery katında) */
  isBossWave(wave = GameState.wave.current) {
    const every = CONFIG.WAVES.bossEvery || 0;
    return every > 0 && wave % every === 0;
  }

  calculateWaveEnemies() {
    const wave = GameState.wave.current;
    GameState.wave.enemiesInWave = this.isBossWave(wave)
      ? 1 // boss dalgasında tek büyük düşman
      : Math.floor(CONFIG.WAVES.baseEnemiesPerWave + (wave - 1) * CONFIG.WAVES.enemiesPerWaveGrowth);
    GameState.wave.enemiesSpawned = 0;
    GameState.wave.enemiesKilled = 0;
  }

  getAvailableEnemyTypes() {
    const wave = GameState.wave.current;
    return Object.entries(CONFIG.WAVES.typeUnlocks)
      .filter(([, unlockWave]) => wave >= unlockWave)
      .map(([type]) => type);
  }

  selectEnemyType() {
    const available = this.getAvailableEnemyTypes();
    const weights = { skeleton: 40, armored: 20, fast: 20, foodCarrier: 15, elite: 5, shield: 10, splitter: 10, healer: 8 };
    let total = 0;
    const list = available.map(type => {
      const w = weights[type] || 10;
      total += w;
      return { type, weight: w };
    });
    let roll = Math.random() * total;
    for (const entry of list) { roll -= entry.weight; if (roll <= 0) return entry.type; }
    return available[0];
  }

  /** Boss rotasyonuna göre bu wave'deki boss tipini döndürür. */
  getBossType(wave) {
    const rotation = CONFIG.BOSS_ROTATION;
    if (!rotation || rotation.length === 0) return 'boss_tank';
    const every = CONFIG.WAVES.bossEvery || 10;
    const idx = Math.floor(wave / every) - 1; // wave=10→0, wave=20→1, ...
    return rotation[idx % rotation.length];
  }

  spawnEnemy() {
    // Boss dalgası: orta şeritte tek büyük boss, girişinde duyuru
    if (this.isBossWave()) {
      const bossType = this.getBossType(GameState.wave.current);
      const boss = this.scene.enemyPool.acquire(this.scene, bossType, GameState.wave.current, this.lanes[1], { boss: true });
      this.enemies.push(boss);
      GameState.wave.enemiesSpawned++;
      this.scene.events.emit('boss-wave', { wave: GameState.wave.current, bossType });
      return;
    }
    const type = this.selectEnemyType();
    const laneY = this.lanes[Math.floor(Math.random() * this.lanes.length)];
    const enemy = this.scene.enemyPool.acquire(this.scene, type, GameState.wave.current, laneY);
    this.enemies.push(enemy);
    GameState.wave.enemiesSpawned++;
  }

  /** Splitter ölünce küçük çocukları öldüğü yerde spawn eder. */
  spawnChildren(data) {
    const corridorTop = CONFIG.CORRIDOR_TOP;
    const corridorBottom = CONFIG.CORRIDOR_BOTTOM;
    const n = data.count || 2;
    for (let i = 0; i < n; i++) {
      const spread = i - (n - 1) / 2;
      const childY = Math.max(corridorTop, Math.min(corridorBottom, data.y + spread * 18));
      const child = this.scene.enemyPool.acquire(this.scene, 'splitter', data.wave, childY, {
        hpFactor: data.hpFactor, rewardFactor: data.rewardFactor, scale: data.scale,
        noSplit: true, child: true, spawnX: data.x + spread * 6,
      });
      this.enemies.push(child);
    }
  }

  completeWave() {
    const completedWave = GameState.wave.current;
    GameState.stats.totalWavesCompleted++;
    GameState.wave.current++;
    this.scene.events.emit('wave-complete', {
      completedWave,
      nextWave: GameState.wave.current,
    });
    this.scene.game.events.emit('sfx', 'waveComplete');
    this.isWaveBreak = true;
    this.waveBreakTimer = CONFIG.WAVES.timeBetweenWaves;
    this.calculateWaveEnemies();

    // Milestone kontrolü
    const mc = CONFIG.MILESTONE;
    if (mc && completedWave > 0 && completedWave % mc.milestoneInterval === 0) {
      const milestoneIndex = completedWave / mc.milestoneInterval; // 1,2,3,...
      const isBig = milestoneIndex % mc.bigMilestoneEvery === 0;
      const mult = isBig ? mc.bigMultiplier : 1;
      // Mevcut ölçülen kazanım hızı ile bonus hesapla (saniye cinsinden)
      // expRate/foodRate: ölçülen gerçek kazanım hızı (0 ise wave'e göre fallback)
      const waveFallback = completedWave * 0.5; // wave başına ~0.5 exp/s kaba tahmin
      const expReward  = Math.floor((GameState.meta.expRate  || waveFallback) * mc.expBonus  * mult);
      const foodReward = Math.floor((GameState.meta.foodRate || waveFallback * 0.3) * mc.foodBonus * mult);
      GameState.resources.exp  += expReward;
      GameState.resources.food += foodReward;
      GameState.stats.totalExpEarned  += expReward;
      GameState.stats.totalFoodEarned += foodReward;
      this.scene.game.events.emit('sfx', isBig ? 'bigMilestone' : 'milestone');
      this.scene.events.emit('wave-milestone', {
        wave: completedWave, isBig, expReward, foodReward,
      });
    }
  }

  update(delta) {
    const deltaMs = delta * 1000;
    if (this.isWaveBreak) {
      this.waveBreakTimer -= deltaMs;
      if (this.waveBreakTimer <= 0) { this.isWaveBreak = false; this.spawnTimer = 0; }
      this.updateEnemies(delta);
      return;
    }
    this.spawnTimer -= deltaMs;
    if (this.spawnTimer <= 0 && GameState.wave.enemiesSpawned < GameState.wave.enemiesInWave) {
      this.spawnEnemy();
      this.spawnTimer = CONFIG.WAVES.timeBetweenSpawns;
    }
    this.updateEnemies(delta);
    if (GameState.wave.enemiesSpawned >= GameState.wave.enemiesInWave && this.enemies.length === 0) {
      this.completeWave();
    }
  }

  updateEnemies(delta) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(delta, this.enemies);
      if (!e.alive && !e.dying) { this.enemies.splice(i, 1); this.scene.enemyPool.release(e); }
    }
  }

  clearAll() {
    this.enemies.forEach(e => this.scene.enemyPool.release(e));
    this.enemies = [];
    this.spawnTimer = 0;
    this.waveBreakTimer = 0;
    this.isWaveBreak = false;
  }
}
