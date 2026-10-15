import { CONFIG } from '../config.js';
import Defender from './Defender.js';

/**
 * LaserMonument — Sürekli lazer ışını, her zaman sabit konumda.
 * Çift çizgi: kalın dış + ince iç çekirdek, glow animasyonu.
 */
export default class LaserMonument extends Defender {
  constructor(scene, x, y) {
    super(scene, 'laser', x, y);
    this.sprite = scene.add.image(x, y, 'defender-laser').setDepth(5);
    this.laserGraphics = scene.add.graphics().setDepth(6);
    this.glowPhase = 0;
    this.damageAccumulator = 0;
    this.isBeamActive = false;
  }

  update(delta, enemies) {
    if (!this.alive) return;
    this.target = this.findTarget(enemies);
    this.laserGraphics.clear();

    if (this.target) {
      this.isBeamActive = true;
      this.drawBeam(delta);
      this.applyDamage(delta);
    } else {
      this.isBeamActive = false;
    }

    this.glowPhase += delta * 3;
    this.updateGlow();
  }

  drawBeam(delta) {
    if (!this.target || !this.target.sprite) return;
    const tx = this.target.sprite.x, ty = this.target.sprite.y;

    // Dış ışın (kalın, yarı saydam)
    const glowAlpha = 0.3 + Math.sin(this.glowPhase) * 0.1;
    this.laserGraphics.lineStyle(6, CONFIG.COLORS.LASER, glowAlpha);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(this.x, this.y);
    this.laserGraphics.lineTo(tx, ty);
    this.laserGraphics.strokePath();

    // İç çekirdek (ince, parlak)
    this.laserGraphics.lineStyle(2, 0xffffff, 0.9);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(this.x, this.y);
    this.laserGraphics.lineTo(tx, ty);
    this.laserGraphics.strokePath();
  }

  applyDamage(delta) {
    if (!this.target || !this.target.alive || this.target.dying) return;
    // Sürekli hasar: DPS = damage * fireRate
    const dps = this.getDamage() * this.getFireRate();
    this.damageAccumulator += dps * delta;

    if (this.damageAccumulator >= 1) {
      const dmg = Math.floor(this.damageAccumulator);
      this.damageAccumulator -= dmg;
      this.target.takeDamage(dmg, false); // lazer flash yok (sürekli hasar)
    }
  }

  updateGlow() {
    if (!this.sprite) return;
    const pulse = 0.8 + Math.sin(this.glowPhase * 2) * 0.2;
    this.sprite.setAlpha(pulse);
  }

  destroy() {
    super.destroy();
    this.laserGraphics?.destroy();
    this.sprite?.destroy();
    this.sprite = null;
  }
}
