import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';

/**
 * ConquestManager — Conquest Map node yönetimi.
 * Node satın alma, kilit kontrolü, bonus uygulama.
 */
const ConquestManager = {
  /** Node açık mı? */
  isUnlocked(nodeId) {
    return GameState.conquestMap.unlockedNodes.includes(nodeId);
  },

  /** Node'un tüm gereksinimleri karşılanmış mı? */
  isAvailable(nodeId) {
    if (this.isUnlocked(nodeId)) return false;
    const node = CONFIG.CONQUEST_NODES[nodeId];
    if (!node) return false;
    return node.requires.every(req => this.isUnlocked(req));
  },

  /** Node satın alınabilir mi? (maliyet + gereksinim) */
  canPurchase(nodeId) {
    if (!this.isAvailable(nodeId)) return false;
    const node = CONFIG.CONQUEST_NODES[nodeId];
    if (node.cost.exp && GameState.resources.exp < node.cost.exp) return false;
    if (node.cost.food && GameState.resources.food < node.cost.food) return false;
    return true;
  },

  /** Node satın al. */
  purchase(nodeId) {
    if (!this.canPurchase(nodeId)) return false;
    const node = CONFIG.CONQUEST_NODES[nodeId];

    // Kaynak harca
    if (node.cost.exp) GameState.resources.exp -= node.cost.exp;
    if (node.cost.food) GameState.resources.food -= node.cost.food;

    // Node'u aç
    GameState.conquestMap.unlockedNodes.push(nodeId);

    // Efekti uygula
    this.applyEffect(node.effect);
    return true;
  },

  /** Node efektini uygula. */
  applyEffect(effect) {
    const bonuses = GameState.conquestMap.bonuses;

    switch (effect.type) {
      case 'defenderBoost': {
        if (!bonuses.defenderBoost) bonuses.defenderBoost = {};
        if (!bonuses.defenderBoost[effect.target]) bonuses.defenderBoost[effect.target] = {};
        const current = bonuses.defenderBoost[effect.target][effect.stat] || 0;
        bonuses.defenderBoost[effect.target][effect.stat] = current + effect.value;
        break;
      }
      case 'globalBonus': {
        if (!bonuses.globalBonus) bonuses.globalBonus = {};
        const current = bonuses.globalBonus[effect.stat] || 0;
        bonuses.globalBonus[effect.stat] = current + effect.value;
        break;
      }
      case 'economy': {
        if (!bonuses.economy) bonuses.economy = {};
        const current = bonuses.economy[effect.stat] || 0;
        bonuses.economy[effect.stat] = current + effect.value;
        break;
      }
      case 'unlock': {
        if (effect.target === 'cannon') {
          // Cannon'u hire edilebilir yap (hâlâ Food gerekiyor)
          // unlocked sadece ilk hire'da true olacak — burada cannonAvailable flag
          GameState.defenders.cannon.canBeHired = true;
        }
        if (effect.target === 'prestige') {
          GameState.prestige.unlocked = true;
        }
        break;
      }
    }
  },

  /** Tüm açılmış node'ların efektlerini yeniden uygula (load sonrası). */
  reapplyAllEffects() {
    GameState.conquestMap.bonuses = {};
    for (const nodeId of GameState.conquestMap.unlockedNodes) {
      const node = CONFIG.CONQUEST_NODES[nodeId];
      if (node) this.applyEffect(node.effect);
    }
  },

  /** Belirli bir defender tipi için toplam conquest bonus çarpanını al. */
  getDefenderBonus(defenderType, statName) {
    const bonuses = GameState.conquestMap.bonuses;
    let total = 0;
    // Defender-spesifik bonus
    if (bonuses.defenderBoost?.[defenderType]?.[statName]) {
      total += bonuses.defenderBoost[defenderType][statName];
    }
    // Global bonus
    if (bonuses.globalBonus?.[statName]) {
      total += bonuses.globalBonus[statName];
    }
    return total; // 0.25 = +25%
  },

  /** Ekonomi çarpanını al. */
  getEconomyMultiplier(stat) {
    const bonuses = GameState.conquestMap.bonuses;
    return 1 + (bonuses.economy?.[stat] || 0);
  },

  /** Tüm node bilgilerini getir (UI için). */
  getAllNodesInfo() {
    return Object.values(CONFIG.CONQUEST_NODES).map(node => ({
      ...node,
      unlocked: this.isUnlocked(node.id),
      available: this.isAvailable(node.id),
      canPurchase: this.canPurchase(node.id),
    }));
  },
};

export default ConquestManager;
