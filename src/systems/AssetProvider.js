import { CONFIG } from '../config.js';

/**
 * AssetProvider — CONFIG.ASSETS manifestini Phaser texture'larına çevirir.
 *
 * İki kaynak, tek arayüz:
 *  - `sprite` alanı olan girişler → dosyadan yüklenir (preload).
 *    Bu spritesheet'ler çok büyük frame içerir (192×192 veya 320×320).
 *    Oyun boyutuna getirmek için applySprite() helper'ı kullanılır.
 *  - olmayanlar → geometrik placeholder olarak üretilir (shape/size/color).
 *
 * Oyun kodu her zaman sadece texture anahtarını (`enemy-skeleton` vb.)
 * kullanır; applySprite() çağrısı entity oluştururken 1 satır eklenerek
 * doğru boyut ve frame ayarlanır.
 */

/** Oyun mantığında kullanılacak ekran boyutları (px) */
const DISPLAY_SIZES = {
  // enemies
  'enemy-skeleton':       { w: 18, h: 18 },
  'enemy-armored':        { w: 22, h: 22 },
  'enemy-fast':           { w: 16, h: 16 },
  'enemy-foodCarrier':    { w: 20, h: 20 },
  'enemy-elite':          { w: 24, h: 24 },
  'enemy-shield':         { w: 20, h: 20 },
  'enemy-splitter':       { w: 22, h: 22 },
  'enemy-healer':         { w: 20, h: 20 },
  'enemy-boss_tank':      { w: 48, h: 48 },
  'enemy-boss_berserker': { w: 56, h: 56 },
  'enemy-boss_shaman':    { w: 52, h: 52 },
  'enemy-boss_splitter':  { w: 60, h: 60 },
  'enemy-boss_armored':   { w: 56, h: 56 },
  // defenders
  'defender-laser':       { w: 24, h: 32 },
  'defender-archer':      { w: 22, h: 28 },
  'defender-cannon':      { w: 28, h: 28 },
  'defender-frost':       { w: 22, h: 28 },
  'defender-catapult':    { w: 26, h: 22 },
};

const AssetProvider = {
  /** Sprite tabanlı asset'leri yükleme kuyruğuna alır (BootScene.preload). */
  preload(scene) {
    for (const [key, spec] of Object.entries(CONFIG.ASSETS)) {
      if (!spec.sprite) continue;
      if (spec.frames) scene.load.spritesheet(key, spec.sprite, spec.frames);
      else scene.load.image(key, spec.sprite);
    }
  },

  /** Sprite'ı olmayan girişler için geometrik texture üretir. */
  createTextures(scene) {
    for (const [key, spec] of Object.entries(CONFIG.ASSETS)) {
      if (spec.sprite) continue;
      if (scene.textures.exists(key)) continue;
      this._generate(scene, key, spec);
    }
  },

  /**
   * Phaser Image/Sprite nesnesine doğru frame ve görüntü boyutunu uygular.
   * Eğer asset bir sprite ise frame 0'ı ve DISPLAY_SIZES boyutunu ayarlar.
   * Geometrik asset için hiçbir şey yapmaz (zaten doğru boyutta üretilmiş).
   *
   * Kullanım (entity constructor'da, setDepth'ten önce veya sonra):
   *   AssetProvider.applySprite(this.sprite, 'enemy-skeleton');
   *
   * @param {Phaser.GameObjects.Image} imageObj - add.image veya add.sprite çağrısından dönen nesne
   * @param {string} key - CONFIG.ASSETS anahtarı
   * @param {number} [scaleOverride] - opsiyonel ek scale çarpanı (boss vb.)
   */
  applySprite(imageObj, key, scaleOverride = 1) {
    const spec = CONFIG.ASSETS[key];
    if (!spec?.sprite) return; // geometrik — dokunma
    if (typeof imageObj.setFrame === 'function') {
      imageObj.setFrame(0);
    }
    const size = DISPLAY_SIZES[key];
    if (size) {
      imageObj.setDisplaySize(size.w * scaleOverride, size.h * scaleOverride);
    }
  },

  /** Bir key için hedef boyutu döner (geometrik asset'ler null). */
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
