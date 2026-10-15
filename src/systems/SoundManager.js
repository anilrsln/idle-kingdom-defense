import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';

/**
 * SoundManager — Prosedürel ses efektleri (Web Audio API).
 *
 * Asset dosyası kullanmaz; her efekt CONFIG.SOUND.sfx'teki reçeteye göre
 * runtime'da sentezlenir (placeholder grafik felsefesinin ses karşılığı).
 *
 * Bağımlılık event üzerinden: global 'sfx' kanalına abone olur
 * (game.events.emit('sfx', '<name>')). Diğer manager/entity'ler
 * SoundManager'ı import etmek zorunda değildir.
 *
 * Tarayıcı autoplay politikası gereği AudioContext ilk kullanıcı
 * etkileşiminde (tıklama/tuş) başlatılır.
 */
const SoundManager = {
  _ctx: null,
  _masterGain: null,
  _game: null,
  _noiseBuffer: null,
  _sampleBuffers: {},   // yüklenmiş .wav/.mp3 decode buffer'ları
  _sampleLoading: {},   // yüklenmekte olanlar (çift fetch engeli)
  _lastPlayed: {},      // throttle takibi: { sfxName: timestampMs }
  _initialized: false,

  /**
   * Oyun başlangıcında bir kez çağrılır.
   * @param {Phaser.Game} game
   */
  init(game) {
    if (this._initialized) return;
    this._initialized = true;
    this._game = game;

    // Save'den gelen ayarları al (yoksa config varsayılanı)
    const s = GameState.settings;
    this.enabled = s.soundEnabled ?? CONFIG.SOUND.enabled;
    this.volume = s.masterVolume ?? CONFIG.SOUND.masterVolume;

    // Global sfx kanalı
    game.events.on('sfx', (name) => this.play(name));

    // AudioContext'i ilk kullanıcı etkileşiminde aç/devam ettir
    const resume = () => this._ensureContext();
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
    window.addEventListener('touchstart', resume);
  },

  /** AudioContext'i (yoksa) kurar ve suspended ise devam ettirir. */
  _ensureContext() {
    try {
      if (!this._ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null; // Web Audio desteklenmiyor — sessiz degrade
        this._ctx = new Ctx();
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = this.volume;
        this._masterGain.connect(this._ctx.destination);
      }
      if (this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    } catch (e) {
      console.warn('AudioContext init failed:', e);
      return null;
    }
  },

  /** 0.5 sn'lik beyaz gürültü buffer'ı (bir kez üretilir, tekrar kullanılır). */
  _getNoiseBuffer() {
    if (this._noiseBuffer) return this._noiseBuffer;
    const ctx = this._ctx;
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuffer = buffer;
    return buffer;
  },

  /**
   * Bir SFX çal.
   * @param {string} name — CONFIG.SOUND.sfx içindeki anahtar
   */
  play(name) {
    if (!this.enabled) return;
    const recipe = CONFIG.SOUND.sfx[name];
    if (!recipe) return;

    const ctx = this._ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    // Throttle — çok sık çalan efektlerde (okçu ateşi vb.) spam engelle
    if (recipe.throttleMs) {
      const now = performance.now();
      const last = this._lastPlayed[name] || 0;
      if (now - last < recipe.throttleMs) return;
      this._lastPlayed[name] = now;
    }

    try {
      // Gerçek ses dosyası verilmişse onu çal; yoksa sentezle.
      if (recipe.sample) { this._playSample(name, recipe); return; }
      switch (recipe.engine) {
        case 'noise':    this._playNoise(recipe); break;
        case 'sequence': this._playSequence(recipe); break;
        case 'tone':
        default:         this._playTone(recipe); break;
      }
    } catch (e) {
      console.warn('SFX play failed:', name, e);
    }
  },

  /** Dosya tabanlı SFX — ilk çalışta yüklenip cache'lenir. */
  _playSample(name, recipe) {
    const buf = this._sampleBuffers[name];
    if (buf) { this._playBuffer(buf, recipe.gain); return; }
    if (this._sampleLoading[name]) return;
    this._sampleLoading[name] = true;
    fetch(recipe.sample)
      .then((r) => r.arrayBuffer())
      .then((ab) => this._ctx.decodeAudioData(ab))
      .then((decoded) => { this._sampleBuffers[name] = decoded; this._playBuffer(decoded, recipe.gain); })
      .catch((e) => console.warn('Sample load failed:', name, e))
      .finally(() => { this._sampleLoading[name] = false; });
  },

  _playBuffer(buffer, gainValue) {
    const src = this._ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this._ctx.createGain();
    gain.gain.value = gainValue ?? 1;
    src.connect(gain);
    gain.connect(this._masterGain);
    src.start();
  },

  /** Tek osilatör tonu, opsiyonel frekans süpürmesi + decay envelope. */
  _playTone(recipe, startAt) {
    const ctx = this._ctx;
    const t0 = startAt ?? ctx.currentTime;
    const dur = recipe.duration;

    const osc = ctx.createOscillator();
    osc.type = recipe.type || 'sine';
    osc.frequency.setValueAtTime(recipe.freq, t0);
    if (recipe.freqEnd && recipe.freqEnd !== recipe.freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, recipe.freqEnd), t0 + dur);
    }

    const gain = ctx.createGain();
    const peak = recipe.gain ?? 0.2;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);          // hızlı attack
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);          // decay

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  /** Lowpass'tan geçen gürültü patlaması (boom / cızırtı). */
  _playNoise(recipe) {
    const ctx = this._ctx;
    const t0 = ctx.currentTime;
    const dur = recipe.duration;

    const src = ctx.createBufferSource();
    src.buffer = this._getNoiseBuffer();

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(recipe.freq, t0);
    if (recipe.freqEnd && recipe.freqEnd !== recipe.freq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, recipe.freqEnd), t0 + dur);
    }

    const gain = ctx.createGain();
    const peak = recipe.gain ?? 0.3;
    gain.gain.setValueAtTime(peak, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  },

  /** Arka arkaya notalar — fanfar/çoklu ton (hire, wave, prestige). */
  _playSequence(recipe) {
    const ctx = this._ctx;
    let t = ctx.currentTime;
    for (const note of recipe.notes) {
      this._playTone({
        type: recipe.type || 'sine',
        freq: note.freq,
        freqEnd: note.freqEnd,
        duration: note.duration,
        gain: recipe.gain,
      }, t);
      t += note.duration;
    }
  },

  // ═══════════════ Ayarlar ═══════════════

  /** Sesi aç/kapat. @returns {boolean} yeni durum */
  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  },

  setEnabled(enabled) {
    this.enabled = enabled;
    GameState.settings.soundEnabled = enabled;
    if (enabled) this._ensureContext();
  },

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    GameState.settings.masterVolume = this.volume;
    if (this._masterGain) this._masterGain.gain.value = this.volume;
  },

  isEnabled() { return this.enabled; },
};

export default SoundManager;
