import { CONFIG } from '../config.js';
import Defender from './Defender.js';
import Projectile from './Projectile.js';

/**
 * Archer — Ok atan savunucu.
 * Recoil animasyonu, kendi mermi listesini yönetir.
 */
export default class Archer extends Defender {
  constructor(scene, x, y, index) {
    super(scene, 'archer', x, y);
    this.index = index;
    this.sprite = scene.add.image(x, y, 'defender-archer').setDepth(5);
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

    // Mermileri güncelle
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(delta, enemies);
      if (!p.alive) this.projectiles.splice(i, 1);
    }
  }

  fire(target) {
    const dmg = this.getDamage();
    const proj = new Projectile(this.scene, this.x, this.y, target, 'arrow', dmg);
    this.projectiles.push(proj);
    this.scene.game.events.emit('sfx', 'archerFire');

    // Recoil animasyonu
    if (this.sprite) {
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.x - 4, duration: 50, yoyo: true, ease: 'Power1',
      });
    }
  }

  destroy() {
    super.destroy();
    this.projectiles.forEach(p => p.destroy());
    this.projectiles = [];
    this.sprite?.destroy();
    this.sprite = null;
  }
}
