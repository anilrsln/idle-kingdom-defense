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

    const corridorTop = 150;
    const corridorBottom = CONFIG.CANVAS_HEIGHT - CONFIG.LAVA_HEIGHT - 30;
    const laneSpacing = (corridorBottom - corridorTop) / 4;
    this.lanes = [1, 2, 3].map(i => corridorTop + laneSpacing * i);
    this.calculateWaveEnemies();
  }

  calculateWaveEnemies() {
    const wave = GameState.wave.current;
    GameState.wave.enemiesInWave = Math.floor(
      CONFIG.WAVES.baseEnemiesPerWave + (wave - 1) * CONFIG.WAVES.enemiesPerWaveGrowth
    );
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
    const weights = { skeleton: 40, armored: 20, fast: 20, foodCarrier: 15, elite: 5 };
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

  spawnEnemy() {
    const type = this.selectEnemyType();
    const laneY = this.lanes[Math.floor(Math.random() * this.lanes.length)];
    const enemy = new Enemy(this.scene, type, GameState.wave.current, laneY);
    this.enemies.push(enemy);
    GameState.wave.enemiesSpawned++;
  }

  completeWave() {
    GameState.stats.totalWavesCompleted++;
    GameState.wave.current++;
    this.scene.events.emit('wave-complete', {
      completedWave: GameState.wave.current - 1,
      nextWave: GameState.wave.current,
    });
    this.isWaveBreak = true;
    this.waveBreakTimer = CONFIG.WAVES.timeBetweenWaves;
    this.calculateWaveEnemies();
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
      e.update(delta);
      if (!e.alive && !e.dying) this.enemies.splice(i, 1);
    }
  }

  clearAll() {
    this.enemies.forEach(e => e.destroy());
    this.enemies = [];
    this.spawnTimer = 0;
    this.waveBreakTimer = 0;
    this.isWaveBreak = false;
  }
}
