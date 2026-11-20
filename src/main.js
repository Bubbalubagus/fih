import './style.css';
import confetti from 'canvas-confetti';
import { W, H } from './world.js';
import { SPECIES, RARITY, describeHabitat, fmtWeight, bodyLen, byId } from './fish.js';
import { COOK_STAGES, cookStage, cookValue, nextSmokerUpgrade, SPECIAL_MULT, nextHireCost, hireCrew, collectCrew, CREW_MAX, BASKET_MAX } from './economy.js';
import { RODS, LURES, SHIRTS, findItem, buyShirt, wearShirt } from './shop.js';
import { loadSave, writeSave, clearSave, defaultSave } from './save.js';
import { createGame, step, cutLine, sellCatch, releaseCatch, cookCatch, sellCooked, smokerFull, setRow, todaysSpecials, resetLure, rank, WEATHER, CASTING } from './game.js';
import { render, drawFishShape } from './render.js';
import * as sfx from './audio.js';

const $ = (id) => document.getElementById(id);
const BOAT_PRICE = 350;
const canvas = $('game');
const ctx = canvas.getContext('2d');
const save = loadSave();
const g = createGame(save);
const input = { down: false, pressed: false };

// ---------- events from the engine ----------

let toastTimer = 0;
function toast(msg, ms = 2600) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function persist() {
  save.clock = g.clock;
  writeSave(save);
}

function handleEvents() {
  const events = g.events.splice(0);
  for (const e of events) {
    try {
      switch (e.type) {
        case 'sfx':
          if (e.name === 'thunder') setTimeout(sfx.thunder, e.arg || 0);
          else sfx[e.name]?.(e.arg);
          break;
        case 'toast': toast(e.msg, e.ms); break;
        case 'weather': sfx.setRain(e.rain); break;
        case 'landed': showCatch(e); break;
        case 'save': persist(); break;
        case 'recovered': console.warn('Hollow Lake recovered from a bad state:', e.why); break;
      }
    } catch (err) {
      console.error('Event failed', e.type, err);
    }
  }
}

// ---------- input ----------

function press() {
  sfx.init();
  if (g.paused) return;
  if (!input.down) { input.down = true; input.pressed = true; }
}
function release() { input.down = false; }

