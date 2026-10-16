import { CONFIG } from '../config.js';
import Defender from './Defender.js';
import Projectile from './Projectile.js';
import ConquestManager from '../systems/ConquestManager.js';
import AssetProvider from '../systems/AssetProvider.js';

/**
 * Archer — Ok atan savunucu.
 * Recoil animasyonu, kendi mermi listesini yönetir.
 */
export default class Archer extends Defender {
  constructor(scene, x, y, index) {
    super(scene, 'archer', x, y);
    this.index = index;
    this.sprite = scene.add.sprite(x, y, 'defender-archer').setDepth(5);
    AssetProvider.applySprite(this.sprite, 'defender-archer');
    AssetProvider.playAnim(this.sprite, 'defender-archer');
    this.projectiles = [];
    this._shotCount = 0; // Archer Mastery splash sayacı
  }

  update(delta, enemies) {
    if (!this.alive) return;
    if (this.cooldownTimer > 0) this.cooldownTimer -= delta;
    this.target = this.findTarget(enemies);

    if (this.target && this.cooldownTimer <= 0) {
      this.fire(this.target);
      this.cooldownTimer = 1 / this.getFireRate();
    }

    // Mermileri güncelle
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta, enemies);
      if (!p.alive) { this.projectiles.splice(i, 1); this.scene.projectilePool.release(p); }
    }
  }

  fire(target) {
    this._shotCount++;
    const isBoss = target.type?.startsWith('boss_');
    const { damage, isCrit } = this.rollDamage(isBoss);
    const proj = this.scene.projectilePool.acquire(this.scene, this.x, this.y, target, 'arrow', damage, 0, isCrit);
    this.projectiles.push(proj);
    this.scene.game.events.emit('sfx', 'archerFire');

    // Archer Mastery: her N. okta splash (alan hasarı)
    const splash = ConquestManager.getArcherSplash();
    if (splash && this._shotCount % splash.splashEvery === 0 && target.sprite) {
      this._applySplashDamage(target, damage * splash.splashFraction, splash.splashRadius);
    }

    // Recoil animasyonu
    if (this.sprite) {
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.x - 4, duration: 50, yoyo: true, ease: 'Power1',
      });
    }
  }

  /** Belirtilen hedef etrafındaki düşmanlara alan hasarı uygular. */
  _applySplashDamage(centerEnemy, splashDmg, radius) {
    const enemies = this.scene.waveManager?.enemies;
    if (!enemies) return;
    const r2 = radius * radius;
    const cx = centerEnemy.sprite.x, cy = centerEnemy.sprite.y;
    // Görsel: turuncu parlama
    const ring = this.scene.add.circle(cx, cy, radius * 0.5, 0xffaa00, 0.22).setDepth(9);
    this.scene.tweens.add({
      targets: ring, scaleX: 2, scaleY: 2, alpha: 0, duration: 350, ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
    for (const e of enemies) {
      if (!e.alive || e.dying || !e.sprite || e === centerEnemy) continue;
      const dx = e.sprite.x - cx, dy = e.sprite.y - cy;
      if (dx * dx + dy * dy <= r2) e.takeDamage(Math.max(1, Math.floor(splashDmg)), false);
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
