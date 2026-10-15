import { CONFIG } from '../config.js';
import GameState, { resetAll } from '../state/GameState.js';
import SaveManager from '../systems/SaveManager.js';
import IdleManager from '../systems/IdleManager.js';
import SoundManager from '../systems/SoundManager.js';
import AchievementManager from '../systems/AchievementManager.js';
import PerkManager from '../systems/PerkManager.js';

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
    this.add.text(this.cx, 64, 'IDLE KINGDOM DEFENSE', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(401);

    this.add.text(this.cx, 92, this.mode === 'start' ? '— Ana Menü —' : '— Duraklatıldı —', {
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
        label: this.hasSave ? '▶  Devam Et (Kayıtlı Oyun)' : '▶  Kayıt Bulunamadı',
        color: this.hasSave ? 0x1a6a1a : CONFIG.COLORS.UI_BUTTON_DISABLED,
        onClick: this.hasSave ? () => this.continueGame() : null,
      });
      specs.push({ label: '✦  Yeni Oyun', color: CONFIG.COLORS.UI_BUTTON, onClick: () => this.newGame() });
    } else {
      specs.push({ label: '▶  Devam Et', color: 0x1a6a1a, onClick: () => this.resumeGame() });
      specs.push({ label: '💾  Kaydet', color: CONFIG.COLORS.UI_BUTTON, onClick: () => this.saveGame() });
      specs.push({
        label: '📂  Yükle',
        color: this.hasSave ? CONFIG.COLORS.UI_BUTTON : CONFIG.COLORS.UI_BUTTON_DISABLED,
        onClick: this.hasSave ? () => this.loadGame() : null,
      });
      specs.push({ label: '✦  Yeni Oyun', color: CONFIG.COLORS.UI_BUTTON, onClick: () => this.newGame() });
    }

    // Başarımlar (her iki modda)
    specs.push({
      label: `🏆  Başarımlar (${AchievementManager.unlockedCount()}/${AchievementManager.total()})`,
      color: CONFIG.COLORS.UI_BUTTON, onClick: () => this.openAchievements(),
    });

    // Trophy Dükkânı — sadece oyun içi (pause); start'ta save henüz yüklü değil
    if (this.mode === 'pause') {
      specs.push({
        label: `✦  Trophy Dükkânı (${GameState.prestige.trophies} 🏆)`,
        color: 0x5a3a7a, onClick: () => this.openTrophyShop(),
      });
    }

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
    if (!saved) { this.showToast('Kayıt bulunamadı'); return; }
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
      this.showConfirm('Mevcut kaydın silinecek.\nYeni oyuna başlansın mı?', start);
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
    this.showToast(ok ? '✓ Kaydedildi' : '✗ Kayıt başarısız');
  }

  /** Son kayda dön (pause modu) — mevcut ilerlemeyi son kayıtla değiştirir. */
  loadGame() {
    const saved = SaveManager.load();
    if (!saved) { this.showToast('Kayıt bulunamadı'); return; }
    this.showConfirm('Son kayda dönülecek.\nMevcut ilerleme kaybolabilir. Devam?', () => {
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
    return `🔊  Efekt Sesi: ${SoundManager.isEnabled() ? 'Açık' : 'Kapalı'}`;
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
      `🏆 Başarımlar (${AchievementManager.unlockedCount()}/${AchievementManager.total()})`,
      this._ts(14, '#ffd700')).setOrigin(0.5).setDepth(431);
    const els = [bg, title];

    let ly = top + 50;
    for (const a of AchievementManager.getAll()) {
      const icon = a.unlocked ? '✓' : '🔒';
      const color = a.unlocked ? '#66ff99' : '#777777';
      const line = this.add.text(cx - w / 2 + 16, ly, `${icon} ${a.name} — ${a.desc}`, this._ts(11, color))
        .setOrigin(0, 0.5).setDepth(431);
      els.push(line);
      ly += 26;
    }

    const closeBg = this.add.rectangle(cx, cy + h / 2 - 22, 120, 30, 0x444466).setDepth(431).setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(cx, cy + h / 2 - 22, 'KAPAT', this._ts(12, '#ffffff')).setOrigin(0.5).setDepth(432);
    els.push(closeBg, closeTxt);
    const close = () => { els.forEach(e => e.destroy()); this.achvPanel = null; };
    closeBg.on('pointerdown', close);
    closeBg.on('pointerover', () => closeBg.setFillStyle(0x555577));
    closeBg.on('pointerout', () => closeBg.setFillStyle(0x444466));

    this.achvPanel = { close };
  }

  /** Prestige Trophy dükkânı — perk'leri Trophy ile satın al. */
  openTrophyShop() {
    if (this.trophyPanel) return;
    const cx = this.cx, cy = CONFIG.CANVAS_HEIGHT / 2;
    const w = 460, h = 420, top = cy - h / 2;
    this.trophyEls = [];

    const bg = this.add.rectangle(cx, cy, w, h, 0x0a0a1a, 0.98).setDepth(430).setStrokeStyle(2, 0x9b59b6);
    const title = this.add.text(cx, top + 18, '✦ Trophy Dükkânı', this._ts(14, '#b07cc8')).setOrigin(0.5).setDepth(431);
    const bal = this.add.text(cx, top + 38, `Bakiye: ${GameState.prestige.trophies} 🏆`, this._ts(12, '#ffd700')).setOrigin(0.5).setDepth(431);
    this.trophyEls.push(bg, title, bal);

    this._renderTrophyRows(top + 60, w);

    const closeBg = this.add.rectangle(cx, cy + h / 2 - 22, 120, 30, 0x444466).setDepth(431).setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(cx, cy + h / 2 - 22, 'KAPAT', this._ts(12, '#ffffff')).setOrigin(0.5).setDepth(432);
    this.trophyEls.push(closeBg, closeTxt);
    const close = () => { (this.trophyEls || []).forEach(e => e.destroy()); this.trophyEls = []; this.trophyPanel = null; };
    closeBg.on('pointerdown', close);
    closeBg.on('pointerover', () => closeBg.setFillStyle(0x555577));
    closeBg.on('pointerout', () => closeBg.setFillStyle(0x444466));

    this.trophyPanel = { close };
  }

  /** Perk satırlarını (yeniden) çizer. */
  _renderTrophyRows(startY, w) {
    // Eski satırları temizle (bg/title/bal/close hariç ilk 3 + son 2 korunur)
    if (this._trophyRows) this._trophyRows.forEach(e => e.destroy());
    this._trophyRows = [];
    const cx = this.cx;
    let ly = startY;

    for (const p of PerkManager.getAll()) {
      const nameTxt = this.add.text(cx - w / 2 + 16, ly, `${p.name}  Lv.${p.level}/${p.maxLevel}`, this._ts(11, '#ffffff')).setOrigin(0, 0.5).setDepth(431);
      const descTxt = this.add.text(cx - w / 2 + 16, ly + 15, p.desc, this._ts(9, '#999999')).setOrigin(0, 0.5).setDepth(431);
      this._trophyRows.push(nameTxt, descTxt);

      const bx = cx + w / 2 - 70;
      if (p.maxed) {
        const maxTxt = this.add.text(bx, ly + 6, 'MAX', this._ts(11, '#66ff99')).setOrigin(0.5).setDepth(431);
        this._trophyRows.push(maxTxt);
      } else {
        const color = p.canAfford ? 0x5a3a7a : CONFIG.COLORS.UI_BUTTON_DISABLED;
        const btn = this.add.rectangle(bx, ly + 6, 110, 26, color).setDepth(431).setInteractive({ useHandCursor: true });
        const btnTxt = this.add.text(bx, ly + 6, `${p.cost} 🏆`, this._ts(11, p.canAfford ? '#ffd700' : '#666666')).setOrigin(0.5).setDepth(432);
        btn.on('pointerdown', () => {
          if (PerkManager.purchase(p.key)) {
            this._refreshTrophyShop(startY, w);
          }
        });
        btn.on('pointerover', () => { if (p.canAfford) btn.setFillStyle(0x7a5a9a); });
        btn.on('pointerout', () => btn.setFillStyle(p.canAfford ? 0x5a3a7a : CONFIG.COLORS.UI_BUTTON_DISABLED));
        this._trophyRows.push(btn, btnTxt);
      }
      ly += 48;
    }
  }

  /** Satın alma sonrası bakiye + satırları tazeler. */
  _refreshTrophyShop(startY, w) {
    // bakiye metni trophyEls[2]
    if (this.trophyEls && this.trophyEls[2]) {
      this.trophyEls[2].setText(`Bakiye: ${GameState.prestige.trophies} 🏆`);
    }
    this._renderTrophyRows(startY, w);
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
    const yesTxt = this.add.text(cx - 70, cy + 40, 'EVET', { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setDepth(412);
    const noBg = this.add.rectangle(cx + 70, cy + 40, 110, 32, 0x444466).setDepth(411).setInteractive({ useHandCursor: true });
    const noTxt = this.add.text(cx + 70, cy + 40, 'VAZGEÇ', { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setDepth(412);

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
