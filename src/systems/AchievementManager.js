import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';

/**
 * AchievementManager — Başarım koşullarını kontrol eder ve açılanları bildirir.
 *
 * Tanımlar CONFIG.ACHIEVEMENTS'te (her biri check(GameState) döndürür).
 * Açılan başarımlar GameState.achievements.unlocked'da tutulur (kayda yazılır,
 * prestige'de korunur, Yeni Oyun'da sıfırlanır). Açılınca 'achievement-unlocked'
 * event'i yayılır (UIScene toast gösterir) + kısa ses.
 */
const AchievementManager = {
  _game: null,

  init(game) { this._game = game; },

  isUnlocked(id) { return GameState.achievements.unlocked.includes(id); },

  /** Tüm kilitli başarımları kontrol eder; koşulu sağlananları açar. */
  check() {
    for (const id in CONFIG.ACHIEVEMENTS) {
      if (this.isUnlocked(id)) continue;
      const def = CONFIG.ACHIEVEMENTS[id];
      let ok = false;
      try { ok = !!def.check(GameState); } catch (e) { ok = false; }
      if (ok) this._unlock(id, def);
    }
  },

  _unlock(id, def) {
    GameState.achievements.unlocked.push(id);
    if (this._game) {
      this._game.events.emit('achievement-unlocked', { id, name: def.name, desc: def.desc });
      this._game.events.emit('sfx', 'hire');
    }
  },

  /** UI listesi için tüm başarımlar + durum. */
  getAll() {
    return Object.keys(CONFIG.ACHIEVEMENTS).map((id) => {
      const d = CONFIG.ACHIEVEMENTS[id];
      return { id, name: d.name, desc: d.desc, unlocked: this.isUnlocked(id) };
    });
  },

  unlockedCount() { return GameState.achievements.unlocked.length; },
  total() { return Object.keys(CONFIG.ACHIEVEMENTS).length; },
};

export default AchievementManager;
