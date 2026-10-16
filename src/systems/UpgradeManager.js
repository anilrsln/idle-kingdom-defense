import GameState from '../state/GameState.js';
import EconomyManager from './EconomyManager.js';
import { calculateValue } from '../utils/MathUtils.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n/index.js';

/**
 * UpgradeManager — Yükseltme işlemleri, efekt hesaplama, UI verisi.
 * EconomyManager'ı kullanarak işlem yapar.
 */
const UpgradeManager = {
  /** Mevcut stat değerini döndürür. */
  getStatValue(defenderType, statName) {
    const def = CONFIG.DEFENDERS[defenderType];
    const statConfig = def[statName];
    if (!statConfig) return 0;
    const level = GameState.defenders[defenderType][statName]?.level || 1;
    return calculateValue(statConfig.base, statConfig.multiplier, level);
  },

  /** Sonraki seviye stat değerini döndürür. */
  getNextStatValue(defenderType, statName) {
    const def = CONFIG.DEFENDERS[defenderType];
    const statConfig = def[statName];
    if (!statConfig) return 0;
    const level = (GameState.defenders[defenderType][statName]?.level || 1) + 1;
    return calculateValue(statConfig.base, statConfig.multiplier, level);
  },

  /** Bir savunucu tipi için tüm upgrade bilgilerini döndürür (UI için). */
  getDefenderUpgradeInfo(defenderType) {
    const defConfig = CONFIG.DEFENDERS[defenderType];
    const defState = GameState.defenders[defenderType];
    const stats = [];

    for (const statName of Object.keys(defConfig)) {
      if (['name', 'hireCost', 'hireCostMultiplier'].includes(statName)) continue;
      const statConfig = defConfig[statName];
      if (!statConfig || !statConfig.baseCost) continue;

      const level = defState[statName]?.level || 1;
      stats.push({
        name: statName,
        label: this.getStatLabel(statName),
        level,
        currentValue: this.getStatValue(defenderType, statName),
        nextValue: this.getNextStatValue(defenderType, statName),
        cost: EconomyManager.getUpgradeCost(defenderType, statName),
        canAfford: EconomyManager.canAffordUpgrade(defenderType, statName),
      });
    }

    return {
      name: defConfig.name,
      type: defenderType,
      unlocked: defenderType === 'laser' || defState.unlocked,
      conquestLocked: ['cannon', 'frost', 'catapult'].includes(defenderType) && defState.canBeHired === false,
      count: defState.count ?? 1,
      maxCount: defState.maxCount ?? 1,
      hireCost: EconomyManager.getHireCost(defenderType),
      canHire: EconomyManager.canAffordHire(defenderType),
      stats,
    };
  },

  getStatLabel(statName) {
    return t(`statLabel.${statName}`);
  },

  /** Yükseltme satın al (proxy). */
  purchaseUpgrade(defenderType, statName) {
    return EconomyManager.purchaseUpgrade(defenderType, statName);
  },

  /** Savunucu kirala (proxy). */
  hireDefender(defenderType) {
    return EconomyManager.hireDefender(defenderType);
  },
};

export default UpgradeManager;
