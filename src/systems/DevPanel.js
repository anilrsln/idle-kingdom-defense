import { CONFIG } from '../config.js';
import GameState from '../state/GameState.js';

/**
 * DevPanel — Yalnızca test amaçlı runtime ayar paneli (HTML/DOM overlay).
 *
 * Sadece URL'de ?dev varsa görünür. Canvas üstünde bir <div>; native
 * input'larla CONFIG değerlerini canlı değiştirir. Değişiklikler ayrı bir
 * localStorage anahtarında saklanır (oyuncu kaydına dokunmaz), Reset ile
 * varsayılana döner, Export ile config.js'e yapıştırılacak JSON üretir.
 *
 * Yeni ayar eklemek = aşağıdaki GROUPS şemasına tek satır.
 */
const STORAGE_KEY = 'idle-kingdom-defense-devtune';

const GROUPS = [
  {
    title: 'Pace',
    params: [
      { path: 'WAVES.timeBetweenSpawns', label: 'Spawn aralığı (ms)', min: 100, max: 3000, step: 50 },
      { path: 'WAVES.baseEnemiesPerWave', label: 'Wave başına düşman', min: 1, max: 50, step: 1 },
      { path: 'WAVES.enemiesPerWaveGrowth', label: 'Düşman artışı / wave', min: 0, max: 3, step: 0.1 },
      { path: 'WAVES.timeBetweenWaves', label: 'Wave arası (ms)', min: 0, max: 5000, step: 100 },
      { path: 'WAVES.hpScaling', label: 'HP ölçekleme', min: 1, max: 1.3, step: 0.01 },
      { path: 'WAVES.expScaling', label: 'EXP ölçekleme', min: 1, max: 1.3, step: 0.01 },
    ],
  },
  {
    title: 'Ekonomi',
    params: [
      { path: 'UPGRADE_COST_MULTIPLIER', label: 'Upgrade maliyet çarpanı', min: 1, max: 1.5, step: 0.01 },
      { path: 'DEFENDERS.archer.hireCost', label: 'Archer kiralama', min: 1, max: 500, step: 1 },
      { path: 'DEFENDERS.archer.hireCostMultiplier', label: 'Archer kir. çarpanı', min: 1, max: 3, step: 0.1 },
      { path: 'DEFENDERS.cannon.hireCost', label: 'Cannon kiralama', min: 1, max: 1000, step: 5 },
      { path: 'DEFENDERS.cannon.hireCostMultiplier', label: 'Cannon kir. çarpanı', min: 1, max: 3, step: 0.1 },
      { path: 'DEBUG.gainMultiplier', label: 'EXP/Food kazanç çarpanı', min: 1, max: 100, step: 1 },
    ],
  },
  {
    title: 'Test',
    params: [
      { path: 'DEBUG.timeScale', label: 'Oyun hızı', min: 0.25, max: 5, step: 0.25 },
      { path: 'DEBUG.jumpWaveTarget', label: 'Hedef wave', min: 1, max: 500, step: 1 },
      { type: 'action', label: "Wave'e atla", run: (game) => game.events.emit('dev-jump-wave', CONFIG.DEBUG.jumpWaveTarget) },
      { type: 'action', label: '+10K EXP', run: () => { GameState.resources.exp += 10000; } },
      { type: 'action', label: '+100 Food', run: () => { GameState.resources.food += 100; } },
    ],
  },
];

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, val) {
  const ks = path.split('.');
  const last = ks.pop();
  const parent = ks.reduce((o, k) => (o == null ? o : o[k]), obj);
  if (parent) parent[last] = val;
}

