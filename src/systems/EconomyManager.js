import GameState from '../state/GameState.js';
import { calculateUpgradeCost } from '../utils/MathUtils.js';
import { CONFIG } from '../config.js';

/**
 * EconomyManager — EXP/Food toplama, yükseltme maliyeti, satın alma işlemleri.
 */
const EconomyManager = {
  /**
   * Upgrade maliyetini hesaplar.
   * @param {string} defenderType — 'laser' | 'archer' | 'cannon'
   * @param {string} statName — 'damage' | 'fireRate' | 'range' | 'blastRadius' | 'reloadSpeed'
   * @returns {number} Maliyet (EXP)
   */
  getUpgradeCost(defenderType, statName) {
    const def = CONFIG.DEFENDERS[defenderType];
    const statConfig = def[statName];
    if (!statConfig || !statConfig.baseCost) return Infinity;
    const currentLevel = GameState.defenders[defenderType][statName]?.level || 1;
    return calculateUpgradeCost(statConfig.baseCost, CONFIG.UPGRADE_COST_MULTIPLIER, currentLevel);
  },

  /**
   * Yükseltme satın alımı yapar.
   * @returns {boolean} Başarılı mı
   */
  purchaseUpgrade(defenderType, statName) {
    const cost = this.getUpgradeCost(defenderType, statName);
    if (GameState.resources.exp < cost) return false;
    // Defender kilidi açık mı? (laser her zaman açık)
    if (defenderType !== 'laser' && !GameState.defenders[defenderType].unlocked) return false;

    GameState.resources.exp -= cost;
    GameState.defenders[defenderType][statName].level += 1;
    return true;
  },

  /**
   * Savunucu kiralama maliyetini hesaplar (Food).
   * @returns {number} Maliyet
   */
  getHireCost(defenderType) {
    const def = CONFIG.DEFENDERS[defenderType];
    if (!def.hireCost) return 0; // laser hire edilmez
    const count = GameState.defenders[defenderType].count || 0;
    return Math.floor(def.hireCost * Math.pow(def.hireCostMultiplier, count));
  },

  /**
   * Yeni savunucu kiralar (Food harcar).
   * @returns {boolean} Başarılı mı
   */
  hireDefender(defenderType) {
    const state = GameState.defenders[defenderType];
    if (!state) return false;

    // Cannon conquest kilidini kontrol et
    if (defenderType === 'cannon' && state.canBeHired === false) return false;

    const cost = this.getHireCost(defenderType);
    if (cost <= 0) return false;

    // İlk kiralama — kilidi aç
    if (!state.unlocked) {
      if (GameState.resources.food < cost) return false;
      GameState.resources.food -= cost;
      state.unlocked = true;
      state.count = 1;
      return true;
    }

    // Maks sayıya ulaşıldı mı
    if (state.count >= state.maxCount) return false;
    if (GameState.resources.food < cost) return false;

    GameState.resources.food -= cost;
    state.count += 1;
    return true;
  },

  /**
   * Yükseltme satın alınabilir mi?
   */
  canAffordUpgrade(defenderType, statName) {
    const cost = this.getUpgradeCost(defenderType, statName);
    if (defenderType !== 'laser' && !GameState.defenders[defenderType].unlocked) return false;
    return GameState.resources.exp >= cost;
  },

  /**
   * Savunucu kiralanabilir mi?
   */
  canAffordHire(defenderType) {
    const state = GameState.defenders[defenderType];
    if (!state) return false;
    if (defenderType === 'cannon' && state.canBeHired === false) return false;
    if (state.unlocked && state.count >= state.maxCount) return false;
    const cost = this.getHireCost(defenderType);
    return GameState.resources.food >= cost;
  },
};

export default EconomyManager;
