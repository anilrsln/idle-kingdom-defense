/**
 * config.js — Tüm oyun sabitleri ve balans değerleri.
 * Magic number kullanmak yerine buradan import et.
 */
export const CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 500,

  // Sahne konumları
  WALL_X: 60,
  LAVA_X: 50,
  SPAWN_X: 780,
  LANE_Y: 250,
  LANE_HEIGHT: 200,
  LAVA_HEIGHT: 60,
  DEFENDER_X: 100,

  // Kaydetme
  SAVE_KEY: 'idle-kingdom-defense-save',
  SAVE_INTERVAL: 30000,
  SAVE_VERSION: 1,

  // Idle sistemi
  IDLE_EFFICIENCY: 0.5,
  MAX_IDLE_HOURS: 24,

  // Upgrade maliyet çarpanı
  UPGRADE_COST_MULTIPLIER: 1.15,

  // Renk paleti
  COLORS: {
    WALL: 0x4a4a6a, WALL_TOP: 0x5a5a7a,
    LAVA: 0xff4500, LAVA_GLOW: 0xff6a00,
    GROUND: 0x3a3a3a, GROUND_LIGHT: 0x4a4a4a,
    SKY: 0x1a1a2e,
    LASER: 0x00ffff, ARCHER: 0x7cfc00, CANNON: 0xff8c00,
    ENEMY_SKELETON: 0xcccccc, ENEMY_ARMORED: 0x888888,
    ENEMY_FAST: 0xff6666, ENEMY_FOOD: 0x66ff66, ENEMY_ELITE: 0xffaa00,
    HP_BAR_BG: 0x333333, HP_BAR_FILL: 0x00ff00, HP_BAR_LOW: 0xff0000,
    UI_BG: 0x16213e, UI_TEXT: 0xffffff, UI_ACCENT: 0xe94560,
    UI_GOLD: 0xffd700, UI_BUTTON: 0x0f3460,
    UI_BUTTON_HOVER: 0x1a4a7a, UI_BUTTON_DISABLED: 0x333333,
  },

  // Savunucu başlangıç değerleri
  DEFENDERS: {
    laser: {
      name: 'Laser Monument',
      damage:   { base: 5,  multiplier: 1.2,  baseCost: 10 },
      fireRate: { base: 1.2, multiplier: 1.1, baseCost: 15 },
      range:    { base: 150, multiplier: 1.08, baseCost: 20 },
    },
    archer: {
      name: 'Archer',
      hireCost: 50,
      hireCostMultiplier: 1.5,
      damage:   { base: 3,  multiplier: 1.2,  baseCost: 12 },
      fireRate: { base: 0.8, multiplier: 1.1, baseCost: 18 },
      range:    { base: 120, multiplier: 1.08, baseCost: 25 },
    },
    cannon: {
      name: 'Cannon',
      hireCost: 200,
      hireCostMultiplier: 2.0,
      damage:      { base: 15, multiplier: 1.25, baseCost: 30 },
      blastRadius: { base: 40, multiplier: 1.1,  baseCost: 35 },
      reloadSpeed: { base: 0.3, multiplier: 1.1, baseCost: 25 },
    },
  },

  // Mermi hızları
  PROJECTILES: {
    arrow:      { speed: 350, size: 3 },
    cannonball: { speed: 200, size: 5 },
  },

  // Düşman değerleri
  ENEMIES: {
    skeleton:    { name: 'Skeleton',         hp: 10,  speed: 30, exp: 2,  food: 0, color: 0xcccccc },
    armored:     { name: 'Armored Skeleton', hp: 25,  speed: 20, exp: 5,  food: 1, color: 0x888888 },
    fast:        { name: 'Fast Runner',      hp: 8,   speed: 50, exp: 3,  food: 0, color: 0xff6666 },
    foodCarrier: { name: 'Food Carrier',     hp: 20,  speed: 30, exp: 2,  food: 3, color: 0x66ff66 },
    elite:       { name: 'Elite',            hp: 100, speed: 25, exp: 15, food: 5, color: 0xffaa00 },
  },

  // Dalga sistemi
  WAVES: {
    baseEnemiesPerWave: 5,
    enemiesPerWaveGrowth: 0.3,
    timeBetweenSpawns: 1200,
    timeBetweenWaves: 2000,
    hpScaling: 1.08,
    expScaling: 1.05,
    typeUnlocks: { skeleton: 1, armored: 5, fast: 8, foodCarrier: 3, elite: 15 },
  },

  // Prestige
  PRESTIGE: { multiplierPerPrestige: 0.5 },
  // Conquest Map — Skill Tree node'ları
  CONQUEST_NODES: {
    laserBoost1: {
      id: 'laserBoost1', name: 'Laser Boost I',
      description: '+25% Laser Damage',
      cost: { exp: 50 },
      effect: { type: 'defenderBoost', target: 'laser', stat: 'damage', value: 0.25 },
      requires: [], x: 100, y: 80,
    },
    laserBoost2: {
      id: 'laserBoost2', name: 'Laser Boost II',
      description: '+25% Laser Fire Rate',
      cost: { exp: 150 },
      effect: { type: 'defenderBoost', target: 'laser', stat: 'fireRate', value: 0.25 },
      requires: ['laserBoost1'], x: 280, y: 80,
    },
    defenderAura: {
      id: 'defenderAura', name: 'Defender Damage Aura',
      description: '+15% All Defender Damage',
      cost: { exp: 500 },
      effect: { type: 'globalBonus', stat: 'damage', value: 0.15 },
      requires: ['laserBoost2'], x: 480, y: 80,
    },
    expMultiplier: {
      id: 'expMultiplier', name: 'EXP Multiplier',
      description: '+20% EXP Gain',
      cost: { exp: 100 },
      effect: { type: 'economy', stat: 'expMultiplier', value: 0.2 },
      requires: ['laserBoost1'], x: 100, y: 200,
    },
    archerMastery: {
      id: 'archerMastery', name: 'Archer Mastery',
      description: '+30% Archer Damage',
      cost: { exp: 300, food: 20 },
      effect: { type: 'defenderBoost', target: 'archer', stat: 'damage', value: 0.3 },
      requires: ['defenderAura'], x: 480, y: 200,
    },
    foodBoost: {
      id: 'foodBoost', name: 'Food Boost',
      description: '+30% Food Gain',
      cost: { exp: 200 },
      effect: { type: 'economy', stat: 'foodMultiplier', value: 0.3 },
      requires: ['expMultiplier'], x: 100, y: 320,
    },
    cannonUnlock: {
      id: 'cannonUnlock', name: 'Cannon Unlock',
      description: 'Unlocks Cannon defender',
      cost: { exp: 400, food: 50 },
      effect: { type: 'unlock', target: 'cannon' },
      requires: ['archerMastery'], x: 480, y: 320,
    },
    cannonPower1: {
      id: 'cannonPower1', name: 'Cannon Power I',
      description: '+30% Cannon Damage',
      cost: { exp: 600 },
      effect: { type: 'defenderBoost', target: 'cannon', stat: 'damage', value: 0.3 },
      requires: ['cannonUnlock'], x: 660, y: 320,
    },
    prestigeUnlock: {
      id: 'prestigeUnlock', name: 'Prestige Unlock',
      description: 'Unlocks Prestige system',
      cost: { exp: 1000 },
      effect: { type: 'unlock', target: 'prestige' },
      requires: ['foodBoost'], x: 100, y: 440,
    },
  },
};
