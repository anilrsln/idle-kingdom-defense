import GameState from '../state/GameState.js';
import { CONFIG } from '../config.js';

/**
 * IdleManager — Offline gelir hesaplama.
 *
 * Gerçekçi model: idle geliri, oyuncunun oynarken ÖLÇÜLEN gerçek kazanım
 * hızına (GameState.meta.expRate / foodRate) dayanır. Bu hız gerçek DPS,
 * upgrade'ler, wave ve tüm çarpanları (prestige/conquest/ekonomi) zaten
 * içerir — bu yüzden burada tekrar çarpan uygulanmaz, sadece verimlilik.
 */
const IdleManager = {
  calculateIdleEarnings() {
    const lastSave = GameState.meta.lastSaveTime;
    if (!lastSave) return null;

    const now = Date.now();
    let elapsedMs = now - lastSave;
    if (elapsedMs < 60000) return null; // 1 dakikadan kısa — idle yok

    const maxMs = CONFIG.MAX_IDLE_HOURS * 3600 * 1000;
    if (elapsedMs > maxMs) elapsedMs = maxMs;
    const elapsedSeconds = elapsedMs / 1000;

    const expRate = GameState.meta.expRate || 0;
    const foodRate = GameState.meta.foodRate || 0;
    const exp = Math.floor(expRate * elapsedSeconds * CONFIG.IDLE_EFFICIENCY);
    const food = Math.floor(foodRate * elapsedSeconds * CONFIG.IDLE_EFFICIENCY);

    if (exp <= 0 && food <= 0) return null; // henüz ölçülmüş hız yok

    return { elapsedSeconds, exp, food };
  },

  applyEarnings(earnings) {
    GameState.resources.exp += earnings.exp;
    GameState.resources.food += earnings.food;
    GameState.stats.totalExpEarned += earnings.exp;
    GameState.stats.totalFoodEarned += earnings.food;
  },
};

export default IdleManager;
