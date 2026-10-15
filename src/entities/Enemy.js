import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';
import { calculateEnemyHP, calculateEnemyEXP } from '../utils/MathUtils.js';
import ConquestManager from '../systems/ConquestManager.js';
import EconomyManager from '../systems/EconomyManager.js';
import ComboManager from '../systems/ComboManager.js';
import PerkManager from '../systems/PerkManager.js';

/** Enemy — Sağdan spawn, sola yürü, lava veya savunucu ölümü. */
export default class Enemy {
  constructor(scene, type, waveNumber, laneY, options = {}) {
    this.scene = scene;
    this.type = type;
    this.alive = true;
    this.dying = false;
    this._wave = waveNumber;

    const config = CONFIG.ENEMIES[type];
    this.name = config.name;
    this.speed = config.speed;

    // Spawn seçenekleri (splitter çocukları için): küçük/zayıf, bölünmez, kotaya sayılmaz
    const hpFactor = options.hpFactor ?? 1;
    const rewardFactor = options.rewardFactor ?? 1;
    this.isChild = options.child ?? false;
    this.noSplit = options.noSplit ?? false;
    this.splitConfig = config.split || null;
    this.healConfig = config.heal || null; // yakındaki düşmanları iyileştirir

    this.foodReward = config.food * rewardFactor;
    this.maxHP = Math.max(1, Math.floor(calculateEnemyHP(config.hp, CONFIG.WAVES.hpScaling, waveNumber) * hpFactor));
    this.currentHP = this.maxHP;
    this.expReward = calculateEnemyEXP(config.exp, CONFIG.WAVES.expScaling, waveNumber) * rewardFactor;

    // Davranış: kalkan (opsiyonel). config.shield varsa ilk darbeleri emer;
    // HP ile aynı eğride ölçeklenir. (Veri-güdümlü davranış deseni — yeni
    // davranışlar config alanı + burada kısa bir kontrol olarak eklenir.)
    this.maxShield = config.shield ? calculateEnemyHP(config.shield, CONFIG.WAVES.hpScaling, waveNumber) : 0;
    this.currentShield = this.maxShield;
    this._shieldBroken = false;

    const spawnX = options.spawnX ?? CONFIG.SPAWN_X;
    this.sprite = scene.add.image(spawnX, laneY, `enemy-${type}`).setDepth(10).setAlpha(0);
    if (options.scale) this.sprite.setScale(options.scale);
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 200 });

    // Boss: daha geniş ve sürekli görünen HP bar
    this.hpBarWidth = options.boss ? 60 : 20;
    this.hpBarHeight = options.boss ? 5 : 3;
    this._barYOffset = options.boss ? 34 : 14;
    this.alwaysShowBar = options.boss ?? false;
    this.hpBar = scene.add.graphics().setDepth(11);
  }

  update(delta, enemies) {
    if (!this.alive || this.dying) return;
    this.sprite.x -= this.speed * delta;
    this.updateHPBar();
    if (this.healConfig && enemies) this._updateHeal(delta, enemies);
    if (this.sprite.x <= CONFIG.LAVA_X + 20) this.dieToLava();
  }

  /** Healer: periyodik olarak menzildeki (kendisi hariç) düşmanların HP'sini yeniler.
   *  radius === 0 ise yalnızca kendini iyileştirir (boss_shaman self-heal). */
  _updateHeal(delta, enemies) {
    this._healTimer = (this._healTimer ?? this.healConfig.interval) - delta;
    if (this._healTimer > 0) return;
    this._healTimer = this.healConfig.interval;

    const selfOnly = this.healConfig.radius === 0;

    if (selfOnly) {
      // Self-heal: sadece kendi HP'sini yenile
      if (this.currentHP < this.maxHP) {
        const amt = Math.max(1, Math.floor(this.maxHP * this.healConfig.fraction));
        this.currentHP = Math.min(this.maxHP, this.currentHP + amt);
        this.updateHPBar();
        this._healFlash();
        this._healPulse();
      }
      return;
    }

    const r2 = this.healConfig.radius * this.healConfig.radius;
    let healedAny = false;
    for (const e of enemies) {
      if (e === this || !e.alive || e.dying || !e.sprite) continue;
      if (e.currentHP >= e.maxHP) continue;
      const dx = e.sprite.x - this.sprite.x;
      const dy = e.sprite.y - this.sprite.y;
      if (dx * dx + dy * dy > r2) continue;
      const amt = Math.max(1, Math.floor(e.maxHP * this.healConfig.fraction));
      e.currentHP = Math.min(e.maxHP, e.currentHP + amt);
      e.updateHPBar();
      e._healFlash();
      healedAny = true;
    }
    if (healedAny) this._healPulse();
  }

  /** İyileşen hedefte kısa yeşil flash. */
  _healFlash() {
    if (!this.sprite || this._flashing) return;
    this.sprite.setTintFill(0x44ff88);
    this.scene.time.delayedCall(80, () => { if (this.sprite) this.sprite.clearTint(); });
  }

  /** Healer'dan yayılan yeşil aura halkası. */
  _healPulse() {
    if (!this.sprite) return;
    const ring = this.scene.add.circle(this.sprite.x, this.sprite.y, this.healConfig.radius * 0.4, 0x44ff88, 0.18).setDepth(9);
    this.scene.tweens.add({
      targets: ring, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 420, ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
  }

  takeDamage(amount, flash = true, isCrit = false) {
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
    // Kritik vuruş: turuncu flash + "CRIT" bildirimi
    if (isCrit && this.sprite) {
      this._critFlash();
      this.scene.game.events.emit('crit-hit', { x: this.sprite.x, y: this.sprite.y, damage: Math.floor(amount) });
    }
    if (this.currentHP <= 0) { this.currentHP = 0; this.dieToDefender(); return true; }
    if (flash && !isCrit) this._flash();
    return false;
  }

  /** Kritik vuruşta turuncu flash. */
  _critFlash() {
    if (!this.sprite) return;
    this.sprite.setTintFill(0xff8800);
    this.scene.time.delayedCall(70, () => { if (this.sprite) this.sprite.clearTint(); });
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
    // Combo: savunucu ile öldürmek combo'yu besler ve ödülü çarpar
    ComboManager.registerKill();
    const comboMult = ComboManager.getMultiplier();
    const dbg = CONFIG.DEBUG?.gainMultiplier ?? 1;
    const expMult = GameState.prestige.multiplier * ConquestManager.getEconomyMultiplier('expMultiplier') * dbg * EconomyManager.getEconomyBoostMultiplier('expBoost') * PerkManager.getMultiplier('exp') * comboMult;
    const foodMult = GameState.prestige.multiplier * ConquestManager.getEconomyMultiplier('foodMultiplier') * dbg * EconomyManager.getEconomyBoostMultiplier('foodBoost') * PerkManager.getMultiplier('food') * comboMult;
    const exp = this.expReward * expMult;
    const food = this.foodReward * foodMult;
    this._grantRewards(exp, food, 'defender');
    // Splitter: savunucu ile ölünce küçük çocuklara bölünür (lavada bölünmez)
    if (this.splitConfig && !this.noSplit) {
      const sc = this.splitConfig;
      this.scene.game.events.emit('enemy-split', {
        x: this.sprite.x, y: this.sprite.y, wave: this._wave,
        count: sc.count, hpFactor: sc.hpFactor, rewardFactor: sc.rewardFactor, scale: sc.scale,
      });
    }
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
    const expMult = GameState.prestige.multiplier * ConquestManager.getEconomyMultiplier('expMultiplier') * dbg * EconomyManager.getEconomyBoostMultiplier('expBoost') * PerkManager.getMultiplier('exp');
    const foodMult = GameState.prestige.multiplier * ConquestManager.getEconomyMultiplier('foodMultiplier') * dbg * EconomyManager.getEconomyBoostMultiplier('foodBoost') * PerkManager.getMultiplier('food');
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
    if (!this.isChild) GameState.wave.enemiesKilled++; // çocuklar wave kotasına sayılmaz
    GameState.stats.totalEnemiesKilled++;
    GameState.stats.totalExpEarned += exp;
    GameState.stats.totalFoodEarned += food;
    if (this.type === 'boss') GameState.stats.bossesKilled++;
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
    // Tam can ve kalkan yoksa barı gizle (boss her zaman gösterir)
    if (!hasShield && this.currentHP >= this.maxHP && !this.alwaysShowBar) return;

    const bx = this.sprite.x - this.hpBarWidth / 2;
    let by = this.sprite.y - (this._barYOffset ?? 14);

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