const ROW_KEYS = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); return; }
  if (ROW_KEYS[e.code] && !g.paused) { e.preventDefault(); setRow(g, ROW_KEYS[e.code]); return; }
  if (e.key === 'Escape') { if (!closeModal()) doCut(); return; }
  if (g.paused) return;
  const k = e.key.toLowerCase();
  if (k === 's') openShop();
  if (k === 'j') openJournal();
  if (k === 'k') openKitchen();
  if (k === 'c') openCrew();
  if (k === 'm') toggleMute();
  if (k === 'r') doCut();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') { e.preventDefault(); release(); }
  if (ROW_KEYS[e.code] && g.row === ROW_KEYS[e.code]) setRow(g, 0);
});
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  // capture so a release outside the canvas or window still arrives
  try { canvas.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  press();
});
canvas.addEventListener('pointerup', release);
canvas.addEventListener('lostpointercapture', release);
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
window.addEventListener('blur', () => { release(); setRow(g, 0); });
document.addEventListener('visibilitychange', () => { release(); if (document.hidden) persist(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function doCut() {
  if (g.paused) return;
  sfx.init();
  cutLine(g);
}

// ---------- catch card ----------

let portrait = null;

function showCatch({ sp, weight, value, isNew, isRecord, flavor, special }) {
  const r = RARITY[sp.rarity];
  if (rank(sp) >= 4) celebrate(rank(sp) >= 5);
  openModal(`
    <div class="card-head">
      <span class="tag" style="color:${r.color}">${r.label}</span>
      <span>${special ? `<span class="badge pink">MARKET SPECIAL ×${SPECIAL_MULT}</span>` : ''}${isNew ? '<span class="badge">NEW SPECIES</span>' : ''}${isRecord ? '<span class="badge gold">PERSONAL BEST</span>' : ''}</span>
    </div>
    <canvas class="portrait" width="560" height="280"></canvas>
    <h2>${sp.name}</h2>
    <div class="weight">${fmtWeight(weight)}</div>
    <p class="flavor">${flavor}</p>
    <div class="actions">
      <button class="primary" data-act="sell">${value > 0 ? `Sell for $${value}` : 'Toss it in the bin'}</button>
      ${sp.junk ? '' : `<button data-act="cook" ${smokerFull(g) ? 'disabled' : ''}>${smokerFull(g) ? 'Smoker full' : `Cook it · up to $${Math.round(value * COOK_STAGES.at(-1).mult)}`}</button>`}
      ${sp.junk ? '' : '<button data-act="release">Release · +1 karma</button>'}
    </div>`, { closable: false });
  const card = $('modal-card');
  portrait = { canvas: card.querySelector('.portrait'), sp };
  card.querySelector('[data-act="sell"]').onclick = () => { closeModal(true); sellCatch(g); };
  const rel = card.querySelector('[data-act="release"]');
  if (rel) rel.onclick = () => { closeModal(true); releaseCatch(g); };
  const cook = card.querySelector('[data-act="cook"]');
  if (cook) cook.onclick = () => { closeModal(true); cookCatch(g); };
  card.querySelector('[data-act="sell"]').focus();
}

function celebrate(big) {
  try {
    const rect = canvas.getBoundingClientRect();
    const origin = { x: (rect.left + rect.width * 0.2) / innerWidth, y: (rect.top + rect.height * 0.35) / innerHeight };
    confetti({ particleCount: big ? 220 : 120, spread: big ? 110 : 70, origin, colors: ['#ffb84d', '#c58cff', '#5fb4ff', '#ff5d8f', '#ffffff'] });
    if (big) setTimeout(() => confetti({ particleCount: 160, angle: 120, spread: 80, origin: { x: 0.9, y: 0.6 } }), 350);
  } catch { /* purely cosmetic */ }
}

function drawPortrait() {
  if (!portrait?.canvas) return;
  const c = portrait.canvas.getContext('2d');
  const sp = portrait.sp;
  c.clearRect(0, 0, 560, 280);
  c.save();
  c.translate(280 + (sp.shape === 'kraken' || sp.shape === 'serpent' ? 30 : 0), 140 + Math.sin(g.time * 2) * 6);
  c.rotate(Math.sin(g.time * 1.5) * 0.08);
  if (sp.glow) { c.shadowColor = sp.color; c.shadowBlur = 30; }
  drawFishShape(c, sp, 150 / Math.max(1.4, bodyLen(sp) + 0.6), g.time);
  c.restore();
}

// ---------- modals ----------

let panel = null;  // which live-updating panel is open, if any
let panelTick = 0;

function openModal(html, { closable = true, name = null } = {}) {
  panel = name;
  g.paused = true;
  setRow(g, 0);
  input.down = false;
  const m = $('modal');
  m.hidden = false;
  m.dataset.closable = closable ? '1' : '';
  $('modal-card').innerHTML = html;
}

/** Returns true if a modal was closed. */
function closeModal(force = false) {
  const m = $('modal');
  if (m.hidden || (!force && !m.dataset.closable)) return false;
  m.hidden = true;
  g.paused = false;
  portrait = null;
  panel = null;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  return true;
}

$('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });

/** Shop and journal can open any time except mid-fight; an active cast is reeled in. */
function canOpenPanel() {
  if (g.state === 'reeling') { toast('Not now, you have a fish on the line!', 1500); return false; }
  if (g.state === 'landed') return false;
  if (CASTING.includes(g.state)) resetLure(g);
  return true;
}

/** Panels can replace each other, but never the catch card. */
function panelAllowed() {
  if (!$('modal').hidden) return !!$('modal').dataset.closable;
  return canOpenPanel();
}

function swatch(sh) {
  switch (sh.pattern) {
    case 'stripes': return `repeating-linear-gradient(180deg, ${sh.color} 0 5px, ${sh.accent} 5px 9px)`;
    case 'spots': return `radial-gradient(circle at 30% 35%, ${sh.accent} 0 22%, transparent 23%), radial-gradient(circle at 70% 70%, ${sh.accent} 0 20%, transparent 21%), ${sh.color}`;
    case 'band': return `linear-gradient(180deg, ${sh.color} 0 40%, ${sh.accent} 40% 52%, ${sh.color} 52% 64%, ${sh.accent} 64% 76%, ${sh.color} 76%)`;
    case 'rainbow': return 'conic-gradient(#ff5d8f, #ffb84d, #e8ff5d, #5fe08a, #5fb4ff, #c58cff, #ff5d8f)';
    default: return sh.color;
  }
}

function openShop() {
  if (!panelAllowed()) return;
  const row = (item, kind) => {
    const owned = (kind === 'rod' ? save.ownedRods : save.ownedLures).includes(item.id);
    const equipped = (kind === 'rod' ? save.rod : save.lure) === item.id;
    const stats = kind === 'rod'
      ? `Strength ${item.power} · Reel ${item.reel} · Reach ${Math.round(item.depth * 100)}%`
      : `Attract ${item.attract}px · Luck +${Math.round(item.luck * 100)}%${item.nightLuck ? ` (+${Math.round(item.nightLuck * 100)}% at night)` : ''}${item.bonusTag ? ` · ${item.bonusMult}× ${item.bonusTag}s` : ''}`;
    const btn = equipped ? '<button disabled>Equipped</button>'
      : owned ? `<button data-equip="${kind}:${item.id}">Equip</button>`
      : `<button class="primary" data-buy="${kind}:${item.id}" ${save.money < item.price ? 'disabled' : ''}>$${item.price}</button>`;
    return `<div class="item ${equipped ? 'equipped' : ''}"><b>${item.name}</b><small>${item.desc}<br>${stats}</small>${btn}</div>`;
  };
  openModal(`
    <div class="card-head"><h2>Bait &amp; Tackle</h2><b style="color:var(--accent)">$${save.money}</b></div>
    <h3>Rods</h3><div class="items">${RODS.map((r) => row(r, 'rod')).join('')}</div>
    <h3>Lures</h3><div class="items">${LURES.map((l) => row(l, 'lure')).join('')}</div>
    <h3>Shirts</h3><div class="shirts">${SHIRTS.map((sh) => {
      const owned = save.ownedShirts.includes(sh.id);
      const worn = save.shirt === sh.id;
      const btn = worn ? '<button disabled>Wearing</button>'
        : owned ? `<button data-wear="${sh.id}">Wear</button>`
        : `<button class="primary" data-shirt="${sh.id}" ${save.money < sh.price ? 'disabled' : ''}>$${sh.price}</button>`;
      return `<div class="shirt ${worn ? 'equipped' : ''}" title="${sh.desc}"><span class="swatch" style="background:${swatch(sh)}"></span><b>${sh.name}</b>${btn}</div>`;
    }).join('')}</div>
    <h3>Boat</h3><div class="items">
      <div class="item ${save.boat ? 'equipped' : ''}"><b>Rowboat</b><small>Row out over deep water with A/D or the arrow keys. Big fish are closer, so fights are shorter.</small>
      ${save.boat ? '<button disabled>Owned</button>' : `<button class="primary" data-boat ${save.money < BOAT_PRICE ? 'disabled' : ''}>$${BOAT_PRICE}</button>`}</div>
    </div>
    <div class="actions"><button data-close>Back to the lake</button></div>`);
  const card = $('modal-card');
  card.querySelector('[data-close]').onclick = () => closeModal();
  card.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => {
    const [kind, id] = b.dataset.buy.split(':');
    const item = findItem(kind === 'rod' ? RODS : LURES, id);
    const owned = kind === 'rod' ? save.ownedRods : save.ownedLures;
    if (save.money < item.price || owned.includes(id)) return;
    save.money -= item.price;
    owned.push(id);
    save[kind] = id;
    sfx.coin();
    persist();
    openShop();
  });
  card.querySelectorAll('[data-shirt]').forEach((b) => b.onclick = () => {
    if (!buyShirt(save, b.dataset.shirt)) return;
    sfx.coin();
    persist();
    openShop();
  });
  card.querySelectorAll('[data-wear]').forEach((b) => b.onclick = () => {
    if (wearShirt(save, b.dataset.wear)) persist();
    openShop();
  });
  const boatBtn = card.querySelector('[data-boat]');
  if (boatBtn) boatBtn.onclick = () => {
    if (save.boat || save.money < BOAT_PRICE) return;
    save.money -= BOAT_PRICE;
    save.boat = true;
    sfx.coin();
    persist();
    closeModal();
    toast('Your rowboat is tied to the dock. Row out with A/D or the arrow keys.', 4000);
  };
  card.querySelectorAll('[data-equip]').forEach((b) => b.onclick = () => {
    const [kind, id] = b.dataset.equip.split(':');
    save[kind] = id;
    persist();
    openShop();
  });
}

function openJournal() {
  if (!panelAllowed()) return;
  const found = SPECIES.filter((s) => save.journal[s.id]).length;
  const pct = Math.round((found / SPECIES.length) * 100);
  const sorted = [...SPECIES].sort((a, b) => rank(a) - rank(b));
  openModal(`
    <div class="card-head"><h2>Angler's Journal</h2><b>${found} / ${SPECIES.length}</b></div>
    <div class="progress"><div style="width:${pct}%"></div></div>
    <p class="flavor">${save.totalCaught} total catches. Unknown entries show where to look.</p>
    <div class="journal-grid">${sorted.map((s) => {
      const e = save.journal[s.id];
      const r = RARITY[s.rarity];
      return `<div class="entry"><canvas width="200" height="100" data-sp="${s.id}"></canvas>
        <b>${e ? s.name : '???'}</b>
        <small style="color:${r.color}">${r.label}</small>
        <small>${e ? `Best ${fmtWeight(e.best)} · ×${e.count}` : describeHabitat(s)}</small></div>`;
    }).join('')}</div>
    <div class="actions" id="journal-actions">
      <button data-close>Close</button>
      <button data-reset class="danger">Reset progress</button>
    </div>`);
  const card = $('modal-card');
  card.querySelector('[data-close]').onclick = () => closeModal();
  card.querySelector('[data-reset]').onclick = () => {
    $('journal-actions').innerHTML = `
      <span class="confirm-text">Erase all money, gear, and journal entries?</span>
      <button data-erase class="danger">Yes, erase everything</button>
      <button data-cancel>Keep my progress</button>`;
    card.querySelector('[data-cancel]').onclick = () => openJournal();
    card.querySelector('[data-erase]').onclick = () => {
      clearSave();
      Object.assign(save, defaultSave());
      g.clock = save.clock;
      resetLure(g);
      persist();
      closeModal();
      toast('Fresh start. The lake is yours again.');
    };
  };
  card.querySelectorAll('canvas[data-sp]').forEach((c) => {
    const sp = SPECIES.find((s) => s.id === c.dataset.sp);
    const cx = c.getContext('2d');
    cx.translate(100 + (sp.shape === 'kraken' || sp.shape === 'serpent' ? 12 : 0), 52);
    drawFishShape(cx, sp, 44 / Math.max(1.4, bodyLen(sp) + 0.6), 0, !save.journal[sp.id]);
  });
}

// ---------- kitchen ----------

function openKitchen() {
  if (!panelAllowed()) return;
  const up = nextSmokerUpgrade(save);
  const specials = todaysSpecials(g).map((id) => byId(id).name).join(' and ');
  const slots = Array.from({ length: save.smokerSlots }, (_, i) => {
    const item = save.smoker[i];
    if (!item) return `<div class="slot empty"><span>Empty rack. Choose <b>Cook it</b> when you land a fish.</span></div>`;
    const sp = byId(item.id);
    return `<div class="slot" data-slot="${i}">
      <div class="slot-head"><b>${sp.name}</b><span class="cook-stage"></span></div>
      <div class="bar"><div></div></div>
      <div class="slot-foot"><small class="next"></small><button class="primary" data-sell="${i}"></button></div>
    </div>`;
  }).join('');
  openModal(`
    <div class="card-head"><h2>Smokehouse</h2><b style="color:var(--accent)">$${save.money}</b></div>
    <p class="flavor">Fish keep cooking while you play. ${COOK_STAGES.slice(1).map((s) => `${s.name} ×${s.mult}`).join(' → ')}.</p>
    <div class="slots">${slots}</div>
    <h3>Market</h3>
    <p>Today the market pays <b>×${SPECIAL_MULT}</b> for <b>${specials}</b>. Specials change every day.</p>
    <div class="actions">
      ${up ? `<button data-upgrade ${save.money < up.price ? 'disabled' : ''}>Build more racks (${up.slots} total) · $${up.price}</button>` : ''}
      <button data-close>Close</button>
    </div>`, { name: 'kitchen' });
  const card = $('modal-card');
  card.querySelector('[data-close]').onclick = () => closeModal();
  card.querySelectorAll('[data-sell]').forEach((b) => b.onclick = () => { sellCooked(g, +b.dataset.sell); openKitchen(); });
  const ub = card.querySelector('[data-upgrade]');
  if (ub) ub.onclick = () => {
    if (save.money < up.price) return;
    save.money -= up.price;
    save.smokerSlots = up.slots;
    sfx.coin();
    persist();
    openKitchen();
  };
  refreshKitchen();
}

function refreshKitchen() {
  const card = $('modal-card');
  save.smoker.forEach((item, i) => {
    const el = card.querySelector(`[data-slot="${i}"]`);
    if (!el) return;
    const st = cookStage(g.clock - item.start);
    el.querySelector('.cook-stage').textContent = st.stage.name;
    el.querySelector('.bar div').style.width = `${Math.round(((st.index + st.progress) / (COOK_STAGES.length - 1)) * 100)}%`;
    el.querySelector('.next').textContent = st.next ? `${st.next.name} in ${Math.ceil(st.next.t - (g.clock - item.start))}s` : 'Fully cured. It won\'t get any better.';
    el.querySelector('[data-sell]').textContent = `Sell $${cookValue(item, g.clock)}`;
  });
}

// ---------- crew ----------

function openCrew() {
  if (!panelAllowed()) return;
  const cost = nextHireCost(save);
  const total = save.crew.reduce((a, w) => a + w.value, 0);
  const rows = save.crew.map((w, i) => `
    <div class="slot" data-crew="${i}">
      <div class="slot-head"><b>${w.name}</b><span class="basket"></span></div>
      <div class="bar"><div></div></div>
      <div class="slot-foot"><small class="status"></small></div>
    </div>`).join('');
  openModal(`
    <div class="card-head"><h2>Crew</h2><b style="color:var(--accent)">$${save.money}</b></div>
    <p class="flavor">Hired hands fish the shallows from the far shore with cheap gear. They only bring in small fish and junk, and they stop when their basket is full, so check in now and then.</p>
    <div class="slots">${rows || '<div class="slot empty">No crew yet.</div>'}</div>
    <div class="actions">
      <button class="primary" data-collect ${total ? '' : 'disabled'}>Collect baskets · $${total}</button>
      ${cost !== null ? `<button data-hire ${save.money < cost ? 'disabled' : ''}>Hire a hand · $${cost}</button>` : `<button disabled>Crew full (${CREW_MAX})</button>`}
      <button data-close>Close</button>
    </div>`, { name: 'crew' });
  const card = $('modal-card');
  card.querySelector('[data-close]').onclick = () => closeModal();
  card.querySelector('[data-collect]').onclick = () => { if (collectCrew(save) > 0) sfx.coin(); persist(); openCrew(); };
  const hb = card.querySelector('[data-hire]');
  if (hb) hb.onclick = () => { const w = hireCrew(save); if (w) { sfx.coin(); toast(`${w.name} joins the crew.`); persist(); } openCrew(); };
  refreshCrew();
}

function refreshCrew() {
  const card = $('modal-card');
  let total = 0;
  save.crew.forEach((w, i) => {
    total += w.value;
    const el = card.querySelector(`[data-crew="${i}"]`);
    if (!el) return;
    el.querySelector('.basket').textContent = `${w.count}/${BASKET_MAX} · $${w.value}`;
    el.querySelector('.bar div').style.width = `${Math.round((w.count / BASKET_MAX) * 100)}%`;
    el.querySelector('.status').textContent = w.count >= BASKET_MAX ? 'Basket full. Waiting for you to collect.' : `${w.last ? `Last catch: ${w.last}. ` : ''}Next in about ${Math.max(1, Math.ceil(w.timer))}s`;
  });
  const cb = card.querySelector('[data-collect]');
  if (cb) { cb.textContent = `Collect baskets · $${total}`; cb.disabled = !total; }
}

function toggleMute() {
  sfx.init();
  sfx.setMuted(!sfx.isMuted());
  $('btn-mute').textContent = sfx.isMuted() ? 'Sound off' : 'Sound on';
}

$('btn-shop').onclick = openShop;
$('btn-journal').onclick = openJournal;
$('btn-mute').onclick = toggleMute;
$('btn-cut').onclick = doCut;
$('btn-kitchen').onclick = openKitchen;
$('btn-crew').onclick = openCrew;
for (const [id, dir] of [['btn-row-left', -1], ['btn-row-right', 1]]) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); sfx.init(); if (!g.paused) setRow(g, dir); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => setRow(g, 0));
}
// buttons should never keep focus, or Space would click them instead of casting
document.querySelectorAll('.hud button').forEach((b) => b.addEventListener('mouseup', () => b.blur()));

