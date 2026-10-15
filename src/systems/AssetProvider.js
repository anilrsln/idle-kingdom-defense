import { CONFIG } from '../config.js';

/**
 * AssetProvider — CONFIG.ASSETS manifestini Phaser texture'larına çevirir.
 *
 * İki kaynak, tek arayüz:
 *  - `sprite` alanı olan girişler → dosyadan yüklenir (preload).
 *  - olmayanlar → geometrik placeholder olarak üretilir (shape/size/color).
 *
 * Oyun kodu her zaman sadece texture anahtarını (`enemy-skeleton` vb.)
 * kullanır; kaynağın geometri mi sprite mı olduğu burada izole edilir.
 * Yani pixel art'a geçiş = manifeste `sprite` eklemek, oyun kodu dokunulmaz.
 */
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
      if (spec.sprite) continue;              // dosyadan yüklenecek
      if (scene.textures.exists(key)) continue;
      this._generate(scene, key, spec);
    }
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
