import GameState from '../state/GameState.js';
import { CONFIG } from '../config.js';
import ConquestManager from './ConquestManager.js';

/**
 * SaveManager — localStorage otomatik kayıt/yükleme.
 * 30 saniyede bir oto-kayıt, beforeunload'da son kayıt.
 */
const SAVE_KEY = 'idle-kingdom-defense-save';

const SaveManager = {
  _intervalId: null,

  /** Oyunu localStorage'a kaydet. */
  save() {
    try {
      GameState.meta.lastSaveTime = Date.now();
      const data = {
        version: GameState.meta.saveVersion,
        timestamp: Date.now(),
        gameState: JSON.parse(JSON.stringify(GameState)),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Save failed:', e);
      return false;
    }
  },

  /** localStorage'dan yükle. Yoksa null döner. */
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.gameState) return null;
      return data;
    } catch (e) {
      console.warn('Load failed:', e);
      return null;
    }
  },

  /** Kaydedilmiş state'i GameState'e uygula. */
  applyLoad(savedData) {
    const gs = savedData.gameState;
    // Resources
    GameState.resources.exp = gs.resources?.exp || 0;
    GameState.resources.food = gs.resources?.food || 0;
    // Wave
    Object.assign(GameState.wave, gs.wave || {});
    // Defenders
    if (gs.defenders) {
      for (const type of ['laser', 'archer', 'cannon']) {
        if (gs.defenders[type]) {
          Object.assign(GameState.defenders[type], gs.defenders[type]);
        }
      }
    }
    // Conquest Map
    if (gs.conquestMap) {
      GameState.conquestMap.unlockedNodes = gs.conquestMap.unlockedNodes || [];
      GameState.conquestMap.bonuses = gs.conquestMap.bonuses || {};
    }
    // Prestige
    if (gs.prestige) {
      Object.assign(GameState.prestige, gs.prestige);
    }
    // Stats
    if (gs.stats) {
      Object.assign(GameState.stats, gs.stats);
    }
    // Meta
    if (gs.meta) {
      Object.assign(GameState.meta, gs.meta);
    }

    // Conquest bonuslarını yeniden uygula
    ConquestManager.reapplyAllEffects();
  },

  /** Otomatik kayıt başlat. */
  startAutoSave() {
    if (this._intervalId) return;
    this._intervalId = setInterval(() => this.save(), CONFIG.SAVE_INTERVAL);

    // beforeunload — son kayıt
    window.addEventListener('beforeunload', () => this.save());
  },

  /** Otomatik kaydı durdur. */
  stopAutoSave() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  },

  /** Save sil (debug/reset için). */
  deleteSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('Delete save failed:', e);
    }
  },
};

export default SaveManager;
