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

  // Debug / runtime tuning (yalnızca ?dev modunda dev panel üzerinden değişir)
  DEBUG: {
    timeScale: 1,       // oyun hızı çarpanı
    gainMultiplier: 1,  // test için EXP/Food kazanç çarpanı
    jumpWaveTarget: 10, // "wave'e atla" hedefi
  },

  // Görsel efekt (juice) anahtarları
  FX: {
    screenShake: true,  // cannon patlaması / elite ölümünde kamera sarsıntısı
    hitFlash: true,     // mermi isabetinde düşman beyaz flash
  },

  // Renk paleti
  COLORS: {
    WALL: 0x4a4a6a, WALL_TOP: 0x5a5a7a,
    LAVA: 0xff4500, LAVA_GLOW: 0xff6a00,
    GROUND: 0x111120, GROUND_LIGHT: 0x2a2a48, GROUND_EDGE: 0x33335a,
    SKY: 0x1a1a2e, SKY_TOP: 0x15152a, SKY_BOTTOM: 0x1b1b33,
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

  // ─────────────────────────────────────────────────────────────
  // ASSET MANIFEST — her texture anahtarının tek görsel kaynağı.
  // Şimdi: geometrik placeholder (shape/size/color). Oyun kodu yalnızca
  // anahtarı kullanır; ileride buraya `sprite` eklemek (örn.
  // { sprite: 'assets/skeleton.png', frames: { frameWidth, frameHeight } })
  // oynanışa dokunmadan görseli değiştirir.
  // ─────────────────────────────────────────────────────────────
  ASSETS: {
    // Düşmanlar
    'enemy-skeleton':    { shape: 'circle', size: 8,  color: 0xcccccc },
    'enemy-armored':     { shape: 'circle', size: 10, color: 0x888888 },
    'enemy-fast':        { shape: 'circle', size: 7,  color: 0xff6666 },
    'enemy-foodCarrier': { shape: 'circle', size: 9,  color: 0x66ff66 },
    'enemy-elite':       { shape: 'circle', size: 12, color: 0xffaa00 },
    'enemy-shield':      { shape: 'rect',   width: 18, height: 18, color: 0x6688cc }, // kare silüet = kalkanlı
    'enemy-splitter':    { shape: 'circle', size: 11, color: 0xcc66ff }, // mor blob = bölünen
    'enemy-healer':      { shape: 'triangle', size: 15, color: 0x33cc99 }, // yeşil üçgen = şifacı
    'enemy-boss':        { shape: 'circle', size: 24, color: 0xcc3333 },   // büyük kırmızı daire = boss
    // Savunucular
    'defender-laser':    { shape: 'rect', width: 24, height: 32, color: 0x00ffff },
    'defender-archer':   { shape: 'triangle', size: 16, color: 0x7cfc00 },
    'defender-cannon':   { shape: 'rect', width: 20, height: 20, color: 0xff8c00 },
    // Mermiler
    'projectile-arrow':      { shape: 'circle', size: 3, color: 0x7cfc00 },
    'projectile-cannonball': { shape: 'circle', size: 5, color: 0xff8c00 },
  },

  // Düşman değerleri
  ENEMIES: {
    skeleton:    { name: 'Skeleton',         hp: 10,  speed: 30, exp: 2,  food: 0, color: 0xcccccc },
    armored:     { name: 'Armored Skeleton', hp: 25,  speed: 20, exp: 5,  food: 1, color: 0x888888 },
    fast:        { name: 'Fast Runner',      hp: 8,   speed: 50, exp: 3,  food: 0, color: 0xff6666 },
    foodCarrier: { name: 'Food Carrier',     hp: 20,  speed: 30, exp: 2,  food: 3, color: 0x66ff66 },
    elite:       { name: 'Elite',            hp: 100, speed: 25, exp: 15, food: 5, color: 0xffaa00 },
    // Kalkanlı: orta HP ama kalkan ilk darbeleri emer (shield, HP eğrisinde ölçeklenir)
    shield:      { name: 'Shield Bearer',    hp: 30,  speed: 22, exp: 6,  food: 1, color: 0x6688cc, shield: 40 },
    // Splitter: savunucu ile ölünce 'split.count' küçük çocuğa bölünür (çocuklar bölünmez)
    splitter:    { name: 'Splitter',         hp: 24,  speed: 26, exp: 5,  food: 0, color: 0xcc66ff,
                   split: { count: 2, hpFactor: 0.4, rewardFactor: 0.35, scale: 0.6 } },
    // Healer: her 'interval' sn'de menzildeki (kendisi hariç) düşmanları maxHP'nin fraction'ı kadar iyileştirir
    healer:      { name: 'Healer',           hp: 28,  speed: 24, exp: 7,  food: 1, color: 0x33cc99,
                   heal: { fraction: 0.12, radius: 90, interval: 1.2 } },
    // Boss: her bossEvery wave'de tek, çok yüksek HP, yavaş, büyük ödül (random havuzda değil)
    boss:        { name: 'Boss',             hp: 800, speed: 14, exp: 120, food: 20, color: 0xcc3333 },
  },

  // Dalga sistemi
  WAVES: {
    baseEnemiesPerWave: 5,
    enemiesPerWaveGrowth: 0.3,
    timeBetweenSpawns: 1200,
    timeBetweenWaves: 2000,
    hpScaling: 1.08,
    expScaling: 1.05,
    bossEvery: 10, // her 10 wave'de boss dalgası
    typeUnlocks: { skeleton: 1, armored: 5, fast: 8, foodCarrier: 3, elite: 15, shield: 10, splitter: 12, healer: 14 },
  },

  // Prestige
  PRESTIGE: { multiplierPerPrestige: 0.5 },

  // Ses sistemi — prosedürel (Web Audio) SFX reçeteleri.
  // Asset dosyası yok; her efekt runtime'da sentezlenir. İleride sample
  // tabanlıya geçerken bu reçeteler { sample: 'path' } ile değiştirilebilir.
  SOUND: {
    enabled: true,        // Varsayılan ses durumu (save ile override edilir)
    masterVolume: 0.5,    // 0..1 — tüm SFX'lere çarpan
    // engine: 'tone' (osilatör, opsiyonel frekans süpürmesi)
    //         'noise' (lowpass'tan geçen gürültü patlaması)
    //         'sequence' (arka arkaya notalar — fanfar/çoklu ton)
    sfx: {
      archerFire:    { engine: 'tone',  type: 'triangle', freq: 880, freqEnd: 480, duration: 0.07, gain: 0.12, throttleMs: 45 },
      cannonFire:    { engine: 'noise', freq: 400, freqEnd: 60,  duration: 0.30, gain: 0.40, throttleMs: 60 },
      deathDefender: { engine: 'tone',  type: 'square',   freq: 420, freqEnd: 180, duration: 0.09, gain: 0.16, throttleMs: 25 },
      deathLava:     { engine: 'noise', freq: 600, freqEnd: 120, duration: 0.22, gain: 0.22, throttleMs: 40 },
      upgrade:       { engine: 'tone',  type: 'sine',     freq: 660, freqEnd: 990, duration: 0.12, gain: 0.25 },
      hire:          { engine: 'sequence', type: 'sine', gain: 0.28, notes: [{ freq: 523, duration: 0.09 }, { freq: 784, duration: 0.12 }] },
      waveComplete:  { engine: 'sequence', type: 'triangle', gain: 0.26, notes: [{ freq: 523, duration: 0.10 }, { freq: 659, duration: 0.10 }, { freq: 784, duration: 0.14 }] },
      prestige:      { engine: 'sequence', type: 'sawtooth', gain: 0.30, notes: [{ freq: 392, duration: 0.12 }, { freq: 523, duration: 0.12 }, { freq: 659, duration: 0.12 }, { freq: 1047, duration: 0.22 }] },
      uiDenied:      { engine: 'tone',  type: 'square',   freq: 220, freqEnd: 160, duration: 0.10, gain: 0.14, throttleMs: 80 },
      mapOpen:       { engine: 'tone',  type: 'sine',     freq: 440, freqEnd: 660, duration: 0.10, gain: 0.18 },
    },
  },

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
