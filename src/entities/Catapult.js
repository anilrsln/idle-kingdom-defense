import { CONFIG } from '../config.js';
import Defender from './Defender.js';
import Projectile from './Projectile.js';
import { calculateValue } from '../utils/MathUtils.js';
import AssetProvider from '../systems/AssetProvider.js';

/**
 * Catapult — Uzun menzilli AoE taş atan savunucu.
 * Cannon'a benzer ama çok daha büyük patlama yarıçapı + yavaş ateş.
 * Menzil sabit tam saha (tüm koridor), hasar yüksek.
 */
export default class Catapult extends Defender {
  constructor(scene, x, y, index) {
    super(scene, 'catapult', x, y);
    this.index = index;
    this.sprite = scene.add.image(x, y, 'defender-catapult').setDepth(5);
    AssetProvider.applySprite(this.sprite, 'defender-catapult');
    this.projectiles = [];
  }

  getBlastRadius() {
    const l = this.getStateLevels();
    return calculateValue(
      this.config.blastRadius.base,
      this.config.blastRadius.multiplier,
      l.blastRadius,
    );
  }

  getFireRate() {
    const l = this.getStateLevels();
    return calculateValue(
      this.config.reloadSpeed.base,
      this.config.reloadSpeed.multiplier,
      l.reloadSpeed,
    );
  }

  update(delta, enemies) {
    if (!this.alive) return;
    if (this.cooldownTimer > 0) this.cooldownTimer -= delta;
    this.target = this.findTarget(enemies);

    if (this.target && this.cooldownTimer <= 0) {
      this.fire(this.target);
      this.cooldownTimer = 1 / this.getFireRate();
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta, enemies);
      if (!p.alive) { this.projectiles.splice(i, 1); this.scene.projectilePool.release(p); }
    }
  }

  fire(target) {
    const isBoss = target.type?.startsWith('boss_');
    const { damage, isCrit } = this.rollDamage(isBoss);
    const radius = this.getBlastRadius();
    const proj = this.scene.projectilePool.acquire(this.scene, this.x, this.y, target, 'boulder', damage, radius, isCrit);
    this.projectiles.push(proj);
    this.scene.game.events.emit('sfx', 'boulderFire');

    // Ağır ateş efekti: büyük sarsıntı + duman topu
    if (this.sprite) {
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.x - 8, duration: 80, yoyo: true, ease: 'Power2',
      });
      const smoke = this.scene.add.circle(this.x + 12, this.y, 6, 0x887766, 0.7).setDepth(15);
      this.scene.tweens.add({
        targets: smoke, scaleX: 3, scaleY: 3, alpha: 0, duration: 350,
        onComplete: () => smoke.destroy(),
      });
    }
  }

  destroy() {
    super.destroy();
    this.projectiles.forEach(p => this.scene.projectilePool?.release(p));
    this.projectiles = [];
    this.sprite?.destroy();
    this.sprite = null;
  }
}
