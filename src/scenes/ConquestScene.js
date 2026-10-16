import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';
import ConquestManager from '../systems/ConquestManager.js';
import { formatNumber } from '../utils/NumberFormatter.js';
import { t } from '../i18n/index.js';

/**
 * ConquestScene — Skill tree / Fetih Haritası.
 * Scroll destekli: tüm 18 node görünür.
 */
export default class ConquestScene extends Phaser.Scene {
  constructor() { super({ key: 'ConquestScene' }); }

  create() {
    const W = 800, H = 500;
    const HEADER_H = 50;
    const AREA_H = H - HEADER_H;   // 450px scroll alanı
    this.CONTENT_H = 760;          // en alttaki node y=680 + 80 margin
    this.scrollY = 0;

    // ── Arka plan (tüm sahne, scroll dışı) ──
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a1a, 0.97).setDepth(200).setInteractive();

    // ── Başlık (sabit) ──
    this.add.text(W / 2, 25, t('conquestMap.title'), {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(210);

    this.expLabel  = this.add.text(14, 12, '', this.ts(11, '#ffd700')).setDepth(210);
    this.foodLabel = this.add.text(14, 28, '', this.ts(11, '#66ff66')).setDepth(210);

    // Kapat butonu
    const cb = this.add.rectangle(770, 25, 56, 26, 0xe94560).setDepth(210).setInteractive({ useHandCursor: true });
    this.add.text(770, 25, t('conquestMap.close'), this.ts(11, '#fff')).setOrigin(0.5).setDepth(211);
    cb.on('pointerdown', () => this.closeMap());
    cb.on('pointerover',  () => cb.setFillStyle(0xff6680));
    cb.on('pointerout',   () => cb.setFillStyle(0xe94560));

    // Scroll ipucu
    this.scrollHint = this.add.text(W / 2, H - 8, t('conquestMap.scrollHint'), this.ts(9, '#556')).setOrigin(0.5).setDepth(210);

    // ── Scroll container (tüm node içeriği buraya) ──
    // Başlangıç y = HEADER_H (başlığın hemen altı)
    this.sc = this.add.container(0, HEADER_H).setDepth(201);

    // Mask: sadece HEADER_H ile H arasını göster
    const mg = this.make.graphics({ add: false });
    mg.fillRect(0, HEADER_H, W, AREA_H);
    this.sc.setMask(mg.createGeometryMask());

    // ── İçerik ──
    this.nodeElements = [];
    this.drawConnections();
    this.createNodes();

    // ── Scroll input ──
    this.input.on('wheel', (_p, _o, _dx, dy) => this.scroll(dy * 0.6));

    // Drag (arka plan üzerinde)
    this.input.on('pointermove', (p) => {
      if (p.isDown) this.scroll(-p.velocity.y * 0.12);
    });
  }

  scroll(delta) {
    const maxS = Math.max(0, this.CONTENT_H - (500 - 50));
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, maxS);
    this.sc.y = 50 - this.scrollY;
    if (this.scrollHint) this.scrollHint.setVisible(this.scrollY < maxS - 4);
  }

  ts(size, color) {
    return { fontSize: `${size}px`, fontFamily: 'monospace', color, stroke: '#000000', strokeThickness: 1 };
  }

  // ── Bağlantı çizgileri (container'ın en altında) ──
  drawConnections() {
    if (this.connGfx) this.connGfx.destroy();
    this.connGfx = this.add.graphics().setDepth(0); // container-local depth 0 = en altta
    this.sc.addAt(this.connGfx, 0);

    for (const node of Object.values(CONFIG.CONQUEST_NODES)) {
      for (const reqId of node.requires) {
        const req = CONFIG.CONQUEST_NODES[reqId];
        if (!req) continue;
        const bothUnlocked = ConquestManager.isUnlocked(node.id) && ConquestManager.isUnlocked(reqId);
        this.connGfx.lineStyle(2, bothUnlocked ? 0x00cc44 : 0x334466, bothUnlocked ? 0.9 : 0.5);
        this.connGfx.lineBetween(req.x, req.y, node.x, node.y);
      }
    }
  }

