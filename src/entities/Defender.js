import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';
import { calculateValue } from '../utils/MathUtils.js';
import ConquestManager from '../systems/ConquestManager.js';

/**
 * Defender — Savunucu base class.
 * Hedef bulma, cooldown, seviye bazlı stat hesaplama.
 */
export default class Defender {
  constructor(scene, type, x, y) {
    this.scene = scene;
    this.type = type;
    this.x = x;
    this.y = y;
    this.alive = true;
    this.config = CONFIG.DEFENDERS[type];
    this.cooldownTimer = 0;
    this.target = null;
  }

  /** GameState'den bu savunucu tipinin seviye bilgilerini alır. */
  getStateLevels() {
    const d = GameState.defenders[this.type];
    if (!d) return { damage: 1, fireRate: 1, range: 1 };
    return {
      damage: d.damage?.level || 1,
      fireRate: d.fireRate?.level || 1,
      range: d.range?.level || 1,
      blastRadius: d.blastRadius?.level || 1,
      reloadSpeed: d.reloadSpeed?.level || 1,
    };
  }

  getDamage(isBossTarget = false) {
    const l = this.getStateLevels();
    const base = calculateValue(this.config.damage.base, this.config.damage.multiplier, l.damage);
    const bonus = ConquestManager.getDefenderBonus(this.type, 'damage');
    const bossMult = isBossTarget ? ConquestManager.getBossBonus() : 1;
    return base * (1 + bonus) * bossMult;
  }

  /** Ateş başına hasar + kritik rulosu (mermi savunucuları için).
   * @param {boolean} isBossTarget — hedef boss mu? (boss penetration bonusunu uygular) */
  rollDamage(isBossTarget = false) {
    let damage = this.getDamage(isBossTarget);
    const crit = CONFIG.COMBAT?.crit;
    const isCrit = crit ? Math.random() < crit.chance : false;
    if (isCrit) damage *= crit.multiplier;
    return { damage, isCrit };
  }

  getFireRate() {
    const l = this.getStateLevels();
    const stat = this.config.fireRate || this.config.reloadSpeed;
    return calculateValue(stat.base, stat.multiplier, l.fireRate || l.reloadSpeed);
  }

  getRange() {
    const l = this.getStateLevels();
    if (!this.config.range) return 999;
    return calculateValue(this.config.range.base, this.config.range.multiplier, l.range);
  }

  findTarget(enemies) {
    const range = this.getRange();
    let closest = null, closestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive || e.dying || !e.sprite) continue;
      const dist = Math.sqrt((e.sprite.x - this.x) ** 2 + (e.sprite.y - this.y) ** 2);
      if (dist <= range && dist < closestDist) { closestDist = dist; closest = e; }
    }
    return closest;
  }

  update(delta, enemies) {
    if (!this.alive) return;
    if (this.cooldownTimer > 0) this.cooldownTimer -= delta;
    this.target = this.findTarget(enemies);
    if (this.target && this.cooldownTimer <= 0) {
      this.fire(this.target);
      this.cooldownTimer = 1 / this.getFireRate();
    }
  }

  fire(target) { /* Alt sınıf override eder */ }
  destroy() { this.alive = false; this.target = null; }
}
