import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import ConquestScene from './scenes/ConquestScene.js';
import SoundManager from './systems/SoundManager.js';

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
  render: { pixelArt: false, antialias: true },
};

const game = new Phaser.Game(config);

// Ses sistemi — global 'sfx' kanalına abone olur, ilk etkileşimde başlar.
SoundManager.init(game);

export default game;
