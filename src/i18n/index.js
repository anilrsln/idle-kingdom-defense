import tr from './locales/tr.js';
import en from './locales/en.js';

/**
 * Basit, bağımlılıksız i18n katmanı.
 * - Anahtar tabanlı: t('ui.tab.laser'), t('enemy.skeleton')
 * - İç içe anahtarlar nokta ile çözülür.
 * - {param} yer tutucuları ikinci argümandaki değerlerle değiştirilir.
 * - Dil localStorage'da saklanır; değişince 'localechange' event'i yayılır.
 */

const DICTS = { tr, en };
const SUPPORTED = Object.keys(DICTS);
const STORAGE_KEY = 'ikd_locale';
const DEFAULT = 'tr';

const listeners = new Set();

function detectInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch (_) { /* localStorage erişilemezse sessiz geç */ }
  // Tarayıcı diline bak, yoksa varsayılan.
  try {
    const nav = (navigator.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(nav)) return nav;
  } catch (_) { /* ignore */ }
  return DEFAULT;
}

let current = detectInitial();

/** Nokta ile ayrılmış anahtarı iç içe nesnede çöz. */
function resolve(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

/**
 * Çeviri getir. Anahtar bulunamazsa önce DEFAULT dile, o da yoksa
 * anahtarın kendisine düşer (geliştirme sırasında eksikler görünür).
 */
export function t(key, params) {
  let str = resolve(DICTS[current], key);
  if (str == null) str = resolve(DICTS[DEFAULT], key);
  if (str == null) str = key;
  if (params && typeof str === 'string') {
    str = str.replace(/\{(\w+)\}/g, (m, p) => (params[p] != null ? params[p] : m));
  }
  return str;
}

export function getLocale() { return current; }

export function getSupportedLocales() { return [...SUPPORTED]; }

/** Dili değiştir; aynıysa no-op. Değişince dinleyicileri ve global event'i tetikler. */
export function setLocale(locale) {
  if (!SUPPORTED.includes(locale) || locale === current) return;
  current = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) { /* ignore */ }
  listeners.forEach((fn) => { try { fn(locale); } catch (_) { /* ignore */ } });
}

/** Sıradaki dile geç (TR ⇄ EN döngüsü). */
export function toggleLocale() {
  const i = SUPPORTED.indexOf(current);
  setLocale(SUPPORTED[(i + 1) % SUPPORTED.length]);
  return current;
}

/** Dil değişimine abone ol. Aboneliği iptal eden fonksiyon döner. */
export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export default { t, getLocale, setLocale, toggleLocale, onLocaleChange, getSupportedLocales };
