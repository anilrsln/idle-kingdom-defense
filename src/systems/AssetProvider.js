import { CONFIG } from '../config.js';

/**
 * AssetProvider — CONFIG.ASSETS manifestini Phaser texture'larına çevirir.
 */

/** Oyun mantığında kullanılacak ekran boyutları (px) */
const DISPLAY_SIZES = {
  // enemies
  'enemy-skeleton':       { w: 48, h: 48 },
  'enemy-armored':        { w: 54, h: 54 },
  'enemy-fast':           { w: 42, h: 42 },
  'enemy-foodCarrier':    { w: 50, h: 50 },
  'enemy-elite':          { w: 64, h: 64 },
  'enemy-shield':         { w: 54, h: 54 },
  'enemy-splitter':       { w: 50, h: 50 },
  'enemy-healer':         { w: 48, h: 48 },
  'enemy-boss_tank':      { w: 88, h: 88 },
  'enemy-boss_berserker': { w: 100, h: 100 },
  'enemy-boss_shaman':    { w: 92, h: 92 },
  'enemy-boss_splitter':  { w: 104, h: 104 },
  'enemy-boss_armored':   { w: 96, h: 96 },
  // defenders
  'defender-laser':       { w: 36, h: 72 },
  'defender-archer':      { w: 57, h: 57 },   // 3/4 boyut
  'defender-cannon':      { w: 32, h: 42 },
  'defender-frost':       { w: 28, h: 48 },
  'defender-catapult':    { w: 36, h: 30 },
  // projectiles
  'projectile-arrow':     { w: 1, h: 1 },
};

/**
 * Animasyon tanımları — her key için frameRate ve frameCount.
 * Phaser anims.create ile kaydedilir, sprite.play(key) ile oynatılır.
 */
const ANIM_DEFS = {
  'enemy-skeleton':       { frameCount: 6, frameRate: 8,  flipX: true },
  'enemy-armored':        { frameCount: 6, frameRate: 7,  flipX: true },
  'enemy-fast':           { frameCount: 6, frameRate: 12, flipX: true },
  'enemy-foodCarrier':    { frameCount: 6, frameRate: 8,  flipX: true },
  'enemy-elite':          { frameCount: 6, frameRate: 7,  flipX: true },
  'enemy-shield':         { frameCount: 6, frameRate: 7,  flipX: true },
  'enemy-splitter':       { frameCount: 6, frameRate: 9,  flipX: true },
  'enemy-healer':         { frameCount: 6, frameRate: 8,  flipX: true },
  'enemy-boss_tank':      { frameCount: 6, frameRate: 6,  flipX: true },
  'enemy-boss_berserker': { frameCount: 6, frameRate: 7,  flipX: true },
  'enemy-boss_shaman':    { frameCount: 6, frameRate: 7,  flipX: true },
  'enemy-boss_splitter':  { frameCount: 6, frameRate: 7,  flipX: true },
  'enemy-boss_armored':   { frameCount: 6, frameRate: 6,  flipX: true },
  'defender-archer':      { frameCount: 6, frameRate: 8 },
};

const AssetProvider = {
  preload(scene) {
    for (const [key, spec] of Object.entries(CONFIG.ASSETS)) {
      if (!spec.sprite) continue;
      if (spec.frames) scene.load.spritesheet(key, spec.sprite, spec.frames);
      else scene.load.image(key, spec.sprite);
    }
  },

  /** Spritesheet animasyonlarını Phaser anim manager'a kaydet (GameScene.create sonrası). */
  createAnims(scene) {
    for (const [key, def] of Object.entries(ANIM_DEFS)) {
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: def.frameCount - 1 }),
        frameRate: def.frameRate,
        repeat: -1,
      });
    }
  },

  createTextures(scene) {
    for (const [key, spec] of Object.entries(CONFIG.ASSETS)) {
      if (spec.sprite) continue;
      if (scene.textures.exists(key)) continue;
      this._generate(scene, key, spec);
    }
  },

  /**
   * Sprite'a doğru frame/boyut uygular.
   * @param {number} [childScale] — splitter child için 0..1 arası ek scale
   */
  applySprite(imageObj, key, childScale = 1) {
    const spec = CONFIG.ASSETS[key];
    if (!spec?.sprite) return;
    if (typeof imageObj.setFrame === 'function') {
      imageObj.setFrame(0);
    }
    const size = DISPLAY_SIZES[key];
    if (size) {
      imageObj.setDisplaySize(size.w * childScale, size.h * childScale);
    }
  },

  /** Animasyonu oynat — anim tanımı yoksa sessizce geçer. */
  playAnim(sprite, key) {
    if (!sprite || typeof sprite.play !== 'function') return;
    const def = ANIM_DEFS[key];
    if (def) {
      sprite.play(key, true);
      if (def.flipX) sprite.setFlipX(true);
    }
  },

  getDisplaySize(key) {
    return DISPLAY_SIZES[key] ?? null;
  },

  _generate(scene, key, spec) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(spec.color ?? 0xffffff, 1);
    switch (spec.shape) {
      case 'rect': {
        const w = spec.width, h = spec.height;
        g.fillRect(0, 0, w, h);
        g.generateTexture(key, w, h);
        break;
      }
      case 'triangle': {
        const s = spec.size;
        g.fillTriangle(s / 2, 0, 0, s, s, s);
        g.generateTexture(key, s, s);
        break;
      }
      case 'circle':
      default: {
        const r = spec.size;
        g.fillCircle(r, r, r);
        g.generateTexture(key, r * 2, r * 2);
        break;
      }
    }
    g.destroy();
  },
};

export default AssetProvider;
