import { CONFIG } from '../config.js';
import SaveManager from '../systems/SaveManager.js';
import IdleManager from '../systems/IdleManager.js';

/** BootScene — Placeholder texture üretimi, save yükleme, idle hesaplama. */
export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() { this.createPlaceholderTextures(); }

  create() {
    // Save yükle
    const savedData = SaveManager.load();
    if (savedData) {
      SaveManager.applyLoad(savedData);

      // Idle gelir hesapla
      const earnings = IdleManager.calculateIdleEarnings();
      if (earnings && (earnings.exp > 0 || earnings.food > 0)) {
        // Idle kazancı sakla — GameScene'de popup gösterilecek
        this.registry.set('idleEarnings', earnings);
      }
    }

    // Otomatik kayıt başlat
    SaveManager.startAutoSave();

    this.scene.start('GameScene');
  }

  createPlaceholderTextures() {
    // Düşmanlar
    this.createCircle('enemy-skeleton',    8,  CONFIG.COLORS.ENEMY_SKELETON);
    this.createCircle('enemy-armored',     10, CONFIG.COLORS.ENEMY_ARMORED);
    this.createCircle('enemy-fast',        7,  CONFIG.COLORS.ENEMY_FAST);
    this.createCircle('enemy-foodCarrier', 9,  CONFIG.COLORS.ENEMY_FOOD);
    this.createCircle('enemy-elite',       12, CONFIG.COLORS.ENEMY_ELITE);
    // Savunucular
    this.createRect('defender-laser',   24, 32, CONFIG.COLORS.LASER);
    this.createTriangle('defender-archer', 16, CONFIG.COLORS.ARCHER);
    this.createRect('defender-cannon',  20, 20, CONFIG.COLORS.CANNON);
    // Mermiler
    this.createCircle('projectile-arrow',      3, CONFIG.COLORS.ARCHER);
    this.createCircle('projectile-cannonball', 5, CONFIG.COLORS.CANNON);
  }

  createCircle(key, r, color) {
    const g = this.make.graphics({ add: false });
    g.fillStyle(color, 1); g.fillCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2); g.destroy();
  }
  createRect(key, w, h, color) {
    const g = this.make.graphics({ add: false });
    g.fillStyle(color, 1); g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h); g.destroy();
  }
  createTriangle(key, s, color) {
    const g = this.make.graphics({ add: false });
    g.fillStyle(color, 1); g.fillTriangle(s / 2, 0, 0, s, s, s);
    g.generateTexture(key, s, s); g.destroy();
  }
}
