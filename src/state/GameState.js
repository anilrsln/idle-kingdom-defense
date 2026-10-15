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
    frost: {
      unlocked: false, canBeHired: false, count: 0, maxCount: 3,
      damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 },
    },
    catapult: {
      unlocked: false, canBeHired: false, count: 0, maxCount: 2,
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
  economy: { expBoost: { level: 0 }, foodBoost: { level: 0 } }, // run içi ekonomi upgrade'leri
  prestige: { unlocked: false, count: 0, multiplier: 1.0 },
  settings: { soundEnabled: true, masterVolume: 0.5 },
  stats: {
    totalEnemiesKilled: 0, totalExpEarned: 0,
    totalFoodEarned: 0, totalWavesCompleted: 0, bossesKilled: 0,
  },
  achievements: { unlocked: [] },
  // expRate/foodRate: oynarken ölçülen gerçek kazanım hızı (idle için kullanılır)
  meta: { lastSaveTime: Date.now(), totalPlayTime: 0, saveVersion: 1, expRate: 0, foodRate: 0 },
};

/**
 * Tüm oynanışı sıfırdan başlatır (Yeni Oyun).
 * Kayıt + prestige dahil her şey sıfırlanır; yalnızca ses ayarları (settings) korunur.
 */
export function resetAll(state) {
  state.resources = { exp: 0, food: 0 };
  state.wave = { current: 1, enemiesInWave: 5, enemiesSpawned: 0, enemiesKilled: 0, inProgress: true };
  state.defenders = {
    laser: { damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 } },
    archer: { unlocked: false, count: 0, maxCount: 5, damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 } },
    cannon: { unlocked: false, canBeHired: false, count: 0, maxCount: 3, damage: { level: 1 }, blastRadius: { level: 1 }, reloadSpeed: { level: 1 } },
    frost: { unlocked: false, canBeHired: false, count: 0, maxCount: 3, damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 } },
    catapult: { unlocked: false, canBeHired: false, count: 0, maxCount: 2, damage: { level: 1 }, blastRadius: { level: 1 }, reloadSpeed: { level: 1 } },
  };
  state.conquestMap = { unlockedNodes: [], bonuses: {} };
  state.economy = { expBoost: { level: 0 }, foodBoost: { level: 0 } };
  state.prestige = { unlocked: false, count: 0, multiplier: 1.0 };
  state.stats = { totalEnemiesKilled: 0, totalExpEarned: 0, totalFoodEarned: 0, totalWavesCompleted: 0, bossesKilled: 0 };
  state.achievements = { unlocked: [] };
  state.meta = { ...state.meta, lastSaveTime: Date.now(), totalPlayTime: 0, expRate: 0, foodRate: 0 };
  // settings (ses) korunur; başarımlar Yeni Oyun'da sıfırlanır, prestige'de korunur
}

export function resetForPrestige(state) {
  state.resources.exp = 0;
  state.resources.food = 0;
  state.wave = { current: 1, enemiesInWave: 5, enemiesSpawned: 0, enemiesKilled: 0, inProgress: true };
  state.defenders.laser = { damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 } };
  state.defenders.archer = { unlocked: false, count: 0, maxCount: 5, damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 } };
  state.defenders.cannon = { unlocked: false, canBeHired: false, count: 0, maxCount: 3, damage: { level: 1 }, blastRadius: { level: 1 }, reloadSpeed: { level: 1 } };
  state.defenders.frost = { unlocked: false, canBeHired: false, count: 0, maxCount: 3, damage: { level: 1 }, fireRate: { level: 1 }, range: { level: 1 } };
  state.defenders.catapult = { unlocked: false, canBeHired: false, count: 0, maxCount: 2, damage: { level: 1 }, blastRadius: { level: 1 }, reloadSpeed: { level: 1 } };
  state.conquestMap.unlockedNodes = [];
  state.economy = { expBoost: { level: 0 }, foodBoost: { level: 0 } };
  state.meta.expRate = 0; // prestige sonrası düşük DPS'e göre yeniden ölçülür
  state.meta.foodRate = 0;
}

export default GameState;
