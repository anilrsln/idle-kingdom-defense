import GameState from '../state/GameState.js';
import { CONFIG } from '../config.js';
import ConquestManager from './ConquestManager.js';

/**
 * IdleManager — Offline gelir hesaplama.
 * Son kayıt zamanı ile şimdiki zaman arasındaki farktan idle gelir üretir.
 */
const IdleManager = {
  /**
   * Offline süreyi ve kazanılacak kaynakları hesaplar.
   * @returns {{ elapsedSeconds: number, exp: number, food: number } | null}
   */
  calculateIdleEarnings() {
    const lastSave = GameState.meta.lastSaveTime;
    if (!lastSave) return null;

    const now = Date.now();
    let elapsedMs = now - lastSave;
    if (elapsedMs < 60000) return null; // 1 dakikadan kısa — idle yok

    // Maks idle süresi
    const maxMs = CONFIG.MAX_IDLE_HOURS * 3600 * 1000;
    if (elapsedMs > maxMs) elapsedMs = maxMs;

    const elapsedSeconds = elapsedMs / 1000;

    // Tahmini kaynak/saniye: son wave'deki düşmanlardan
    // Basit hesaplama: wave * baseDrop * efficiency
    const wave = GameState.wave.current || 1;
    const baseExpPerSec = 0.5 + (wave * 0.3);  // Artan wave ile daha fazla
    const baseFoodPerSec = 0.1 + (wave * 0.05);

    const prestigeMult = GameState.prestige.multiplier;
    const expMult = prestigeMult * ConquestManager.getEconomyMultiplier('expMultiplier');
    const foodMult = prestigeMult * ConquestManager.getEconomyMultiplier('foodMultiplier');

    const exp = Math.floor(baseExpPerSec * elapsedSeconds * CONFIG.IDLE_EFFICIENCY * expMult);
    const food = Math.floor(baseFoodPerSec * elapsedSeconds * CONFIG.IDLE_EFFICIENCY * foodMult);

    return { elapsedSeconds, exp, food };
  },

  /**
   * Idle kaynakları ekle.
   * @param {{ exp: number, food: number }} earnings
   */
  applyEarnings(earnings) {
    GameState.resources.exp += earnings.exp;
    GameState.resources.food += earnings.food;
    GameState.stats.totalExpEarned += earnings.exp;
    GameState.stats.totalFoodEarned += earnings.food;
  },
};

export default IdleManager;
