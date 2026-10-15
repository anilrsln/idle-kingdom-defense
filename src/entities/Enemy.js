import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';
import { calculateEnemyHP, calculateEnemyEXP } from '../utils/MathUtils.js';
import ConquestManager from '../systems/ConquestManager.js';

/** Enemy — Sağdan spawn, sola yürü, lava veya savunucu ölümü. */
export default class Enemy {
  constructor(scene, type, waveNumber, laneY) {
    this.scene = scene;
    this.type = type;
    this.alive = true;
    this.dying = false;

    const config = CONFIG.ENEMIES[type];
    this.name = config.name;
    this.speed = config.speed;
    this.foodReward = config.food;
    this.maxHP = calculateEnemyHP(config.hp, CONFIG.WAVES.hpScaling, waveNumber);
    this.currentHP = this.maxHP;
    this.expReward = calculateEnemyEXP(config.exp, CONFIG.WAVES.expScaling, waveNumber);

    // Davranış: kalkan (opsiyonel). config.shield varsa ilk darbeleri emer;
    // HP ile aynı eğride ölçeklenir. (Veri-güdümlü davranış deseni — yeni
    // davranışlar config alanı + burada kısa bir kontrol olarak eklenir.)
    this.maxShield = config.shield ? calculateEnemyHP(config.shield, CONFIG.WAVES.hpScaling, waveNumber) : 0;
    this.currentShield = this.maxShield;
    this._shieldBroken = false;

    this.sprite = scene.add.image(CONFIG.SPAWN_X, laneY, `enemy-${type}`).setDepth(10).setAlpha(0);
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 200 });

    this.hpBarWidth = 20;
    this.hpBarHeight = 3;
    this.hpBar = scene.add.graphics().setDepth(11);
  }

  update(delta) {
    if (!this.alive || this.dying) return;
    this.sprite.x -= this.speed * delta;
    this.updateHPBar();
    if (this.sprite.x <= CONFIG.LAVA_X + 20) this.dieToLava();
  }

  takeDamage(amount, flash = true) {
    if (!this.alive || this.dying) return false;
    // Kalkan varsa önce onu emer, kalan hasar HP'ye geçer
    if (this.currentShield > 0) {
      const absorbed = Math.min(this.currentShield, amount);
      this.currentShield -= absorbed;
      amount -= absorbed;
      if (this.currentShield <= 0 && !this._shieldBroken) {
        this._shieldBroken = true;
        this._onShieldBreak();
      }
    }
    if (amount > 0) this.currentHP -= amount;
    this.updateHPBar();
    if (this.currentHP <= 0) { this.currentHP = 0; this.dieToDefender(); return true; }
    if (flash) this._flash();
    return false;
  }

  /** Kalkan kırıldığında kısa cyan flash. */
  _onShieldBreak() {
    if (!this.sprite) return;
    this.sprite.setTintFill(0x66ccff);
    this.scene.time.delayedCall(90, () => { if (this.sprite) this.sprite.clearTint(); });
  }

  /** Kısa beyaz isabet flash'ı (mermiler için; lazer sürekli olduğundan çağırmaz). */
  _flash() {
    if (!this.sprite || this._flashing || !CONFIG.FX?.hitFlash) return;
    this._flashing = true;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(55, () => {
      if (this.sprite) this.sprite.clearTint();
      this._flashing = false;
    });
  }

  dieToDefender() {
    if (this.dying) return;
    this.dying = true; this.alive = false;
    const dbg = CONFIG.DEBUG?.gainMultiplier ?? 1;
    const expMult = GameState.prestige.multiplier * ConquestManager.getEconomyMultiplier('expMultiplier') * dbg;
    const foodMult = GameState.prestige.multiplier * ConquestManager.getEconomyMultiplier('foodMultiplier') * dbg;
    const exp = this.expReward * expMult;
    const food = this.foodReward * foodMult;
    this._grantRewards(exp, food, 'defender');
    this.sprite.setTint(0xffffff);
    this.scene.tweens.add({
      targets: this.sprite, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 300, ease: 'Power2',
      onComplete: () => { this.dying = false; this.destroy(); },
    });
    this.hpBar.clear();
  }

  dieToLava() {
    if (this.dying) return;
    this.dying = true; this.alive = false;
    const dbg = CONFIG.DEBUG?.gainMultiplier ?? 1;
    const expMult = GameState.prestige.multiplier * ConquestManager.getEconomyMultiplier('expMultiplier') * dbg;
    const foodMult = GameState.prestige.multiplier * ConquestManager.getEconomyMultiplier('foodMultiplier') * dbg;
    const exp = Math.floor(this.expReward * 0.5 * expMult);
    const food = Math.floor(this.foodReward * 0.5 * foodMult);
    this._grantRewards(exp, food, 'lava');
    this.sprite.setTint(CONFIG.COLORS.LAVA);
    const lavaY = CONFIG.CANVAS_HEIGHT - CONFIG.LAVA_HEIGHT + 10;
    this.scene.tweens.add({
      targets: this.sprite, y: lavaY, alpha: 0, scaleX: 0.5, scaleY: 0.3, duration: 400, ease: 'Power2',
      onComplete: () => { this.dying = false; this.destroy(); },
    });
    this.hpBar.clear();
  }

  _grantRewards(exp, food, killedBy) {
    GameState.resources.exp += exp;
    GameState.resources.food += food;
    GameState.wave.enemiesKilled++;
    GameState.stats.totalEnemiesKilled++;
    GameState.stats.totalExpEarned += exp;
    GameState.stats.totalFoodEarned += food;
    this.scene.events.emit('enemy-killed', {
      type: this.type, exp, food,
      x: this.sprite.x, y: this.sprite.y, killedBy,
    });
    this.scene.game.events.emit('sfx', killedBy === 'lava' ? 'deathLava' : 'deathDefender');
  }

  updateHPBar() {
    this.hpBar.clear();
    if (!this.alive || !this.sprite) return;
    const hasShield = this.maxShield > 0 && this.currentShield > 0;
    // Tam can ve kalkan yoksa barı gizle
    if (!hasShield && this.currentHP >= this.maxHP) return;

    const bx = this.sprite.x - this.hpBarWidth / 2;
    let by = this.sprite.y - 14;

    // Kalkan barı (üstte, cyan)
    if (hasShield) {
      this.hpBar.fillStyle(CONFIG.COLORS.HP_BAR_BG, 0.8);
      this.hpBar.fillRect(bx, by, this.hpBarWidth, this.hpBarHeight);
      this.hpBar.fillStyle(0x66ccff, 1);
      this.hpBar.fillRect(bx, by, this.hpBarWidth * (this.currentShield / this.maxShield), this.hpBarHeight);
      by += this.hpBarHeight + 1;
    }

    // HP barı
    this.hpBar.fillStyle(CONFIG.COLORS.HP_BAR_BG, 0.8);
    this.hpBar.fillRect(bx, by, this.hpBarWidth, this.hpBarHeight);
    const ratio = Math.max(0, this.currentHP / this.maxHP);
    this.hpBar.fillStyle(ratio > 0.3 ? CONFIG.COLORS.HP_BAR_FILL : CONFIG.COLORS.HP_BAR_LOW, 1);
    this.hpBar.fillRect(bx, by, this.hpBarWidth * ratio, this.hpBarHeight);
  }

  destroy() {
    this.sprite?.destroy(); this.sprite = null;
    this.hpBar?.destroy();  this.hpBar = null;
  }
}
