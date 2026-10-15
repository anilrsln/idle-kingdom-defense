import GameState, { resetForPrestige } from '../state/GameState.js';
import { CONFIG } from '../config.js';
import ConquestManager from './ConquestManager.js';
import PerkManager from './PerkManager.js';

/**
 * PrestigeManager — Prestige koşul kontrolü, reset, çarpan + trophy hesaplama.
 * Prestige yapılabilmesi için ConquestMap'te prestigeUnlock node'u açılmış olmalı.
 */
const PrestigeManager = {
  /** Prestige yapılabilir mi? */
  canPrestige() {
    return GameState.prestige.unlocked === true;
  },

  /** Verilen prestige sayısı için çarpan (perk bonusu dahil). */
  multiplierFor(count) {
    return 1 + (count * CONFIG.PRESTIGE.multiplierPerPrestige) + PerkManager.getPrestigeBonus();
  },

  /** Prestige sonrası kazanılacak yeni çarpan. */
  getNextMultiplier() {
    return this.multiplierFor(GameState.prestige.count + 1);
  },

  /** Mevcut çarpanı döndürür. */
  getCurrentMultiplier() {
    return GameState.prestige.multiplier;
  },

  /** Bu prestige'de kazanılacak Trophy sayısı (yüksek wave = daha çok). */
  getTrophyGain() {
    const wave = GameState.wave.current || 1;
    return CONFIG.TROPHY_PER_PRESTIGE + Math.floor(wave / 25);
  },

  /**
   * Prestige işlemini gerçekleştirir.
   * @returns {{ trophies: number } | false}
   */
  doPrestige() {
    if (!this.canPrestige()) return false;

    // Trophy kazancı (reset'ten ÖNCE, güncel wave'e göre)
    const gain = this.getTrophyGain();

    // Çarpanı ve sayacı güncelle (perk bonusu dahil)
    GameState.prestige.count += 1;
    GameState.prestige.multiplier = this.multiplierFor(GameState.prestige.count);

    // İlerlemeyi sıfırla (trophy/perk/count/multiplier korunur)
    resetForPrestige(GameState);

    // Conquest bonuslarını temizle
    GameState.conquestMap.bonuses = {};
    GameState.prestige.unlocked = false;

    // Trophy'leri ekle + başlangıç bonusu perk'ini uygula
    GameState.prestige.trophies += gain;
    GameState.resources.exp += PerkManager.getStartBonus();

    return { trophies: gain };
  },

  getPrestigeCount() {
    return GameState.prestige.count;
  },
};

export default PrestigeManager;
