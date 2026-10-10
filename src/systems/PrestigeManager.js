import GameState, { resetForPrestige } from '../state/GameState.js';
import ConquestManager from './ConquestManager.js';

/**
 * PrestigeManager — Prestige koşul kontrolü, reset, çarpan hesaplama.
 * Prestige yapılabilmesi için ConquestMap'te prestigeUnlock node'u açılmış olmalı.
 */
const PrestigeManager = {
  /** Prestige yapılabilir mi? */
  canPrestige() {
    return GameState.prestige.unlocked === true;
  },

  /** Prestige sonrası kazanılacak yeni çarpanı hesaplar. */
  getNextMultiplier() {
    const nextCount = GameState.prestige.count + 1;
    return 1 + (nextCount * 0.5);
  },

  /** Mevcut çarpanı döndürür. */
  getCurrentMultiplier() {
    return GameState.prestige.multiplier;
  },

  /**
   * Prestige işlemini gerçekleştirir.
   * @returns {boolean} Başarılı mı
   */
  doPrestige() {
    if (!this.canPrestige()) return false;

    // Çarpanı güncelle
    GameState.prestige.count += 1;
    GameState.prestige.multiplier = 1 + (GameState.prestige.count * 0.5);

    // İlerlemeyi sıfırla (çarpan ve count korunur)
    resetForPrestige(GameState);

    // Conquest bonuslarını temizle
    GameState.conquestMap.bonuses = {};
    GameState.prestige.unlocked = false;

    return true;
  },

  /** Prestige sayısını döndürür. */
  getPrestigeCount() {
    return GameState.prestige.count;
  },
};

export default PrestigeManager;
