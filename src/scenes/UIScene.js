import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';
import { formatNumber } from '../utils/NumberFormatter.js';
import UpgradeManager from '../systems/UpgradeManager.js';
import EconomyManager from '../systems/EconomyManager.js';
import PrestigeManager from '../systems/PrestigeManager.js';
import ComboManager from '../systems/ComboManager.js';
import { t, toggleLocale, getLocale } from '../i18n/index.js';

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

    // Combo göstergesi (saha üstü, ortada)
    this.comboText = this.add.text(CONFIG.CANVAS_WIDTH / 2, 48, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ff8800',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(120).setAlpha(0);

    // Wave progress bar (top bar altı)
    this.waveProgressBg = this.add.rectangle(CONFIG.CANVAS_WIDTH / 2, 31, CONFIG.CANVAS_WIDTH, 3, 0x333333, 0.6).setDepth(100);
    this.waveProgressFill = this.add.rectangle(0, 31, 0, 3, 0xe94560, 0.8).setDepth(101).setOrigin(0, 0.5);

    // MAP butonu (üst bar sağ taraf)
    const mapBtn = this.add.rectangle(660, 15, 50, 22, CONFIG.COLORS.UI_ACCENT).setDepth(102);
    this.enlargeHit(mapBtn, 54, 40);
    this.add.text(660, 15, t('ui.mapBtn'), this.textStyle(10, '#ffffff')).setOrigin(0.5).setDepth(103);
    mapBtn.on('pointerdown', () => this.openConquestMap());
    mapBtn.on('pointerover', () => mapBtn.setFillStyle(0xff6680));
    mapBtn.on('pointerout', () => mapBtn.setFillStyle(CONFIG.COLORS.UI_ACCENT));

    // Prestige butonu (MAP'ın solunda, sadece unlock olunca görünür)
    this.prestigeBtn = this.add.rectangle(595, 15, 60, 22, 0x9b59b6).setDepth(102).setVisible(false);
    this.enlargeHit(this.prestigeBtn, 64, 40);
    this.prestigeBtnLabel = this.add.text(595, 15, t('ui.prestigeBtn'), this.textStyle(9, '#ffffff')).setOrigin(0.5).setDepth(103).setVisible(false);
    this.prestigeBtn.on('pointerdown', () => this.showPrestigeDialog());
    this.prestigeBtn.on('pointerover', () => this.prestigeBtn.setFillStyle(0xb07cc8));
    this.prestigeBtn.on('pointerout', () => this.prestigeBtn.setFillStyle(0x9b59b6));

    // Menü/Ayarlar butonu (üst bar sağ köşe) — oyunu duraklatıp menüyü açar
    this.menuBtn = this.add.rectangle(786, 15, 24, 22, CONFIG.COLORS.UI_BUTTON, 1).setDepth(102);
    this.enlargeHit(this.menuBtn, 40, 40);
    this.menuBtnLabel = this.add.text(786, 15, '⚙', this.textStyle(15, '#ffffff'))
      .setOrigin(0.5).setDepth(103);
    this.menuBtn.on('pointerdown', () => this.openMenu());
    this.menuBtn.on('pointerover', () => this.menuBtn.setFillStyle(CONFIG.COLORS.UI_BUTTON_HOVER));
    this.menuBtn.on('pointerout', () => this.menuBtn.setFillStyle(CONFIG.COLORS.UI_BUTTON));

    // Dil toggle butonu (TR ⇄ EN) — menü butonunun solunda
    this.langBtn = this.add.rectangle(752, 15, 30, 22, 0x2a2a4a, 1).setDepth(102);
    this.enlargeHit(this.langBtn, 40, 40);
    this.langBtnLabel = this.add.text(752, 15, t('ui.langBtn'), this.textStyle(10, '#ffffff'))
      .setOrigin(0.5).setDepth(103);
    this.langBtn.on('pointerdown', () => { toggleLocale(); this.game.events.emit('sfx', 'uiClick'); });
    this.langBtn.on('pointerover', () => this.langBtn.setFillStyle(0x3a3a5a));
    this.langBtn.on('pointerout', () => this.langBtn.setFillStyle(0x2a2a4a));

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
    this.panelHeight = CONFIG.CANVAS_HEIGHT - CONFIG.CORRIDOR_BOTTOM - 5; // tam oyun alani altinda
    this.panelY = CONFIG.CORRIDOR_BOTTOM + 5;

    // Panel arka planı
    this.panelBg = this.add.rectangle(
      CONFIG.CANVAS_WIDTH / 2, this.panelY + this.panelHeight / 2,
      CONFIG.CANVAS_WIDTH, this.panelHeight, CONFIG.COLORS.UI_BG, 0.9
    ).setDepth(100);

    // Ayırıcı çizgi
    this.add.rectangle(CONFIG.CANVAS_WIDTH / 2, this.panelY, CONFIG.CANVAS_WIDTH, 2, CONFIG.COLORS.UI_ACCENT, 0.5).setDepth(101);

    // Sekmeler
    this.tabs = ['laser', 'archer', 'cannon', 'frost', 'catapult', 'economy'];
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

    // Wave milestone bildirimi
    const gs2 = this.scene.get('GameScene');
    gs2.events.on('wave-milestone', this.showMilestoneToast, this);
    this.events.once('shutdown', () => gs2.events.off('wave-milestone', this.showMilestoneToast, this));
  }

  /** Wave milestone ödülü bildirimi. */
  showMilestoneToast(data) {
    if (this._milestoneToast) this._milestoneToast.forEach(e => e.destroy());
    const cx = CONFIG.CANVAS_WIDTH / 2, y = 100;
    const isBig = data.isBig;
    const borderColor = isBig ? 0xffd700 : 0x66ccff;
    const titleTxt = isBig ? `🌟 Büyük Milestone! Dalga ${data.wave}` : `⚡ Milestone! Dalga ${data.wave}`;
    const rewardTxt = `+${formatNumber(data.expReward)} EXP  +${formatNumber(data.foodReward)} 🍖`;
    const bgColor = isBig ? 0x1a1000 : 0x001a1a;
    const bg = this.add.rectangle(cx, y, 320, isBig ? 52 : 46, bgColor, 0.97).setDepth(252).setStrokeStyle(2, borderColor);
    const title = this.add.text(cx, y - 10, titleTxt, this.textStyle(isBig ? 13 : 12, isBig ? '#ffd700' : '#66ccff')).setOrigin(0.5).setDepth(253);
    const reward = this.add.text(cx, y + 10, rewardTxt, this.textStyle(11, '#ffffff')).setOrigin(0.5).setDepth(253);
    const els = [bg, title, reward];
    this._milestoneToast = els;
    els.forEach(e => e.setAlpha(0));
    this.tweens.add({ targets: els, alpha: 1, duration: 300 });
    if (isBig) {
      // Büyük milestone için hafif pulse animasyonu
      this.tweens.add({ targets: bg, scaleX: 1.04, scaleY: 1.04, duration: 200, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
    }
    const dur = isBig ? 4000 : 3000;
    this.time.delayedCall(dur, () => {
      this.tweens.add({
        targets: els, alpha: 0, duration: 500,
        onComplete: () => els.forEach(e => e.destroy()),
      });
      if (this._milestoneToast === els) this._milestoneToast = null;
    });
  }

  /** Başarım açıldığında üstte kısa bir bildirim. */
  showAchievementToast(data) {
    if (this._achvToast) this._achvToast.forEach(e => e.destroy());
    const cx = CONFIG.CANVAS_WIDTH / 2, y = 56;
    const bg = this.add.rectangle(cx, y, 270, 40, 0x1a1a2e, 0.96).setDepth(250).setStrokeStyle(2, CONFIG.COLORS.UI_GOLD);
    const title = this.add.text(cx, y - 8, `🏆 ${t(`achievement.${data.id}.name`)}`, this.textStyle(12, '#ffd700')).setOrigin(0.5).setDepth(251);
    const desc = this.add.text(cx, y + 8, t(`achievement.${data.id}.desc`), this.textStyle(9, '#cccccc')).setOrigin(0.5).setDepth(251);
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

  /**
   * Küçük bir butona, görselini değiştirmeden genişletilmiş (parmak dostu)
   * dokunma alanı verir. hitW/hitH, objenin görsel boyutundan büyük olmalı.
   */
  enlargeHit(obj, hitW, hitH) {
    const w = obj.width, h = obj.height;
    const hit = new Phaser.Geom.Rectangle((w - hitW) / 2, (h - hitH) / 2, hitW, hitH);
    obj.setInteractive(hit, Phaser.Geom.Rectangle.Contains, { useHandCursor: true });
    return obj;
  }

  // ═══════ SEKMELER ═══════
  createTabs() {
    const tabNames = { laser: t('ui.tab.laser'), archer: t('ui.tab.archer'), cannon: t('ui.tab.cannon'), frost: t('ui.tab.frost'), catapult: t('ui.tab.catapult'), economy: t('ui.tab.economy') };
    const tabWidth = 78, tabHeight = 22, startX = 10, tabY = this.panelY + 5;

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

    // Conquest kilidi (Cannon / Frost / Catapult)
    if (info.conquestLocked) {
      const nodeName = t(`ui.nodeHint.${this.activeTab}`) || t('ui.nodeHint.default');
      const lockText = this.add.text(CONFIG.CANVAS_WIDTH / 2, startY + 30,
        t('ui.conquestLock', { node: nodeName }),
        this.textStyle(12, '#888888')
      ).setOrigin(0.5).setDepth(102);
      this.upgradeElements.push(lockText);
      return;
    }

    // Kilitli defender
    if (!info.unlocked) {
      const lockText = this.add.text(CONFIG.CANVAS_WIDTH / 2, startY + 25,
        t('ui.hireFirst', { name: t(`defender.${this.activeTab}`), cost: formatNumber(info.hireCost) }),
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
      const lbl = this.add.text(x, y, `${stat.label} ${t('ui.level', { n: stat.level })}`, this.textStyle(10, '#cccccc')).setDepth(102);
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
      const costLabel = this.add.text(btnX, btnY, t('ui.costExp', { n: formatNumber(stat.cost) }), this.textStyle(10, stat.canAfford ? '#ffd700' : '#666666')).setOrigin(0.5).setDepth(103);

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

      const lbl = this.add.text(x, y, `${t(`economy.${key}`)} ${t('ui.level', { n: level })}`, this.textStyle(10, '#cccccc')).setDepth(102);
      const valText = this.add.text(x, y + 14, `${curMult.toFixed(2)}x → ${nextMult.toFixed(2)}x`, this.textStyle(9, '#888888')).setDepth(102);

      const btnX = x + btnWidth / 2, btnY = y + 38;
      const color = canAfford ? CONFIG.COLORS.UI_BUTTON : CONFIG.COLORS.UI_BUTTON_DISABLED;
      const bg = this.add.rectangle(btnX, btnY, btnWidth, 22, color, 1).setDepth(102).setInteractive({ useHandCursor: true });
      const costLabel = this.add.text(btnX, btnY, t('ui.costExp', { n: formatNumber(cost) }), this.textStyle(10, canAfford ? '#ffd700' : '#666666')).setOrigin(0.5).setDepth(103);

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
      ? t('ui.hirePlus', { cost: formatNumber(info.hireCost) })
      : t('ui.unlock', { cost: formatNumber(info.hireCost) });
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
    const title = this.add.text(cx, cy - 70, t('ui.prestigeTitle'), {
      fontSize: '20px', fontFamily: 'monospace', color: '#9b59b6',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(301);

    const currentMult = PrestigeManager.getCurrentMultiplier();
    const nextMult = PrestigeManager.getNextMultiplier();

    const info = this.add.text(cx, cy - 30, [
      t('ui.prestigeCurrent', { n: currentMult.toFixed(1) }),
      t('ui.prestigeAfter', { n: nextMult.toFixed(1) }),
      '',
      t('ui.prestigeResetWarn'),
      t('ui.prestigePermanent'),
    ].join('\n'), {
      fontSize: '11px', fontFamily: 'monospace', color: '#cccccc',
      stroke: '#000', strokeThickness: 1, align: 'center',
    }).setOrigin(0.5).setDepth(301);

    // Onayla butonu
    const confirmBtn = this.add.rectangle(cx - 60, cy + 65, 100, 28, 0x9b59b6).setDepth(302).setInteractive({ useHandCursor: true });
    const confirmLbl = this.add.text(cx - 60, cy + 65, t('ui.confirm'), this.textStyle(11, '#ffffff')).setOrigin(0.5).setDepth(303);
    confirmBtn.on('pointerdown', () => {
      this.closePrestigeDialog();
      this.doPrestige();
    });
    confirmBtn.on('pointerover', () => confirmBtn.setFillStyle(0xb07cc8));
    confirmBtn.on('pointerout', () => confirmBtn.setFillStyle(0x9b59b6));

    // İptal butonu
    const cancelBtn = this.add.rectangle(cx + 60, cy + 65, 100, 28, 0x444466).setDepth(302).setInteractive({ useHandCursor: true });
    const cancelLbl = this.add.text(cx + 60, cy + 65, t('ui.cancel'), this.textStyle(11, '#ffffff')).setOrigin(0.5).setDepth(303);
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
    this.expText.setText(`⚡ ${t('ui.exp', { n: formatNumber(GameState.resources.exp) })}`);
    this.foodText.setText(`🍖 ${t('ui.food', { n: formatNumber(GameState.resources.food) })}`);
    this.waveText.setText(t('ui.wave', { n: GameState.wave.current }));
    this.enemyText.setText(t('ui.enemies', { killed: GameState.wave.enemiesKilled, total: GameState.wave.enemiesInWave }));

    // Wave progress bar
    const waveProgress = GameState.wave.enemiesInWave > 0
      ? GameState.wave.enemiesKilled / GameState.wave.enemiesInWave : 0;
    this.waveProgressFill.width = CONFIG.CANVAS_WIDTH * Math.min(1, waveProgress);
    if (GameState.prestige.count > 0) {
      this.prestigeText.setText(`✦${GameState.prestige.multiplier.toFixed(1)}x`);
    } else {
      this.prestigeText.setText('');
    }
    this.fpsText.setText(t('ui.fps', { n: Math.round(this.game.loop.actualFps) }));

    // Combo göstergesi — 2+ combo'da görünür, pencere azaldıkça soluklaşır
    const combo = ComboManager.getCombo();
    if (combo >= 2) {
      const mult = ComboManager.getMultiplier();
      this.comboText.setText(t('ui.combo', { n: combo, pct: Math.round((mult - 1) * 100) }));
      this.comboText.setAlpha(0.35 + 0.65 * ComboManager.getTimerFraction());
    } else {
      this.comboText.setAlpha(0);
    }

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
