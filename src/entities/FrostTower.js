import { CONFIG } from '../config.js';
import Defender from './Defender.js';
import Projectile from './Projectile.js';
import AssetProvider from '../systems/AssetProvider.js';

/**
 * FrostTower — Buz boltu atan savunucu.
 * Düşük hasar; asıl etkisi hedefi yavaşlatma (slowFraction, slowDuration).
 */
export default class FrostTower extends Defender {
  constructor(scene, x, y, index) {
    super(scene, 'frost', x, y);
    this.index = index;
    this.sprite = scene.add.image(x, y, 'defender-frost').setDepth(5);
    AssetProvider.applySprite(this.sprite, 'defender-frost');
    this.projectiles = [];
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
    const proj = this.scene.projectilePool.acquire(
      this.scene, this.x, this.y, target, 'frostbolt', damage, 0, isCrit,
      // onHit callback: yavaşlatma uygula
      (hitEnemy) => this._applySlow(hitEnemy),
    );
    this.projectiles.push(proj);
    this.scene.game.events.emit('sfx', 'frostFire');

    // Animasyon: yukarı-aşağı titreme
    if (this.sprite) {
      this.scene.tweens.add({
        targets: this.sprite,
        y: this.y - 3, duration: 60, yoyo: true, ease: 'Power1',
      });
    }
  }

  /** Hedefe yavaşlatma debuff uygula. */
  _applySlow(enemy) {
    if (!enemy || !enemy.alive) return;
    const cfg = CONFIG.DEFENDERS.frost;
    const slowFrac = cfg.slowFraction ?? 0.45;
    const dur = cfg.slowDuration ?? 2.5;

    // Daha önceden yavaşlatılmış ise yalnızca timer'ı yenile
    if (!enemy._baseSpeed) enemy._baseSpeed = enemy.speed;
    enemy.speed = enemy._baseSpeed * slowFrac;
    enemy._slowTimer = dur;

    // Buz mavisi tint
    if (enemy.sprite) enemy.sprite.setTint(0x88ccff);
  }

  destroy() {
    super.destroy();
    this.projectiles.forEach(p => this.scene.projectilePool?.release(p));
    this.projectiles = [];
    this.sprite?.destroy();
    this.sprite = null;
  }
}
