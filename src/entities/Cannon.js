import { CONFIG } from '../config.js';
import Defender from './Defender.js';
import Projectile from './Projectile.js';
import { calculateValue } from '../utils/MathUtils.js';
import AssetProvider from '../systems/AssetProvider.js';

/**
 * Cannon — AoE gülle atan savunucu.
 * Patlama yarıçapı, mesafeye bağlı hasar azalması, ateş efekti.
 */
export default class Cannon extends Defender {
  constructor(scene, x, y, index) {
    super(scene, 'cannon', x, y);
    this.index = index;
    this.sprite = scene.add.image(x, y, 'defender-cannon').setDepth(5);
    AssetProvider.applySprite(this.sprite, 'defender-cannon');
    this.projectiles = [];
  }

  getBlastRadius() {
    const l = this.getStateLevels();
    return calculateValue(
      this.config.blastRadius.base,
      this.config.blastRadius.multiplier,
      l.blastRadius
    );
  }

  getFireRate() {
    const l = this.getStateLevels();
    return calculateValue(
      this.config.reloadSpeed.base,
      this.config.reloadSpeed.multiplier,
      l.reloadSpeed
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
    const proj = this.scene.projectilePool.acquire(this.scene, this.x, this.y, target, 'cannonball', damage, radius, isCrit);
    this.projectiles.push(proj);
    this.scene.game.events.emit('sfx', 'cannonFire');

    // Ateşleme efekti: sarsıntı + alev
    if (this.sprite) {
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.x - 6, duration: 60, yoyo: true, ease: 'Power2',
      });
      // Alev parçacığı
      const flame = this.scene.add.circle(this.x + 10, this.y, 4, 0xff4400, 0.8).setDepth(15);
      this.scene.tweens.add({
        targets: flame, scaleX: 2, scaleY: 2, alpha: 0, duration: 200,
        onComplete: () => flame.destroy(),
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
