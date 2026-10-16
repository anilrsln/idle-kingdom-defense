import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import ConquestScene from './scenes/ConquestScene.js';
import SoundManager from './systems/SoundManager.js';
import DevPanel from './systems/DevPanel.js';
import AchievementManager from './systems/AchievementManager.js';
import { onLocaleChange } from './i18n/index.js';

/**
 * main.js — Oyun giriş noktası.
 * Phaser.Game yapılandırması ve başlatma.
 */
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, UIScene, ConquestScene, MenuScene],
  physics: { default: 'arcade', arcade: { debug: false } },
  render: { pixelArt: true, antialias: false },
};

const game = new Phaser.Game(config);

// Ses sistemi — global 'sfx' kanalına abone olur, ilk etkileşimde başlar.
SoundManager.init(game);

// Dev tuning paneli — yalnızca ?dev modunda görünür.
DevPanel.init(game);

// Başarım sistemi
AchievementManager.init(game);

/**
 * Dil değişince aktif tüm sahneleri yeniden başlat ki metinler yeni dilde
 * çizilsin. GameState ayrı tutulduğu için oyun ilerlemesi korunur.
 * MenuScene gibi 'data' ile başlatılan sahnelerde mevcut data yeniden verilir.
 */
onLocaleChange(() => {
  // GameScene'i YENİDEN BAŞLATMA — create() WaveManager'ı ve combo'yu sıfırlar,
  // bu da dalga ilerlemesini kaybettirir. Onun kalıcı metinleri UIScene'de;
  // geçici floating text'ler bir sonraki olayda zaten yeni dilde gelir.
  // Sadece arayüz sahnelerini yeniden çiz.
  const UI_SCENES = ['UIScene', 'ConquestScene', 'MenuScene'];
  UI_SCENES.forEach((key) => {
    const sc = game.scene.getScene(key);
    if (sc && game.scene.isActive(key)) {
      const data = sc.scene.settings.data;
      game.scene.stop(key);
      game.scene.start(key, data);
    }
  });
});

export default game;
