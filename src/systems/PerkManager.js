import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';

/**
 * PerkManager — Prestige Trophy perk'leri (kalıcı meta ilerleme).
 *
 * Trophy her prestige'de kazanılır (PrestigeManager) ve bu perk'lere harcanır.
 * Perk'ler prestige'de korunur, Yeni Oyun'da sıfırlanır. Etkiler:
 *  - exp/food: kalıcı kazanç çarpanı (Enemy ödülüne)
 *  - damage:   kalıcı tüm savunucu hasar çarpanı (Defender.getDamage)
 *  - start:    prestige sonrası başlangıç EXP bonusu
 *  - mult:     prestige çarpanına kalıcı ek
 */
const PerkManager = {
  _level(key) { return GameState.prestige?.perks?.[key]?.level || 0; },

  /** exp | food | damage perk'inin çarpanı (1 + level × bonus). */
  getMultiplier(key) {
    const cfg = CONFIG.PRESTIGE_PERKS[key];
    if (!cfg) return 1;
    return 1 + this._level(key) * cfg.bonusPerLevel;
  },

  /** Prestige sonrası başlangıç EXP bonusu. */
  getStartBonus() {
    const cfg = CONFIG.PRESTIGE_PERKS.start;
    return this._level('start') * cfg.bonusPerLevel;
  },

  /** Prestige çarpanına eklenecek kalıcı miktar. */
  getPrestigeBonus() {
    const cfg = CONFIG.PRESTIGE_PERKS.mult;
    return this._level('mult') * cfg.bonusPerLevel;
  },

  getCost(key) {
    const cfg = CONFIG.PRESTIGE_PERKS[key];
    if (!cfg) return Infinity;
    return cfg.baseCost + this._level(key) * cfg.costStep;
  },

  isMaxed(key) {
    const cfg = CONFIG.PRESTIGE_PERKS[key];
    return cfg ? this._level(key) >= cfg.maxLevel : true;
  },

  canAfford(key) {
    if (this.isMaxed(key)) return false;
    return GameState.prestige.trophies >= this.getCost(key);
  },

  /** Perk satın al (Trophy ile). */
  purchase(key) {
    if (!this.canAfford(key)) return false;
    GameState.prestige.trophies -= this.getCost(key);
    if (!GameState.prestige.perks[key]) GameState.prestige.perks[key] = { level: 0 };
    GameState.prestige.perks[key].level += 1;
    return true;
  },

  /** UI için tüm perk bilgileri. */
  getAll() {
    return Object.keys(CONFIG.PRESTIGE_PERKS).map((key) => {
      const cfg = CONFIG.PRESTIGE_PERKS[key];
      return {
        key, name: cfg.name, desc: cfg.desc,
        level: this._level(key), maxLevel: cfg.maxLevel,
        cost: this.getCost(key), maxed: this.isMaxed(key), canAfford: this.canAfford(key),
      };
    });
  },
};

export default PerkManager;
