import { CONFIG } from '../config.js';
import GameState, { resetAll } from '../state/GameState.js';
import SaveManager from '../systems/SaveManager.js';
import IdleManager from '../systems/IdleManager.js';
import SoundManager from '../systems/SoundManager.js';
import AchievementManager from '../systems/AchievementManager.js';
import { t } from '../i18n/index.js';

/**
 * MenuScene — Ana Menü (açılış) + Ayarlar/Pause (oyun içi).
 *
 * İki mod:
 *  - 'start' : Açılışta/F5 sonrası gelir. Devam Et (kayıtlı) / Yeni Oyun.
 *  - 'pause' : Oyun içinde ⚙️ ile açılır, GameScene duraklatılmıştır.
 *              Devam Et / Kaydet / Yükle / Yeni Oyun.
 *
 * Her iki modda da Efekt Sesi aç/kapa burada.
 */
export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  init(data) {
    this.mode = (data && data.mode) || 'start';
  }

  create() {
    this.scene.bringToTop();
    const W = CONFIG.CANVAS_WIDTH, H = CONFIG.CANVAS_HEIGHT;
    this.cx = W / 2;
    this.dialog = null;
    this.toast = null;

    // Tam ekran arka plan (altındaki sahneye tıklamayı engeller)
    const bgAlpha = this.mode === 'start' ? 1 : 0.9;
    this.add.rectangle(this.cx, H / 2, W, H, 0x0a0a1a, bgAlpha)
      .setDepth(400).setInteractive();

    // Başlık
    this.add.text(this.cx, 64, t('menu.titleGame'), {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(401);

    this.add.text(this.cx, 92, this.mode === 'start' ? t('menu.subtitleStart') : t('menu.subtitlePause'), {
      fontSize: '12px', fontFamily: 'monospace', color: '#9b59b6',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(401);

    this.hasSave = SaveManager.hasSave();
    this.buildButtons();
  }

  /** Moda göre buton listesini oluşturur ve dikey olarak yerleştirir. */
  buildButtons() {
    const specs = [];

    if (this.mode === 'start') {
      specs.push({
        label: this.hasSave ? t('menu.continueSaved') : t('menu.noSave'),
        color: this.hasSave ? 0x1a6a1a : CONFIG.COLORS.UI_BUTTON_DISABLED,
        onClick: this.hasSave ? () => this.continueGame() : null,
      });
      specs.push({ label: t('menu.newGame'), color: CONFIG.COLORS.UI_BUTTON, onClick: () => this.newGame() });
    } else {
      specs.push({ label: t('menu.resume'), color: 0x1a6a1a, onClick: () => this.resumeGame() });
      specs.push({ label: t('menu.save'), color: CONFIG.COLORS.UI_BUTTON, onClick: () => this.saveGame() });
      specs.push({
        label: t('menu.load'),
        color: this.hasSave ? CONFIG.COLORS.UI_BUTTON : CONFIG.COLORS.UI_BUTTON_DISABLED,
        onClick: this.hasSave ? () => this.loadGame() : null,
      });
      specs.push({ label: t('menu.newGame'), color: CONFIG.COLORS.UI_BUTTON, onClick: () => this.newGame() });
    }

    // Başarımlar (her iki modda)
    specs.push({
      label: t('menu.achievements', { unlocked: AchievementManager.unlockedCount(), total: AchievementManager.total() }),
      color: CONFIG.COLORS.UI_BUTTON, onClick: () => this.openAchievements(),
    });

    // Ses toggle (her iki modda)
    specs.push({ label: this.soundLabel(), color: 0x2a2a4a, onClick: () => this.toggleSound(), isSound: true });

    const btnW = 300, btnH = 40, gap = 12;
    const totalH = specs.length * btnH + (specs.length - 1) * gap;
    let y = 150 + (CONFIG.CANVAS_HEIGHT - 150 - 40 - totalH) / 2 + btnH / 2;

    for (const spec of specs) {
      const btn = this.makeButton(this.cx, y, btnW, btnH, spec.label, spec.color, spec.onClick);
      if (spec.isSound) this.soundButton = btn;
      y += btnH + gap;
    }
  }

  /** Standart menü butonu. onClick null ise devre dışı görünür. */
  makeButton(x, y, w, h, label, color, onClick) {
    const enabled = !!onClick;
    const bg = this.add.rectangle(x, y, w, h, color, 1).setDepth(402)
      .setStrokeStyle(1, 0x555577);
    const txt = this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: 'monospace',
      color: enabled ? '#ffffff' : '#777777',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(403);

    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
      const base = color;
      bg.on('pointerover', () => bg.setFillStyle(this.lighten(base)));
      bg.on('pointerout', () => bg.setFillStyle(base));
      bg.on('pointerdown', () => { this.tweens.add({ targets: bg, alpha: 0.6, duration: 70, yoyo: true }); onClick(); });
    }
    return { bg, txt, color };
  }

  lighten(color) {
    const r = Math.min(255, ((color >> 16) & 0xff) + 30);
    const g = Math.min(255, ((color >> 8) & 0xff) + 30);
    const b = Math.min(255, (color & 0xff) + 30);
    return (r << 16) | (g << 8) | b;
  }

  // ═══════════════ Aksiyonlar ═══════════════

  /** Kayıtlı oyunu yükleyip başlat (açılış modu). */
  continueGame() {
    const saved = SaveManager.load();
    if (!saved) { this.showToast(t('menu.toastNoSave')); return; }
    SaveManager.applyLoad(saved);

    // Offline/idle kazancı — GameScene popup olarak gösterir
    const earnings = IdleManager.calculateIdleEarnings();
    if (earnings && (earnings.exp > 0 || earnings.food > 0)) {
      this.registry.set('idleEarnings', earnings);
    }
    this.startGame();
  }

  /** Yeni oyun — kayıt varsa onay iste, sonra sıfırla ve başlat. */
  newGame() {
    const start = () => {
      resetAll(GameState);
      SaveManager.deleteSave();
      this.registry.remove('idleEarnings');
      this.startGame();
    };
    if (this.hasSave) {
      this.showConfirm(t('menu.confirmNewGame'), start);
    } else {
      start();
    }
  }

  /** Oyunu (yeniden) başlat — GameScene'i taze kurar, UIScene'i o başlatır. */
  startGame() {
    this.scene.stop('UIScene');
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
    this.scene.stop('MenuScene');
  }

  /** Pause modundan oyuna dön. */
  resumeGame() {
    this.scene.resume('GameScene');
    this.scene.resume('UIScene');
    this.scene.stop('MenuScene');
  }

  /** Anlık kaydet (pause modu). */
  saveGame() {
    const ok = SaveManager.save();
    this.hasSave = ok || this.hasSave;
    this.showToast(ok ? t('menu.toastSaveOk') : t('menu.toastSaveFail'));
  }

  /** Son kayda dön (pause modu) — mevcut ilerlemeyi son kayıtla değiştirir. */
  loadGame() {
    const saved = SaveManager.load();
    if (!saved) { this.showToast(t('menu.toastNoSave')); return; }
    this.showConfirm(t('menu.confirmLoad'), () => {
      SaveManager.applyLoad(saved);
      this.startGame();
    });
  }

  /** Efekt sesini aç/kapat. */
  toggleSound() {
    SoundManager.toggle();
    if (this.soundButton) this.soundButton.txt.setText(this.soundLabel());
  }

  soundLabel() {
    return SoundManager.isEnabled() ? t('menu.soundOn') : t('menu.soundOff');
  }

  // ═══════════════ Onay / Toast ═══════════════

  _ts(size, color) {
    return { fontSize: `${size}px`, fontFamily: 'monospace', color, stroke: '#000', strokeThickness: 1 };
  }

  /** Başarım listesi paneli. */
  openAchievements() {
    if (this.achvPanel) return;
    const cx = this.cx, cy = CONFIG.CANVAS_HEIGHT / 2;
    const w = 420, h = 448;
    const top = cy - h / 2;

    const bg = this.add.rectangle(cx, cy, w, h, 0x0a0a1a, 0.98).setDepth(430).setStrokeStyle(2, CONFIG.COLORS.UI_GOLD);
    const title = this.add.text(cx, top + 20,
      t('menu.achievements', { unlocked: AchievementManager.unlockedCount(), total: AchievementManager.total() }),
      this._ts(14, '#ffd700')).setOrigin(0.5).setDepth(431);
    const els = [bg, title];

    let ly = top + 50;
    for (const a of AchievementManager.getAll()) {
      const icon = a.unlocked ? t('menu.achUnlocked') : t('menu.achLocked');
      const color = a.unlocked ? '#66ff99' : '#777777';
      const line = this.add.text(cx - w / 2 + 16, ly, `${icon} ${t(`achievement.${a.id}.name`)} — ${t(`achievement.${a.id}.desc`)}`, this._ts(11, color))
        .setOrigin(0, 0.5).setDepth(431);
      els.push(line);
      ly += 26;
    }

    const closeBg = this.add.rectangle(cx, cy + h / 2 - 22, 120, 30, 0x444466).setDepth(431).setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(cx, cy + h / 2 - 22, t('menu.close'), this._ts(12, '#ffffff')).setOrigin(0.5).setDepth(432);
    els.push(closeBg, closeTxt);
    const close = () => { els.forEach(e => e.destroy()); this.achvPanel = null; };
    closeBg.on('pointerdown', close);
    closeBg.on('pointerover', () => closeBg.setFillStyle(0x555577));
    closeBg.on('pointerout', () => closeBg.setFillStyle(0x444466));

    this.achvPanel = { close };
  }

  showConfirm(message, onYes) {
    if (this.dialog) return;
    const cx = this.cx, cy = CONFIG.CANVAS_HEIGHT / 2;
    const bg = this.add.rectangle(cx, cy, 340, 170, 0x12122a, 0.98).setDepth(410).setStrokeStyle(2, 0xe94560);
    const msg = this.add.text(cx, cy - 35, message, {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 1, align: 'center',
    }).setOrigin(0.5).setDepth(411);

    const yesBg = this.add.rectangle(cx - 70, cy + 40, 110, 32, 0xe94560).setDepth(411).setInteractive({ useHandCursor: true });
    const yesTxt = this.add.text(cx - 70, cy + 40, t('menu.yes'), { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setDepth(412);
    const noBg = this.add.rectangle(cx + 70, cy + 40, 110, 32, 0x444466).setDepth(411).setInteractive({ useHandCursor: true });
    const noTxt = this.add.text(cx + 70, cy + 40, t('menu.no'), { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setDepth(412);

    const close = () => { [bg, msg, yesBg, yesTxt, noBg, noTxt].forEach(e => e.destroy()); this.dialog = null; };
    yesBg.on('pointerdown', () => { close(); onYes(); });
    yesBg.on('pointerover', () => yesBg.setFillStyle(0xff6680));
    yesBg.on('pointerout', () => yesBg.setFillStyle(0xe94560));
    noBg.on('pointerdown', close);
    noBg.on('pointerover', () => noBg.setFillStyle(0x555577));
    noBg.on('pointerout', () => noBg.setFillStyle(0x444466));

    this.dialog = { close };
  }

  showToast(text) {
    if (this.toast) this.toast.destroy();
    this.toast = this.add.text(this.cx, CONFIG.CANVAS_HEIGHT - 40, text, {
      fontSize: '13px', fontFamily: 'monospace', color: '#66ff66',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(420).setAlpha(1);
    this.tweens.add({ targets: this.toast, alpha: 0, y: CONFIG.CANVAS_HEIGHT - 55, duration: 1400, ease: 'Power1', onComplete: () => { this.toast?.destroy(); this.toast = null; } });
  }
}
