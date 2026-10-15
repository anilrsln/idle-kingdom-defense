import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';
import { formatNumber } from '../utils/NumberFormatter.js';
import UpgradeManager from '../systems/UpgradeManager.js';
import EconomyManager from '../systems/EconomyManager.js';
import PrestigeManager from '../systems/PrestigeManager.js';

/**
 * UIScene — HUD overlay + alt yükseltme paneli.
 * Üst bar: EXP, Food, Wave, düşman sayacı, FPS.
 * Alt panel: Savunucu sekmeleri (Laser/Archer/Cannon), upgrade butonları, hire butonu.
 */
export default class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene' }); }

  create() {
    // ═══════ ÜST BAR (HUD) ═══════
    this.topBar = this.add.rectangle(CONFIG.CANVAS_WIDTH / 2, 15, CONFIG.CANVAS_WIDTH, 30, CONFIG.COLORS.UI_BG, 0.85).setDepth(100);

    this.expText = this.add.text(10, 5, '', this.textStyle(14, '#ffd700')).setDepth(101);
    this.foodText = this.add.text(180, 5, '', this.textStyle(14, '#66ff66')).setDepth(101);
    this.waveText = this.add.text(340, 5, '', this.textStyle(14, '#ffffff')).setDepth(101);
    this.enemyText = this.add.text(480, 5, '', this.textStyle(11, '#aaaaaa')).setDepth(101);
    this.prestigeText = this.add.text(560, 5, '', this.textStyle(10, '#9b59b6')).setDepth(101);
    this.fpsText = this.add.text(720, 5, '', this.textStyle(11, '#666666')).setDepth(101);

    // Wave progress bar (top bar altı)
    this.waveProgressBg = this.add.rectangle(CONFIG.CANVAS_WIDTH / 2, 31, CONFIG.CANVAS_WIDTH, 3, 0x333333, 0.6).setDepth(100);
    this.waveProgressFill = this.add.rectangle(0, 31, 0, 3, 0xe94560, 0.8).setDepth(101).setOrigin(0, 0.5);

    // MAP butonu (üst bar sağ taraf)
    const mapBtn = this.add.rectangle(660, 15, 50, 22, CONFIG.COLORS.UI_ACCENT).setDepth(102).setInteractive({ useHandCursor: true });
    this.add.text(660, 15, '⚔ MAP', this.textStyle(10, '#ffffff')).setOrigin(0.5).setDepth(103);
    mapBtn.on('pointerdown', () => this.openConquestMap());
    mapBtn.on('pointerover', () => mapBtn.setFillStyle(0xff6680));
    mapBtn.on('pointerout', () => mapBtn.setFillStyle(CONFIG.COLORS.UI_ACCENT));

    // Prestige butonu (MAP'ın solunda, sadece unlock olunca görünür)
    this.prestigeBtn = this.add.rectangle(595, 15, 60, 22, 0x9b59b6).setDepth(102).setInteractive({ useHandCursor: true }).setVisible(false);
    this.prestigeBtnLabel = this.add.text(595, 15, '✦ PRESTIGE', this.textStyle(9, '#ffffff')).setOrigin(0.5).setDepth(103).setVisible(false);
    this.prestigeBtn.on('pointerdown', () => this.showPrestigeDialog());
    this.prestigeBtn.on('pointerover', () => this.prestigeBtn.setFillStyle(0xb07cc8));
    this.prestigeBtn.on('pointerout', () => this.prestigeBtn.setFillStyle(0x9b59b6));

    // Menü/Ayarlar butonu (üst bar sağ köşe) — oyunu duraklatıp menüyü açar
    this.menuBtn = this.add.rectangle(786, 15, 24, 22, CONFIG.COLORS.UI_BUTTON, 1)
      .setDepth(102).setInteractive({ useHandCursor: true });
    this.menuBtnLabel = this.add.text(786, 15, '⚙', this.textStyle(15, '#ffffff'))
      .setOrigin(0.5).setDepth(103);
    this.menuBtn.on('pointerdown', () => this.openMenu());
    this.menuBtn.on('pointerover', () => this.menuBtn.setFillStyle(CONFIG.COLORS.UI_BUTTON_HOVER));
    this.menuBtn.on('pointerout', () => this.menuBtn.setFillStyle(CONFIG.COLORS.UI_BUTTON));

    // Prestige dialog elementleri
    this.prestigeDialog = null;

    // Conquest kapanma dinleyicisi
    this.game.events.on('conquest-closed', () => { this.panelDirty = true; });

    // Flash efekti için referanslar
    this.lastExp = GameState.resources.exp;
    this.lastFood = GameState.resources.food;
    this.expFlashTimer = 0;
    this.foodFlashTimer = 0;

    // ═══════ ALT PANEL (Upgrade) ═══════
    this.panelHeight = 120;
    this.panelY = CONFIG.CANVAS_HEIGHT - this.panelHeight;

    // Panel arka planı
    this.panelBg = this.add.rectangle(
      CONFIG.CANVAS_WIDTH / 2, this.panelY + this.panelHeight / 2,
      CONFIG.CANVAS_WIDTH, this.panelHeight, CONFIG.COLORS.UI_BG, 0.9
    ).setDepth(100);

    // Ayırıcı çizgi
    this.add.rectangle(CONFIG.CANVAS_WIDTH / 2, this.panelY, CONFIG.CANVAS_WIDTH, 2, CONFIG.COLORS.UI_ACCENT, 0.5).setDepth(101);

    // Sekmeler
    this.tabs = ['laser', 'archer', 'cannon', 'economy'];
    this.activeTab = 'laser';
    this.tabButtons = [];
    this.createTabs();

    // Upgrade alanı
    this.upgradeElements = [];
    this.hireButton = null;

    // Dirty flag — panel sadece gerektiğinde yeniden çizilir
    this.panelDirty = true;
    this.lastActiveTab = null;
    this.lastExp = 0;
    this.lastFood = 0;

    // GameScene event dinle
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('enemy-killed', this.onEnemyKilled, this);

    // Başarım açılınca toast
    this.game.events.off('achievement-unlocked', this.showAchievementToast, this);
    this.game.events.on('achievement-unlocked', this.showAchievementToast, this);
    this.events.once('shutdown', () => this.game.events.off('achievement-unlocked', this.showAchievementToast, this));
  }

  /** Başarım açıldığında üstte kısa bir bildirim. */
  showAchievementToast(data) {
    if (this._achvToast) this._achvToast.forEach(e => e.destroy());
    const cx = CONFIG.CANVAS_WIDTH / 2, y = 56;
    const bg = this.add.rectangle(cx, y, 270, 40, 0x1a1a2e, 0.96).setDepth(250).setStrokeStyle(2, CONFIG.COLORS.UI_GOLD);
    const title = this.add.text(cx, y - 8, `🏆 ${data.name}`, this.textStyle(12, '#ffd700')).setOrigin(0.5).setDepth(251);
    const desc = this.add.text(cx, y + 8, data.desc, this.textStyle(9, '#cccccc')).setOrigin(0.5).setDepth(251);
    const els = [bg, title, desc];
    this._achvToast = els;
    els.forEach(e => e.setAlpha(0));
    this.tweens.add({ targets: els, alpha: 1, duration: 250 });
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: els, alpha: 0, duration: 400,
        onComplete: () => els.forEach(e => e.destroy()),
      });
      if (this._achvToast === els) this._achvToast = null;
    });
  }

  textStyle(size, color) {
    return {
      fontSize: `${size}px`, fontFamily: 'monospace',
      color, stroke: '#000', strokeThickness: 1,
    };
  }

  // ═══════ SEKMELER ═══════
  createTabs() {
    const tabNames = { laser: 'Laser', archer: 'Archer', cannon: 'Cannon', economy: 'Ekonomi' };
    const tabWidth = 80, tabHeight = 22, startX = 10, tabY = this.panelY + 5;

    this.tabs.forEach((type, i) => {
      const x = startX + i * (tabWidth + 5) + tabWidth / 2;
      const y = tabY + tabHeight / 2;

      const bg = this.add.rectangle(x, y, tabWidth, tabHeight, CONFIG.COLORS.UI_BUTTON, 1).setDepth(102).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, tabNames[type], this.textStyle(11, '#ffffff')).setOrigin(0.5).setDepth(103);

      bg.on('pointerdown', () => { this.activeTab = type; this.updateTabs(); this.panelDirty = true; });
      bg.on('pointerover', () => { if (this.activeTab !== type) bg.setFillStyle(CONFIG.COLORS.UI_BUTTON_HOVER); });
      bg.on('pointerout', () => { this.updateTabs(); });

      this.tabButtons.push({ type, bg, label });
    });
    this.updateTabs();
  }

  updateTabs() {
    this.tabButtons.forEach(({ type, bg }) => {
      bg.setFillStyle(type === this.activeTab ? CONFIG.COLORS.UI_ACCENT : CONFIG.COLORS.UI_BUTTON);
    });
  }

  // ═══════ UPGRADE BUTONLARI ═══════
  clearUpgradeElements() {
    this.upgradeElements.forEach(el => el.destroy());
    this.upgradeElements = [];
    if (this.hireButton) { this.hireButton.bg.destroy(); this.hireButton.label.destroy(); this.hireButton = null; }
  }

  renderUpgradePanel() {
    this.clearUpgradeElements();
    if (this.activeTab === 'economy') { this.renderEconomyPanel(); return; }
    const info = UpgradeManager.getDefenderUpgradeInfo(this.activeTab);
    const startX = 10, startY = this.panelY + 32;

    // Conquest kilidi (Cannon)
    if (info.conquestLocked) {
      const lockText = this.add.text(CONFIG.CANVAS_WIDTH / 2, startY + 30,
        '🔒 Unlock via Conquest Map (Cannon Unlock node)',
        this.textStyle(12, '#888888')
      ).setOrigin(0.5).setDepth(102);
      this.upgradeElements.push(lockText);
      return;
    }

    // Kilitli defender
    if (!info.unlocked) {
      const lockText = this.add.text(CONFIG.CANVAS_WIDTH / 2, startY + 25,
        `Hire first ${CONFIG.DEFENDERS[this.activeTab].name} (${formatNumber(info.hireCost)} Food)`,
        this.textStyle(13, '#aaaaaa')
      ).setOrigin(0.5).setDepth(102);
      this.upgradeElements.push(lockText);

      this.createHireButton(CONFIG.CANVAS_WIDTH / 2, startY + 55, info);
      return;
    }

    // Stat upgrade butonları
    const cols = info.stats.length;
    const btnWidth = Math.min(150, (CONFIG.CANVAS_WIDTH - 20) / cols - 8);

    info.stats.forEach((stat, i) => {
      const x = startX + i * (btnWidth + 8);
      const y = startY;

      // Stat etiketi
      const lbl = this.add.text(x, y, `${stat.label} Lv.${stat.level}`, this.textStyle(10, '#cccccc')).setDepth(102);
      this.upgradeElements.push(lbl);

      // Değer
      const valStr = `${formatNumber(stat.currentValue)} → ${formatNumber(stat.nextValue)}`;
      const valText = this.add.text(x, y + 14, valStr, this.textStyle(9, '#888888')).setDepth(102);
      this.upgradeElements.push(valText);

      // Buton
      const btnX = x + btnWidth / 2;
      const btnY = y + 38;
      const color = stat.canAfford ? CONFIG.COLORS.UI_BUTTON : CONFIG.COLORS.UI_BUTTON_DISABLED;
      const bg = this.add.rectangle(btnX, btnY, btnWidth, 22, color, 1).setDepth(102).setInteractive({ useHandCursor: true });
      const costLabel = this.add.text(btnX, btnY, `${formatNumber(stat.cost)} EXP`, this.textStyle(10, stat.canAfford ? '#ffd700' : '#666666')).setOrigin(0.5).setDepth(103);

      bg.on('pointerdown', () => {
        if (UpgradeManager.purchaseUpgrade(this.activeTab, stat.name)) {
          this.flashButton(bg);
          this.panelDirty = true;
          this.game.events.emit('sfx', 'upgrade');
          this.game.events.emit('defender-upgraded', { type: this.activeTab });
        } else {
          this.game.events.emit('sfx', 'uiDenied');
        }
      });
      bg.on('pointerover', () => { if (stat.canAfford) bg.setFillStyle(CONFIG.COLORS.UI_BUTTON_HOVER); });
      bg.on('pointerout', () => { bg.setFillStyle(stat.canAfford ? CONFIG.COLORS.UI_BUTTON : CONFIG.COLORS.UI_BUTTON_DISABLED); });

      this.upgradeElements.push(bg, costLabel);
    });

    // Hire butonu (archer/cannon için)
    if (this.activeTab !== 'laser') {
      const hireX = CONFIG.CANVAS_WIDTH - 90;
      const hireY = startY + 20;
      this.createHireButton(hireX, hireY, info);

      // Sayı göstergesi
      const countText = this.add.text(hireX, hireY + 22,
        `${info.count}/${info.maxCount}`, this.textStyle(10, '#aaaaaa')
      ).setOrigin(0.5).setDepth(102);
      this.upgradeElements.push(countText);
    }
  }

  /** Ekonomi sekmesi: EXP Boost / Food Boost upgrade'leri. */
  renderEconomyPanel() {
    const startX = 10, startY = this.panelY + 32;
    const keys = Object.keys(CONFIG.ECONOMY_UPGRADES);
    const btnWidth = Math.min(180, (CONFIG.CANVAS_WIDTH - 20) / keys.length - 8);

    keys.forEach((key, i) => {
      const cfg = CONFIG.ECONOMY_UPGRADES[key];
      const level = GameState.economy?.[key]?.level || 0;
      const curMult = EconomyManager.getEconomyBoostMultiplier(key);
      const nextMult = 1 + (level + 1) * cfg.bonusPerLevel;
      const cost = EconomyManager.getEconomyUpgradeCost(key);
      const canAfford = EconomyManager.canAffordEconomyUpgrade(key);

      const x = startX + i * (btnWidth + 8);
      const y = startY;

      const lbl = this.add.text(x, y, `${cfg.name} Lv.${level}`, this.textStyle(10, '#cccccc')).setDepth(102);
      const valText = this.add.text(x, y + 14, `${curMult.toFixed(2)}x → ${nextMult.toFixed(2)}x`, this.textStyle(9, '#888888')).setDepth(102);

      const btnX = x + btnWidth / 2, btnY = y + 38;
      const color = canAfford ? CONFIG.COLORS.UI_BUTTON : CONFIG.COLORS.UI_BUTTON_DISABLED;
      const bg = this.add.rectangle(btnX, btnY, btnWidth, 22, color, 1).setDepth(102).setInteractive({ useHandCursor: true });
      const costLabel = this.add.text(btnX, btnY, `${formatNumber(cost)} EXP`, this.textStyle(10, canAfford ? '#ffd700' : '#666666')).setOrigin(0.5).setDepth(103);

      bg.on('pointerdown', () => {
        if (EconomyManager.purchaseEconomyUpgrade(key)) {
          this.flashButton(bg); this.panelDirty = true; this.game.events.emit('sfx', 'upgrade');
        } else {
          this.game.events.emit('sfx', 'uiDenied');
        }
      });
      bg.on('pointerover', () => { if (canAfford) bg.setFillStyle(CONFIG.COLORS.UI_BUTTON_HOVER); });
      bg.on('pointerout', () => bg.setFillStyle(canAfford ? CONFIG.COLORS.UI_BUTTON : CONFIG.COLORS.UI_BUTTON_DISABLED));

      this.upgradeElements.push(lbl, valText, bg, costLabel);
    });
  }

  createHireButton(x, y, info) {
    const canHire = info.canHire;
    const color = canHire ? 0x1a6a1a : CONFIG.COLORS.UI_BUTTON_DISABLED;
    const bg = this.add.rectangle(x, y, 130, 26, color, 1).setDepth(102).setInteractive({ useHandCursor: true });

    const labelStr = info.unlocked
      ? `Hire +1 (${formatNumber(info.hireCost)} Food)`
      : `Unlock (${formatNumber(info.hireCost)} Food)`;
    const label = this.add.text(x, y, labelStr, this.textStyle(10, canHire ? '#66ff66' : '#666666')).setOrigin(0.5).setDepth(103);

    bg.on('pointerdown', () => {
      if (UpgradeManager.hireDefender(this.activeTab)) {
        this.flashButton(bg);
        this.panelDirty = true;
        this.game.events.emit('sfx', 'hire');
      } else {
        this.game.events.emit('sfx', 'uiDenied');
      }
    });
    bg.on('pointerover', () => { if (canHire) bg.setFillStyle(0x2a8a2a); });
    bg.on('pointerout', () => { bg.setFillStyle(canHire ? 0x1a6a1a : CONFIG.COLORS.UI_BUTTON_DISABLED); });

    this.hireButton = { bg, label };
  }

  flashButton(bg) {
    this.tweens.add({
      targets: bg, alpha: 0.5, duration: 80, yoyo: true,
    });
  }

  // ═══════ PRESTIGE ═══════
  showPrestigeDialog() {
    if (this.prestigeDialog) return;
    const cx = CONFIG.CANVAS_WIDTH / 2;
    const cy = CONFIG.CANVAS_HEIGHT / 2;

    const bg = this.add.rectangle(cx, cy, 340, 200, 0x0a0a2a, 0.95).setDepth(300).setStrokeStyle(2, 0x9b59b6);
    const title = this.add.text(cx, cy - 70, '✦ PRESTIGE ✦', {
      fontSize: '20px', fontFamily: 'monospace', color: '#9b59b6',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(301);

    const currentMult = PrestigeManager.getCurrentMultiplier();
    const nextMult = PrestigeManager.getNextMultiplier();

    const info = this.add.text(cx, cy - 30, [
      `Current Multiplier: ${currentMult.toFixed(1)}x`,
      `After Prestige: ${nextMult.toFixed(1)}x`,
      '',
      'All progress will be RESET!',
      'Multiplier is permanent.',
    ].join('\n'), {
      fontSize: '11px', fontFamily: 'monospace', color: '#cccccc',
      stroke: '#000', strokeThickness: 1, align: 'center',
    }).setOrigin(0.5).setDepth(301);

    // Onayla butonu
    const confirmBtn = this.add.rectangle(cx - 60, cy + 65, 100, 28, 0x9b59b6).setDepth(302).setInteractive({ useHandCursor: true });
    const confirmLbl = this.add.text(cx - 60, cy + 65, 'PRESTIGE', this.textStyle(11, '#ffffff')).setOrigin(0.5).setDepth(303);
    confirmBtn.on('pointerdown', () => {
      this.closePrestigeDialog();
      this.doPrestige();
    });
    confirmBtn.on('pointerover', () => confirmBtn.setFillStyle(0xb07cc8));
    confirmBtn.on('pointerout', () => confirmBtn.setFillStyle(0x9b59b6));

    // İptal butonu
    const cancelBtn = this.add.rectangle(cx + 60, cy + 65, 100, 28, 0x444466).setDepth(302).setInteractive({ useHandCursor: true });
    const cancelLbl = this.add.text(cx + 60, cy + 65, 'CANCEL', this.textStyle(11, '#ffffff')).setOrigin(0.5).setDepth(303);
    cancelBtn.on('pointerdown', () => this.closePrestigeDialog());
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x555577));
    cancelBtn.on('pointerout', () => cancelBtn.setFillStyle(0x444466));

    this.prestigeDialog = [bg, title, info, confirmBtn, confirmLbl, cancelBtn, cancelLbl];
  }

  closePrestigeDialog() {
    if (this.prestigeDialog) {
      this.prestigeDialog.forEach(el => el.destroy());
      this.prestigeDialog = null;
    }
  }

  doPrestige() {
    if (PrestigeManager.doPrestige()) {
      this.game.events.emit('sfx', 'prestige');
      // GameScene'i yeniden başlat
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('GameScene');
    }
  }

  // ═══════ CONQUEST MAP ═══════
  openConquestMap() {
    if (!this.scene.isActive('ConquestScene')) {
      this.game.events.emit('sfx', 'mapOpen');
      this.scene.launch('ConquestScene');
    }
  }

  // ═══════ MENÜ / AYARLAR ═══════
  /** Oyunu duraklatıp Ayarlar/Pause menüsünü açar. */
  openMenu() {
    if (this.scene.isActive('MenuScene')) return;
    this.game.events.emit('sfx', 'mapOpen');
    this.scene.pause('GameScene');
    this.scene.launch('MenuScene', { mode: 'pause' });
    this.scene.pause(); // UIScene'i de duraklat — arka plan tıklamalarını engeller
  }

  // ═══════ HUD GÜNCELLEMESİ ═══════
  onEnemyKilled() {
    this.expFlashTimer = 0.3;
    this.foodFlashTimer = 0.3;
    this.panelDirty = true; // Kaynak değişti, butonları güncelle
  }

  update(time, deltaMs) {
    const delta = deltaMs / 1000;

    // HUD texleri
    this.expText.setText(`⚡ ${formatNumber(GameState.resources.exp)} EXP`);
    this.foodText.setText(`🍖 ${formatNumber(GameState.resources.food)} Food`);
    this.waveText.setText(`Wave ${GameState.wave.current}`);
    this.enemyText.setText(`E: ${GameState.wave.enemiesKilled}/${GameState.wave.enemiesInWave}`);

    // Wave progress bar
    const waveProgress = GameState.wave.enemiesInWave > 0
      ? GameState.wave.enemiesKilled / GameState.wave.enemiesInWave : 0;
    this.waveProgressFill.width = CONFIG.CANVAS_WIDTH * Math.min(1, waveProgress);
    if (GameState.prestige.count > 0) {
      this.prestigeText.setText(`✦${GameState.prestige.multiplier.toFixed(1)}x`);
    } else {
      this.prestigeText.setText('');
    }
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} FPS`);

    // Flash efektleri
    if (this.expFlashTimer > 0) {
      this.expFlashTimer -= delta;
      this.expText.setColor(this.expFlashTimer > 0.15 ? '#ffffff' : '#ffd700');
    }
    if (this.foodFlashTimer > 0) {
      this.foodFlashTimer -= delta;
      this.foodText.setColor(this.foodFlashTimer > 0.15 ? '#ffffff' : '#66ff66');
    }

    // Prestige butonu görünürlüğü
    const canPrestige = PrestigeManager.canPrestige();
    this.prestigeBtn.setVisible(canPrestige);
    this.prestigeBtnLabel.setVisible(canPrestige);

    // Upgrade paneli — dirty flag ile güncelle
    if (this.panelDirty) {
      this.renderUpgradePanel();
      this.panelDirty = false;
    }
  }
}
