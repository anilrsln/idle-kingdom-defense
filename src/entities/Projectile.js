import { CONFIG } from '../config.js';
import { distance } from '../utils/MathUtils.js';

/**
 * Projectile — Ok veya gülle mermisi.
 * Hedefe doğru hareket, çarpma tespiti, AoE patlama efekti.
 */
export default class Projectile {
  constructor(scene, x, y, target, type, damage, blastRadius = 0, isCrit = false, onHit = null) {
    this.reset(scene, x, y, target, type, damage, blastRadius, isCrit, onHit);
  }

  /** Yeni veya havuzdan dönen mermiyi kullanıma hazırlar; tüm state sıfırlanır. */
  reset(scene, x, y, target, type, damage, blastRadius = 0, isCrit = false, onHit = null) {
    this.scene = scene;
    this.target = target;
    this.type = type; // 'arrow' | 'cannonball' | 'frostbolt' | 'boulder'
    this.damage = damage;
    this.blastRadius = blastRadius;
    this.isCrit = isCrit;
    this.onHit = onHit;
    this.alive = true;

    const pConfig = CONFIG.PROJECTILES[type];
    this.speed = pConfig.speed;

    const texKey = `projectile-${type}`;
    if (this.sprite) {
      // Havuzdan dönen sprite: tipe göre texture yenile, rotation/aktiflik sıfırla
      this.sprite.setTexture(texKey);
      this.sprite.setPosition(x, y).setDepth(15).setRotation(0)
        .setActive(true).setVisible(true);
    } else {
      this.sprite = scene.add.image(x, y, texKey).setDepth(15);
    }

    // Hedef pozisyonu kaydet (hedef ölse bile oraya git)
    this.targetX = target.sprite ? target.sprite.x : x + 100;
    this.targetY = target.sprite ? target.sprite.y : y;
  }

  /** Havuza dönerken pasifleştir. */
  sleep() {
    this.alive = false;
    if (this.sprite) this.sprite.setActive(false).setVisible(false);
  }

  /** Sahne kapanışı: gerçek yıkım. */
  hardDestroy() {
    this.sprite?.destroy();
    this.sprite = null;
  }

  update(delta, enemies) {
    if (!this.alive) return;

    // Hedef hâlâ yaşıyorsa pozisyonu güncelle
    if (this.target && this.target.alive && this.target.sprite) {
      this.targetX = this.target.sprite.x;
      this.targetY = this.target.sprite.y;
    }

    // Hareket
    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      this.hit(enemies);
      return;
    }

    const vx = (dx / dist) * this.speed * delta;
    const vy = (dy / dist) * this.speed * delta;
    this.sprite.x += vx;
    this.sprite.y += vy;

    // Ok rotasyonu
    if (this.type === 'arrow') {
      this.sprite.rotation = Math.atan2(dy, dx);
    }

    // Ekran dışı kontrolü
    if (this.sprite.x > CONFIG.CANVAS_WIDTH + 20 || this.sprite.x < -20 ||
        this.sprite.y > CONFIG.CANVAS_HEIGHT + 20 || this.sprite.y < -20) {
      this.destroy();
    }
  }

  hit(enemies) {
    if (!this.alive) return;

    if (this.blastRadius > 0) {
      // AoE — gülle patlaması
      this.aoeHit(enemies);
      this.explosionEffect();
    } else {
      // Tekli hasar — ok / frostbolt
      if (this.target && this.target.alive && !this.target.dying) {
        this.target.takeDamage(this.damage, true, this.isCrit);
        if (this.onHit) this.onHit(this.target);
      }
      this.hitEffect();
    }
    this.destroy();
  }

  aoeHit(enemies) {
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.dying || !enemy.sprite) continue;
      const d = distance(this.sprite.x, this.sprite.y, enemy.sprite.x, enemy.sprite.y);
      if (d <= this.blastRadius) {
        // Uzaklığa bağlı hasar azalması: %50 – %100
        const falloff = 1 - (d / this.blastRadius) * 0.5;
        const finalDamage = Math.floor(this.damage * falloff);
        enemy.takeDamage(finalDamage, true, this.isCrit);
      }
    }
  }

  hitEffect() {
    const color = this.type === 'frostbolt' ? 0x88ccff : 0xffffff;
    const spark = this.scene.add.circle(this.sprite.x, this.sprite.y, 4, color).setDepth(20).setAlpha(0.8);
    this.scene.tweens.add({
      targets: spark, alpha: 0, scaleX: 2, scaleY: 2, duration: this.type === 'frostbolt' ? 250 : 150,
      onComplete: () => spark.destroy(),
    });
  }

  explosionEffect() {
    const cx = this.sprite.x, cy = this.sprite.y;
    if (CONFIG.FX?.screenShake) this.scene.cameras.main.shake(90, 0.005);
    // Dış halka
    const ring = this.scene.add.circle(cx, cy, 5, CONFIG.COLORS.CANNON, 0.6).setDepth(20);
    this.scene.tweens.add({
      targets: ring, scaleX: this.blastRadius / 5, scaleY: this.blastRadius / 5,
      alpha: 0, duration: 300, ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
    // İç parlama
    const core = this.scene.add.circle(cx, cy, 3, 0xffff00, 0.9).setDepth(21);
    this.scene.tweens.add({
      targets: core, scaleX: 3, scaleY: 3, alpha: 0, duration: 200,
      onComplete: () => core.destroy(),
    });
  }

  /**
   * Mermiyi "bitti" olarak işaretle. Pooling'de gerçek yıkım yapılmaz; defender
   * update'i !alive olanı diziden çıkarıp havuza release eder (sleep çağrılır).
   */
  destroy() {
    this.alive = false;
  }
}