const DevPanel = {
  _game: null,
  _defaults: {},
  _inputs: {},

  /** Oyun başında bir kez çağrılır. ?dev yoksa hiçbir şey yapmaz. */
  init(game) {
    if (!new URLSearchParams(location.search).has('dev')) return;
    this._game = game;

    // Varsayılanları override uygulanmadan ÖNCE anlık değerden al
    this._eachParam((p) => { this._defaults[p.path] = getPath(CONFIG, p.path); });

    // Kayıtlı override'ları CONFIG'e uygula
    const saved = this._loadOverrides();
    for (const path in saved) setPath(CONFIG, path, saved[path]);

    this._injectStyle();
    this._build();
    this._syncAll();
  },

  _eachParam(fn) {
    for (const g of GROUPS) for (const p of g.params) if (p.type !== 'action') fn(p);
  },

  _loadOverrides() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  },
  _saveOverrides() {
    const obj = {};
    this._eachParam((p) => {
      const v = getPath(CONFIG, p.path);
      if (v !== this._defaults[p.path]) obj[p.path] = v;
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (e) { /* yoksay */ }
  },

  _setValue(path, val) {
    if (isNaN(val)) return;
    setPath(CONFIG, path, val);
    this._saveOverrides();
  },

  _syncInput(path) {
    const io = this._inputs[path]; if (!io) return;
    const v = getPath(CONFIG, path);
    io.range.value = v; io.number.value = v;
  },
  _syncAll() { for (const path in this._inputs) this._syncInput(path); },

  _reset() {
    for (const path in this._defaults) setPath(CONFIG, path, this._defaults[path]);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* yoksay */ }
    this._syncAll();
  },

  _export() {
    const obj = {};
    this._eachParam((p) => { obj[p.path] = getPath(CONFIG, p.path); });
    const txt = JSON.stringify(obj, null, 2);
    const ta = document.getElementById('dev-export-area');
    if (ta) { ta.value = txt; ta.style.display = 'block'; ta.select(); }
    try { navigator.clipboard?.writeText(txt); } catch (e) { /* yoksay */ }
  },

  _injectStyle() {
    if (document.getElementById('dev-panel-style')) return;
    const s = document.createElement('style'); s.id = 'dev-panel-style';
    s.textContent = `
      #dev-panel{position:fixed;top:8px;left:8px;z-index:9999;width:280px;max-height:92vh;overflow:auto;
        background:rgba(10,10,26,.94);border:1px solid #33335a;border-radius:6px;color:#ddd;
        font:11px/1.4 monospace;box-shadow:0 4px 20px rgba(0,0,0,.5)}
      #dev-panel .hd{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;
        background:#16213e;cursor:pointer;border-bottom:1px solid #33335a;position:sticky;top:0}
      #dev-panel .hd b{color:#ffd700}
      #dev-panel .body{padding:6px 8px}
      #dev-panel .grp{margin:6px 0}
      #dev-panel .grp>.t{color:#9b59b6;margin:6px 0 2px;font-weight:bold}
      #dev-panel .row{display:grid;grid-template-columns:1fr 72px;gap:4px 6px;align-items:center;margin:4px 0}
      #dev-panel .row label{color:#bbb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #dev-panel .row input[type=range]{grid-column:1/3;width:100%;margin:0}
      #dev-panel .row input[type=number]{width:100%;background:#0f3460;color:#fff;border:1px solid #33335a;border-radius:3px;padding:1px 3px}
      #dev-panel button{background:#0f3460;color:#fff;border:1px solid #33335a;border-radius:3px;padding:4px 6px;cursor:pointer}
      #dev-panel button:hover{background:#1a4a7a}
      #dev-panel .act{grid-column:1/3}
      #dev-panel .foot{display:flex;gap:6px;margin-top:8px}
      #dev-panel .foot button{flex:1}
      #dev-export-area{display:none;width:100%;height:84px;margin-top:6px;box-sizing:border-box;
        background:#0a0a1a;color:#8f8;border:1px solid #33335a;font:10px monospace}
      #dev-fab{position:fixed;top:8px;left:8px;z-index:9999;background:#16213e;color:#ffd700;
        border:1px solid #33335a;border-radius:6px;padding:6px 8px;cursor:pointer;font:12px monospace;display:none}
    `;
    document.head.appendChild(s);
  },

  _build() {
    const panel = document.createElement('div'); panel.id = 'dev-panel';
    const fab = document.createElement('button'); fab.id = 'dev-fab'; fab.textContent = '🛠 DEV';

    const hd = document.createElement('div'); hd.className = 'hd';
    hd.innerHTML = '<b>🛠 DEV TUNING</b><span>▾ gizle</span>';
    hd.onclick = () => { panel.style.display = 'none'; fab.style.display = 'block'; };
    fab.onclick = () => { panel.style.display = 'block'; fab.style.display = 'none'; };

    const body = document.createElement('div'); body.className = 'body';
    for (const g of GROUPS) {
      const grp = document.createElement('div'); grp.className = 'grp';
      const t = document.createElement('div'); t.className = 't'; t.textContent = g.title; grp.appendChild(t);
      for (const p of g.params) grp.appendChild(this._makeControl(p));
      body.appendChild(grp);
    }

    const foot = document.createElement('div'); foot.className = 'foot';
    const rb = document.createElement('button'); rb.textContent = 'Reset'; rb.onclick = () => this._reset();
    const eb = document.createElement('button'); eb.textContent = 'Export'; eb.onclick = () => this._export();
    foot.appendChild(rb); foot.appendChild(eb);
    const ta = document.createElement('textarea'); ta.id = 'dev-export-area'; ta.readOnly = true;

    body.appendChild(foot); body.appendChild(ta);
    panel.appendChild(hd); panel.appendChild(body);
    document.body.appendChild(panel); document.body.appendChild(fab);
  },

  _makeControl(p) {
    const row = document.createElement('div'); row.className = 'row';
    if (p.type === 'action') {
      const b = document.createElement('button'); b.className = 'act'; b.textContent = p.label;
      b.onclick = () => p.run(this._game);
      row.appendChild(b);
      return row;
    }
    const lab = document.createElement('label'); lab.textContent = p.label; lab.title = p.label;
    const num = document.createElement('input'); num.type = 'number';
    num.min = p.min; num.max = p.max; num.step = p.step;
    const rng = document.createElement('input'); rng.type = 'range';
    rng.min = p.min; rng.max = p.max; rng.step = p.step;

    rng.oninput = () => { this._setValue(p.path, parseFloat(rng.value)); num.value = rng.value; };
    num.oninput = () => { this._setValue(p.path, parseFloat(num.value)); rng.value = num.value; };

    row.appendChild(lab); row.appendChild(num); row.appendChild(rng);
    this._inputs[p.path] = { range: rng, number: num };
    return row;
  },
};

export default DevPanel;