  // ── Node'lar (container'a doğrudan ekle) ──
  createNodes() {
    this.nodeElements.forEach(el => { el.forEach(o => o.destroy()); });
    this.nodeElements = [];

    for (const node of ConquestManager.getAllNodesInfo()) {
      const { x, y, id, unlocked, available, canPurchase, cost } = node;
      const name = t(`conquest.${id}.name`);

      let bgCol, txtCol;
      if (unlocked)         { bgCol = 0x1a5c1a; txtCol = '#00ff00'; }
      else if (canPurchase) { bgCol = 0x0d2e58; txtCol = '#ffd700'; }
      else if (available)   { bgCol = 0x242438; txtCol = '#9999bb'; }
      else                  { bgCol = 0x141426; txtCol = '#444455'; }

      const NW = 138, NH = 42;

      // Container'ın içinde oluştur: this.add ile DEĞİL, doğrudan Phaser objeleri yarat
      const bg = this.add.rectangle(x, y, NW, NH, bgCol).setDepth(2);
      if (unlocked)         bg.setStrokeStyle(2, 0x00ff00);
      else if (canPurchase) bg.setStrokeStyle(2, 0xffd700);
      else if (available)   bg.setStrokeStyle(1, 0x445566);

      const shortName = name.length > 17 ? name.substring(0, 16) + '…' : name;
      const lbl = this.add.text(x, y - 6, shortName, this.ts(10, txtCol)).setOrigin(0.5).setDepth(3);

      let costStr = unlocked ? t('conquestMap.unlocked') : '';
      if (!unlocked) {
        const parts = [];
        if (cost.exp)  parts.push(t('ui.exp', { n: formatNumber(cost.exp) }));
        if (cost.food) parts.push(t('ui.food', { n: formatNumber(cost.food) }));
        costStr = parts.join(' + ');
      }
      const sub = this.add.text(x, y + 9, costStr, this.ts(8, unlocked ? '#66ff88' : '#666688')).setOrigin(0.5).setDepth(3);

      bg.setInteractive({ useHandCursor: true });
      // Masaüstü: hover tooltip gösterir, tık satın alır.
      // Dokunmatik: ilk tap tooltip gösterir + node'u 'armed' yapar, ikinci tap satın alır.
      bg.on('pointerover', (p) => { if (!p || p.pointerType !== 'touch') this.showTip(node, x, y - NH / 2 - 18); });
      bg.on('pointerout',  (p) => { if (!p || p.pointerType !== 'touch') this.hideTip(); });
      bg.on('pointerdown', (p) => { this._downNode = node.id; this._downX = p.x; this._downY = p.y; });
      bg.on('pointerup',   (p) => this.onNodePointerUp(node, p, x, y - NH / 2 - 18));

      this.sc.add([bg, lbl, sub]);
      this.nodeElements.push([bg, lbl, sub]);
    }
  }

  // pointerup: tap mı yoksa scroll/drag mı olduğunu ayırt eder.
  onNodePointerUp(node, p, tipX, tipY) {
    // Aynı node üzerinde basılıp bırakılmadıysa (başka yere kaydırıldı) yok say.
    if (this._downNode !== node.id) return;
    this._downNode = null;

    // Parmak kaydıysa (drag/scroll) satın alma — sadece gerçek tap kabul et.
    const moved = Math.abs(p.x - this._downX) + Math.abs(p.y - this._downY);
    if (moved > 12) return;

    const isTouch = p && p.pointerType === 'touch';
    if (isTouch) {
      // İlk tap: tooltip göster + bu node'u 'armed' yap. İkinci tap (aynı node): satın al.
      if (this._armedNode !== node.id) {
        this._armedNode = node.id;
        this.showTip(node, tipX, tipY);
        return;
      }
      // İkinci tap aynı node'da → satın almaya düş.
    }
    this.purchaseNode(node);
  }

  purchaseNode(node) {
    this._armedNode = null;
    if (ConquestManager.purchase(node.id)) {
      this.game.events.emit('sfx', 'hire');
      this.drawConnections();
      this.createNodes();
      this.hideTip();
    } else {
      this.game.events.emit('sfx', 'uiDenied');
    }
  }

  showTip(node, x, y) {
    this.hideTip();
    const desc = t(`conquest.${node.id}.description`) || '';
    const tb = this.add.rectangle(x, y, 200, 28, 0x000000, 0.92).setDepth(10);
    const tt = this.add.text(x, y, desc, this.ts(9, '#eeeeff')).setOrigin(0.5).setDepth(11);
    this.sc.add([tb, tt]);
    this._tip = [tb, tt];
  }

  hideTip() {
    if (this._tip) { this._tip.forEach(o => o.destroy()); this._tip = null; }
  }

  closeMap() {
    this.scene.stop('ConquestScene');
    this.game.events.emit('conquest-closed');
  }

  update() {
    this.expLabel.setText(`⚡ ${t('ui.exp', { n: formatNumber(GameState.resources.exp) })}`);
    this.foodLabel.setText(`🍖 ${t('ui.food', { n: formatNumber(GameState.resources.food) })}`);
  }
}
