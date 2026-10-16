import { CONFIG } from '../config.js';
import Defender from './Defender.js';
import ConquestManager from '../systems/ConquestManager.js';
import AssetProvider from '../systems/AssetProvider.js';

/**
 * LaserMonument — Sürekli lazer ışını, her zaman sabit konumda.
 * Çift çizgi: kalın dış + ince iç çekirdek, glow animasyonu.
 */
export default class LaserMonument extends Defender {
  constructor(scene, x, y) {
    super(scene, 'laser', x, y);
    this.sprite = scene.add.image(x, y, 'defender-laser').setDepth(5);
    AssetProvider.applySprite(this.sprite, 'defender-laser');
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
    const isBoss = this.target.type?.startsWith('boss_');
    // Sürekli hasar: DPS = damage * fireRate
    const dps = this.getDamage(isBoss) * this.getFireRate();
    this.damageAccumulator += dps * delta;

    if (this.damageAccumulator >= 1) {
      const dmg = Math.floor(this.damageAccumulator);
      this.damageAccumulator -= dmg;
      this.target.takeDamage(dmg, false); // lazer flash yok (sürekli hasar)

      // Laser Enhancement II: chain — en yakın ikinci hedefe ek hasar
      const chain = ConquestManager.getLaserChain();
      if (chain) this._applyChain(dmg, chain.chainFraction);
    }
  }

  /** Laser Chain: ana hedeften sonra en yakın ikinci düşmana zincirleme hasar. */
  _applyChain(primaryDmg, fraction) {
    const enemies = this.scene.waveManager?.enemies;
    if (!enemies || !this.target?.sprite) return;
    let chainTarget = null, closestDist = Infinity;
    const tx = this.target.sprite.x, ty = this.target.sprite.y;
    for (const e of enemies) {
      if (!e.alive || e.dying || e === this.target || !e.sprite) continue;
      const dx = e.sprite.x - tx, dy = e.sprite.y - ty;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) { closestDist = dist; chainTarget = e; }
    }
    if (!chainTarget) return;
    chainTarget.takeDamage(Math.max(1, Math.floor(primaryDmg * fraction)), false);
    // Görsel: zincir çizgisi
    const g = this.scene.add.graphics().setDepth(7);
    g.lineStyle(1, 0x44eeff, 0.55);
    g.beginPath();
    g.moveTo(this.target.sprite.x, this.target.sprite.y);
    g.lineTo(chainTarget.sprite.x, chainTarget.sprite.y);
    g.strokePath();
    this.scene.time.delayedCall(120, () => g.destroy());
  }

  updateGlow() {
    if (!this.sprite) return;
    this.sprite.setAlpha(1); // sabit — yanıp sönme yok
  }

  destroy() {
    super.destroy();
    this.laserGraphics?.destroy();
    this.sprite?.destroy();
    this.sprite = null;
  }
}