// ---------- HUD ----------

const HINTS = {
  idle: 'Hold <b>Space</b> or press and hold the lake to charge a cast',
  idleBoat: 'Hold <b>Space</b> to cast · <b>A</b>/<b>D</b> or arrows to row',
  charging: 'Release to cast!',
  flying: '',
  waiting: 'Waiting for a bite… hold to reel in slowly. Don\'t strike on a nibble!',
  nibble: 'Something\'s nibbling… wait for it…',
  bite: 'STRIKE NOW!',
  reeling: 'Hold to reel. Let go when the line goes red or the fish thrashes. <b>R</b> cuts the line.',
  landed: '',
};
let lastHint = null;
function updateHud() {
  const { tod, day } = g.cond;
  const mins = Math.floor(tod * 24 * 60);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(Math.floor((mins % 60) / 10) * 10).padStart(2, '0');
  $('money').textContent = `$${save.money}`;
  $('clock').textContent = `Day ${day} · ${hh}:${mm}`;
  $('weather').textContent = `${WEATHER[g.weather].icon} ${WEATHER[g.weather].label}`;
  $('karma').textContent = `Karma ${save.karma}`;
  $('btn-cut').hidden = !(CASTING.includes(g.state) || g.state === 'reeling') || g.paused;
  $('row-controls').hidden = !save.boat || g.state !== 'idle' || g.paused;
  const cooking = save.smoker.length;
  $('btn-kitchen').textContent = cooking ? `Kitchen ${cooking}/${save.smokerSlots}` : 'Kitchen';
  const basket = save.crew.reduce((a, w) => a + w.value, 0);
  $('btn-crew').textContent = basket ? `Crew $${basket}` : 'Crew';
  $('specials').textContent = `${SPECIAL_MULT}× ${todaysSpecials(g).map((id) => byId(id).name.split(' ').at(-1)).join(', ')}`;
  const hint = g.paused ? '' : HINTS[g.state === 'idle' && save.boat ? 'idleBoat' : g.state];
  if (hint !== lastHint) {
    const el = $('hint');
    el.innerHTML = hint;
    el.hidden = !hint;
    el.classList.toggle('urgent', g.state === 'bite');
    lastHint = hint;
  }
}

// ---------- main loop ----------

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

setInterval(persist, 10000);
window.addEventListener('beforeunload', persist);

let last = performance.now();
function frame(now) {
  // One bad frame must never kill the loop.
  try {
    const dt = (now - last) / 1000;
    last = now;
    step(g, input, dt);
    handleEvents();
    // a landed catch always needs its card; if it was somehow lost, sell automatically
    if (g.state === 'landed' && $('modal').hidden && g.stateTime > 1) sellCatch(g);
    render(ctx, g, g.time);
    drawPortrait();
    updateHud();
    if (panel && now - panelTick > 250) {
      panelTick = now;
      if (panel === 'kitchen') refreshKitchen();
      if (panel === 'crew') refreshCrew();
    }
  } catch (err) {
    console.error('Frame error, recovering:', err);
    try { resetLure(g); closeModal(true); } catch { /* keep looping */ }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (!save.totalCaught) toast('Welcome to Hollow Lake. Catch every species in the journal!', 4000);

// exposed for debugging and automated play-testing
window.hollowLake = { g, save, input, step, cutLine, sellCatch, openKitchen, openCrew };
