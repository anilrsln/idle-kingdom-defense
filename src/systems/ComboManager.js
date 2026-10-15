import { CONFIG } from '../config.js';

/**
 * ComboManager — Kill-streak combo sayacı (run-içi, kaydedilmez).
 *
 * Her düşman ölümü combo'yu artırır ve pencereyi (window) yeniler; pencere
 * dolarsa combo sıfırlanır. Combo, ödül (EXP/Food) çarpanı verir.
 * Anlık/geçici bir durum olduğu için GameState'e/save'e girmez.
 */
const ComboManager = {
  _combo: 0,
  _timer: 0,

  /** Bir kill kaydet — combo artar, pencere yenilenir. */
  registerKill() {
    this._combo += 1;
    this._timer = CONFIG.COMBAT.combo.window;
  },

  /** Her frame çağrılır; pencere dolunca combo sıfırlanır. */
  update(delta) {
    if (this._combo <= 0) return;
    this._timer -= delta;
    if (this._timer <= 0) this.reset();
  },

  reset() { this._combo = 0; this._timer = 0; },

  getCombo() { return this._combo; },

  /** Ödül çarpanı: 1 + min(combo × bonusPerKill, maxBonus). */
  getMultiplier() {
    const c = CONFIG.COMBAT.combo;
    return 1 + Math.min(this._combo * c.bonusPerKill, c.maxBonus);
  },

  /** Pencerenin ne kadar kaldığı (0..1) — HUD göstergesi için. */
  getTimerFraction() {
    return CONFIG.COMBAT.combo.window > 0 ? Math.max(0, this._timer / CONFIG.COMBAT.combo.window) : 0;
  },
};

export default ComboManager;
