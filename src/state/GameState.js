/**
 * GameState.js — Merkezi durum yönetimi (singleton).
 * Tüm oyun verisi bu obje üzerinde tutulur.
 */
const GameState = {
  resources: { exp: 0, food: 0 },
  wave: {
    current: 1, enemiesInWave: 5,
    enemiesSpawned: 0, enemiesKilled: 0, inProgress: true,
  },
  defenders: {
    laser: {
      damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 },
    },
    archer: {
      unlocked: false, count: 0, maxCount: 5,
      damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 },
    },
    cannon: {
      unlocked: false, canBeHired: false, count: 0, maxCount: 3,
      damage: { level: 1 }, blastRadius: { level: 1 }, reloadSpeed: { level: 1 },
    },
  },
  conquestMap: {
    unlockedNodes: [],
    bonuses: {
      // defenderBoost: { laser: { damage: 0 }, archer: { damage: 0 }, cannon: { damage: 0 } }
      // globalBonus: { damage: 0 }
      // economy: { expMultiplier: 0, foodMultiplier: 0 }
    },
  },
  prestige: { unlocked: false, count: 0, multiplier: 1.0 },
  stats: {
    totalEnemiesKilled: 0, totalExpEarned: 0,
    totalFoodEarned: 0, totalWavesCompleted: 0,
  },
  meta: { lastSaveTime: Date.now(), totalPlayTime: 0, saveVersion: 1 },
};

export function resetForPrestige(state) {
  state.resources.exp = 0;
  state.resources.food = 0;
  state.wave = { current: 1, enemiesInWave: 5, enemiesSpawned: 0, enemiesKilled: 0, inProgress: true };
  state.defenders.laser = { damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 } };
  state.defenders.archer = { unlocked: false, count: 0, maxCount: 5, damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 } };
  state.defenders.cannon = { unlocked: false, canBeHired: false, count: 0, maxCount: 3, damage: { level: 1 }, blastRadius: { level: 1 }, reloadSpeed: { level: 1 } };
  state.conquestMap.unlockedNodes = [];
}

export default GameState;
