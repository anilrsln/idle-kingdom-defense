import AssetProvider from '../systems/AssetProvider.js';

/**
 * BootScene — Asset manifestinden texture'ları hazırlar, ardından Ana Menü.
 * Otomatik load/start YOK: her açılışta/yenilemede MenuScene gelir,
 * oyuncu Devam Et (kayıtlı) veya Yeni Oyun seçer.
 *
 * Görsel kaynak tanımları CONFIG.ASSETS'te; üretim/yükleme AssetProvider'da.
 */
export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    AssetProvider.preload(this);        // sprite tabanlı asset'ler (varsa)
    AssetProvider.createTextures(this); // geometrik placeholder'lar (manifest)
  }

  create() {
    this.scene.start('MenuScene', { mode: 'start' });
  }
}
