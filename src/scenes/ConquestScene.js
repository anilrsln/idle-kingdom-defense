import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';
import ConquestManager from '../systems/ConquestManager.js';
import { formatNumber } from '../utils/NumberFormatter.js';

/**
 * ConquestScene — Skill tree / Fetih Haritası.
 * Modal olarak açılır/kapanır. Node tabanlı ağaç yapısı.
 * Scroll destekli: tüm node'lar görünür.
 */
export default class ConquestScene extends Phaser.Scene {
  constructor() { super({ key: 'ConquestScene' }); }

  create() {
    // Scroll state
    this.scrollY = 0;
    this.SCROLL_AREA_TOP = 50;     // başlığın altı
    this.SCROLL_AREA_H = 440;      // kaydırılabilir alan yüksekliği
    this.CONTENT_H = 750;          // tüm içerik yüksekliği (en alttaki node ~680 + margin)

    // Koyu arka plan
    this.bg = this.add.rectangle(400, 250, 800, 500, 0x0a0a1a, 0.95).setDepth(200).setInteractive();

    // Başlık (sabit)
    this.add.text(400, 20, '⚔ CONQUEST MAP ⚔', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(205);

    // Kaynak göstergesi (sabit)
    this.expLabel = this.add.text(20, 20, '', this.textStyle(12, '#ffd700')).setDepth(205);
    this.foodLabel = this.add.text(20, 38, '', this.textStyle(12, '#66ff66')).setDepth(205);

    // Kapat butonu (sabit)
    const closeBtn = this.add.rectangle(760, 25, 60, 25, 0xe94560).setDepth(206).setInteractive({ useHandCursor: true });
    this.add.text(760, 25, 'CLOSE', this.textStyle(11, '#ffffff')).setOrigin(0.5).setDepth(207);
    closeBtn.on('pointerdown', () => this.closeMap());
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0xff6680));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0xe94560));

    // Scroll göstergesi
    this.scrollHint = this.add.text(400, 488, '▼ scroll ▼', this.textStyle(10, '#666688')).setOrigin(0.5).setDepth(205);

    // Kaydırılabilir container
    this.scrollContainer = this.add.container(0, this.SCROLL_AREA_TOP).setDepth(201);

    // Mask — sadece scroll area içini göster
    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillRect(0, this.SCROLL_AREA_TOP, 800, this.SCROLL_AREA_H);
    this.scrollContainer.setMask(maskShape.createGeometryMask());

    // Node'ları çiz
    this.nodeElements = [];
    this.connectionGraphics = this.add.graphics().setDepth(201);
    this.scrollContainer.add(this.connectionGraphics);
    this.drawConnections();
    this.createNodes();

    // Mouse wheel scroll
    this.input.on('wheel', (_ptr, _objs, _dx, dy) => {
      this.doScroll(dy * 0.5);
    });

    // Drag scroll
    this.bg.on('pointermove', (ptr) => {
      if (ptr.isDown) {
        this.doScroll(-ptr.velocity.y * 0.1);
      }
    });

    // Tooltip
    this.tooltip = null;
  }

  doScroll(delta) {
    const maxScroll = Math.max(0, this.CONTENT_H - this.SCROLL_AREA_H);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, maxScroll);
    this.scrollContainer.y = this.SCROLL_AREA_TOP - this.scrollY;

    // Scroll ipucunu güncelle
    if (this.scrollHint) {
      this.scrollHint.setVisible(this.scrollY < maxScroll - 5);
    }
  }

  textStyle(size, color) {
    return { fontSize: `${size}px`, fontFamily: 'monospace', color, stroke: '#000', strokeThickness: 1 };
  }

  // ═══════ BAĞLANTI ÇİZGİLERİ ═══════
  drawConnections() {
    this.connectionGraphics.clear();
    const nodes = CONFIG.CONQUEST_NODES;

    for (const node of Object.values(nodes)) {
      for (const reqId of node.requires) {
        const reqNode = nodes[reqId];
        if (!reqNode) continue;

        const unlocked = ConquestManager.isUnlocked(node.id) && ConquestManager.isUnlocked(reqId);
        const color = unlocked ? 0x00ff00 : 0x444466;
        const alpha = unlocked ? 0.8 : 0.4;

        this.connectionGraphics.lineStyle(2, color, alpha);
        this.connectionGraphics.beginPath();
        this.connectionGraphics.moveTo(reqNode.x, reqNode.y);
        this.connectionGraphics.lineTo(node.x, node.y);
        this.connectionGraphics.strokePath();
      }
    }
  }

  // ═══════ NODE'LAR ═══════
  createNodes() {
    // Eski elementleri temizle
    this.nodeElements.forEach(el => {
      el.bg.destroy();
      el.label.destroy();
      if (el.icon) el.icon.destroy();
    });
    this.nodeElements = [];

    const nodesInfo = ConquestManager.getAllNodesInfo();

    for (const node of nodesInfo) {
      const { x, y, name, unlocked, available, canPurchase } = node;

      // Renk belirleme
      let bgColor, textColor;
      if (unlocked) {
        bgColor = 0x1a6a1a; textColor = '#00ff00';
      } else if (canPurchase) {
        bgColor = 0x0f3460; textColor = '#ffd700';
      } else if (available) {
        bgColor = 0x2a2a4a; textColor = '#aaaaaa';
      } else {
        bgColor = 0x1a1a2a; textColor = '#555555';
      }

      const nodeW = 140, nodeH = 44;
      const bg = this.add.rectangle(x, y, nodeW, nodeH, bgColor).setDepth(202).setInteractive({ useHandCursor: true });

      // Border
      if (unlocked) {
        bg.setStrokeStyle(2, 0x00ff00);
      } else if (canPurchase) {
        bg.setStrokeStyle(2, 0xffd700);
      } else if (available) {
        bg.setStrokeStyle(1, 0x555577);
      }

      // İsim (kısa)
      const shortName = name.length > 16 ? name.substring(0, 15) + '…' : name;
      const label = this.add.text(x, y - 5, shortName, this.textStyle(10, textColor)).setOrigin(0.5).setDepth(203);

      // Maliyet veya ✓
      let costStr = '';
      if (unlocked) {
        costStr = '✓ Unlocked';
      } else {
        const parts = [];
        if (node.cost.exp) parts.push(`${formatNumber(node.cost.exp)} EXP`);
        if (node.cost.food) parts.push(`${formatNumber(node.cost.food)} Food`);
        costStr = parts.join(' + ');
      }
      const icon = this.add.text(x, y + 10, costStr, this.textStyle(8, unlocked ? '#88ff88' : '#888888')).setOrigin(0.5).setDepth(203);

      // Tıklama — scroll offset'i hesaba kat
      bg.on('pointerdown', (ptr) => {
        // pointer world y — container offset farkı hesapla
        this.onNodeClick(node);
      });
      bg.on('pointerover', () => this.showTooltip(node, x, y - nodeH / 2 - 10));
      bg.on('pointerout', () => this.hideTooltip());

      this.scrollContainer.add(bg);
      this.scrollContainer.add(label);
      this.scrollContainer.add(icon);

      this.nodeElements.push({ bg, label, icon });
    }
  }

  onNodeClick(node) {
    if (ConquestManager.purchase(node.id)) {
      this.game.events.emit('sfx', 'hire');
      this.drawConnections();
      this.createNodes();
      this.hideTooltip();

      // Flash efekti
      const flash = this.add.rectangle(node.x, node.y, 160, 50, 0xffffff, 0.5).setDepth(210);
      this.scrollContainer.add(flash);
      this.tweens.add({
        targets: flash, alpha: 0, duration: 300,
        onComplete: () => flash.destroy(),
      });
    } else {
      this.game.events.emit('sfx', 'uiDenied');
    }
  }

  showTooltip(node, x, y) {
    this.hideTooltip();
    const desc = node.description || '';
    // tooltip'i container içinde göster (scroll offset ile birlikte hareket eder)
    const tipBg = this.add.rectangle(x, y - 10, 180, 30, 0x000000, 0.9).setDepth(210);
    const tipText = this.add.text(x, y - 10, desc, this.textStyle(10, '#ffffff')).setOrigin(0.5).setDepth(211);
    this.scrollContainer.add(tipBg);
    this.scrollContainer.add(tipText);
    this.tooltip = { bg: tipBg, text: tipText };
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.bg.destroy();
      this.tooltip.text.destroy();
      this.tooltip = null;
    }
  }

  closeMap() {
    this.scene.stop('ConquestScene');
    this.game.events.emit('conquest-closed');
  }

  update() {
    this.expLabel.setText(`⚡ ${formatNumber(GameState.resources.exp)} EXP`);
    this.foodLabel.setText(`🍖 ${formatNumber(GameState.resources.food)} Food`);
  }
}
