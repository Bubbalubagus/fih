// Pure game engine: no DOM, no audio. The page drains g.events to play sounds and show UI.
import { createNoise2D } from 'simplex-noise';
import { W, H, SURFACE, DOCK_X, ROD_TIP, bottomAt, surfaceY, depthOf, yForDepth, setWaveAmp, clamp } from './world.js';
import { RARITY, RARITY_ORDER, BOTTLE_MESSAGES, byId, pickSpecies, pickJunk, rollWeight, priceFor, conditionsAt, bodyLen } from './fish.js';
import { RODS, LURES, findItem } from './shop.js';
import { createReel, stepReel } from './reel.js';
import { recordCatch } from './save.js';
import { cookStage, cookValue, marketSpecials, SPECIAL_MULT, tickCrew, COOK_STAGES } from './economy.js';

export const STATES = ['idle', 'charging', 'flying', 'waiting', 'nibble', 'bite', 'reeling', 'landed'];
export const CASTING = ['charging', 'flying', 'waiting', 'nibble', 'bite'];
export const FISH_COUNT = 11;
export const LIMITS = { flying: 5, nibble: 8, bite: 2.5 };
export const BOAT = { min: DOCK_X + 50, max: W - 150, speed: 120 };

export const WEATHER = {
  clear: { label: 'Clear', icon: '☀️', weight: 45, clouds: 2, rain: 0, wave: 2.2 },
  cloudy: { label: 'Cloudy', icon: '☁️', weight: 25, clouds: 7, rain: 0, wave: 3 },
  rain: { label: 'Rain', icon: '🌧️', weight: 20, clouds: 9, rain: 160, wave: 4.5 },
  storm: { label: 'Storm', icon: '⛈️', weight: 10, clouds: 12, rain: 320, wave: 7.5 },
};

const LOSS = {
  snap: 'SNAP! The line broke. Ease off when it thrashes.',
  escape: 'Too much slack. It spat the hook.',
  runout: 'It ran out all your line and broke free.',
  timeout: 'It outlasted you and slipped away.',
  cut: 'You cut the line.',
};

export const rank = (sp) => RARITY_ORDER.indexOf(sp.rarity);

export function createGame(save, { rng = Math.random, weather = 'clear' } = {}) {
  const g = {
    save, rng, noise: createNoise2D(rng), events: [],
    state: 'idle', stateTime: 0, power: 0, powerDir: 1,
    lure: { x: ROD_TIP.x, y: ROD_TIP.y, vx: 0, vy: 0 },
    fish: [], target: null, reel: null, pending: null,
    nibblesLeft: 0, nibbleTimer: 0, biteTimer: 0, dip: 0, dipKick: 0,
    clock: Number.isFinite(save.clock) ? save.clock : 90,
    weather, weatherTimer: 80, waveAmp: 2.2, stormVis: 0, shake: 0,
    clouds: Array.from({ length: 12 }, (_, i) => ({ x: rng() * W, y: 30 + rng() * 110, s: 60 + rng() * 70, v: 6 + rng() * 10, a: i < 2 ? 0.9 : 0 })),
    rain: [], particles: [], ripples: [], flash: 0, time: 0, paused: false,
    boatX: null, // null = standing on the dock; a number = rowing the boat at that x
    cookSeen: new Map(),
  };
  g.cond = conditionsAt(g.clock);
  g.rod = () => findItem(RODS, g.save.rod);
  g.lureItem = () => findItem(LURES, g.save.lure);
  for (let i = 0; i < FISH_COUNT; i++) spawnFish(g, false);
  return g;
}

// ---------- small helpers ----------

/** Where the rod tip is: on the dock, or out on the boat. */
export function anchor(g) {
  return g.boatX === null ? ROD_TIP : { x: g.boatX + 46, y: SURFACE - 102 };
}
const reelTarget = (g) => ({ x: anchor(g).x - 6, y: SURFACE + 4 });

export function todaysSpecials(g) {
  return marketSpecials(g.cond.day);
}

const emit = (g, type, data = {}) => g.events.push({ type, ...data });
const sfx = (g, name, arg) => emit(g, 'sfx', { name, arg });
const toast = (g, msg, ms) => emit(g, 'toast', { msg, ms });

function setState(g, s) {
  if (g.state !== s) { g.state = s; g.stateTime = 0; }
}

export function luck(g) {
  const lure = g.lureItem();
  const night = g.cond.phase === 'night' ? lure.nightLuck || 0 : 0;
  return lure.luck + night + g.save.karma * 0.03;
}

function splashAt(g, x, n = 14, power = 1) {
  const y = surfaceY(x, g.time);
  for (let i = 0; i < n; i++) g.particles.push({ x, y, vx: (g.rng() - 0.5) * 120 * power, vy: -60 - g.rng() * 140 * power, life: 1 });
  g.ripples.push({ x, r: 4, life: 1 });
  if (g.particles.length > 400) g.particles.splice(0, g.particles.length - 400);
}

function scare(f) {
  if (f.sp.junk) { f.state = 'gone'; return; }
  f.state = 'flee';
  f.cool = 6;
}

/** Return everything to the dock. Safe to call from any state. */
export function resetLure(g) {
  const a = anchor(g);
  Object.assign(g.lure, { x: a.x, y: a.y, vx: 0, vy: 0 });
  g.dip = 0;
  g.dipKick = 0;
  g.power = 0;
  for (const f of g.fish) if (['approach', 'atlure', 'hooked'].includes(f.state)) scare(f);
  g.target = null;
  g.reel = null;
  g.pending = null;
  setState(g, 'idle');
}

function loseFish(g, reason) {
  sfx(g, reason === 'snap' ? 'snap' : 'fail');
  toast(g, LOSS[reason] || 'It got away.');
  resetLure(g);
}

/** Abandon whatever is happening and reel back to the dock. */
export function cutLine(g) {
  if (g.state === 'reeling') { loseFish(g, 'cut'); return true; }
  if (CASTING.includes(g.state)) { resetLure(g); toast(g, 'Line reeled in.', 1400); return true; }
  return false;
}

// ---------- fish population ----------

export function makeFish(g, sp, x, y, weight = rollWeight(sp, g.rng)) {
  const span = sp.weight[1] - sp.weight[0] || 1;
  const wf = clamp((weight - sp.weight[0]) / span, 0, 1);
  const f = {
    sp, x, y, weight,
    size: sp.size * (0.8 + wf * 0.45),
    dir: g.rng() < 0.5 ? -1 : 1,
    seed: g.rng() * 1000,
    state: 'wander', alpha: 1, life: 25 + g.rng() * 45, cool: 0,
  };
  g.fish.push(f);
  return f;
}

function spawnFish(g, fadeIn = true) {
  const lure = g.lureItem();
  for (let tries = 0; tries < 10; tries++) {
    const x = DOCK_X + 40 + g.rng() * (W - DOCK_X - 70);
    const y = SURFACE + 12 + g.rng() * (bottomAt(x) - SURFACE - 24);
    const sp = pickSpecies(g.rng, { depth: depthOf(y), phase: g.cond.phase, weather: g.weather, luck: luck(g), bonusTag: lure.bonusTag, bonusMult: lure.bonusMult });
    if (!sp) continue;
    const f = makeFish(g, sp, x, y);
    if (fadeIn) {
      f.alpha = 0;
      if (rank(sp) >= RARITY_ORDER.indexOf('mythic')) toast(g, 'The water goes still. Something enormous is down there...', 3500);
    }
    return f;
  }
  return null;
}

const mouthX = (f, lx) => lx - f.dir * f.size * bodyLen(f.sp) * 0.95;

function updateFish(g, input, dt) {
  const L = g.lure;
  const lureItem = g.lureItem();
  const lureDepth = depthOf(L.y);
  const lureInWater = g.state === 'waiting';

  for (const f of g.fish) {
    if (f.state === 'gone') continue; // landed or despawned this frame
    f.cool -= dt;
    switch (f.state) {
      case 'hooked':
        if (g.target !== f) { scare(f); continue; }
        f.dir = g.reel && !input.down ? 1 : -1;
        f.x = mouthX(f, L.x);
        f.y = L.y + Math.sin(g.time * 25) * (g.reel?.burst ? 3 : 1);
        continue;
      case 'flee': {
        const away = Math.sign(f.x - L.x) || 1;
        f.dir = away;
        f.x += away * f.sp.speed * 120 * dt;
        f.y = Math.min(f.y + 20 * dt, bottomAt(f.x) - 8);
        f.alpha -= dt * 0.8;
        if (f.alpha <= 0 || f.x < -200 || f.x > W + 200) f.state = 'gone';
        continue;
      }
      case 'approach': {
        if (!lureInWater || g.target !== f) { f.state = 'wander'; if (g.target === f) g.target = null; continue; }
        f.dir = L.x >= f.x ? 1 : -1;
        const tx = mouthX(f, L.x);
        const dx = tx - f.x, dy = L.y - f.y;
        const d = Math.hypot(dx, dy);
        if (d < 4) {
          f.state = 'atlure';
          setState(g, 'nibble');
          // shy, rare fish tease more before committing
          g.nibblesLeft = Math.floor(g.rng() * (2 + rank(f.sp) * 0.6));
          g.nibbleTimer = 0.3 + g.rng() * 0.5;
        } else {
          const step = Math.min(d, f.sp.speed * 40 * dt);
          f.x += (dx / d) * step;
          f.y += (dy / d) * step;
        }
        continue;
      }
      case 'atlure':
        if (g.target !== f) { scare(f); continue; }
        f.x = mouthX(f, L.x) + Math.sin(g.time * 6) * 1.5;
        f.y = L.y;
        continue;
    }

    // wander (junk never wanders: it only exists while snagged)
    if (f.sp.junk) { f.state = 'gone'; continue; }
    f.alpha = Math.min(1, f.alpha + dt * 0.5);
    f.life -= dt;
    const ang = g.noise(f.seed, g.time * 0.15) * Math.PI;
    const vx = Math.cos(ang) * f.sp.speed * 28;
    let vy = Math.sin(ang) * f.sp.speed * 10;
    const d = depthOf(f.y);
    if (d < f.sp.depth[0]) vy += 18;
    if (d > f.sp.depth[1]) vy -= 18;
    f.x = clamp(f.x + vx * dt, DOCK_X + 25, W - 15);
    f.y = clamp(f.y + vy * dt, SURFACE + 10, bottomAt(f.x) - 10);
    if (Math.abs(vx) > 3) f.dir = Math.sign(vx);
    if (f.life <= 0) { f.state = 'flee'; continue; }

    if (lureInWater && !g.target && f.cool <= 0) {
      const dist = Math.hypot(L.x - f.x, L.y - f.y);
      const depthOk = lureDepth >= f.sp.depth[0] - 0.08 && lureDepth <= f.sp.depth[1] + 0.08;
      if (dist < lureItem.attract + f.size && depthOk && g.rng() < dt * 0.55 * RARITY[f.sp.rarity].shy) {
        f.state = 'approach';
        g.target = f;
      }
    }
  }
  g.fish = g.fish.filter((f) => f.state !== 'gone');
  let guard = 0;
  while (g.fish.length < FISH_COUNT && guard++ < FISH_COUNT) if (!spawnFish(g)) break;
}

// ---------- environment ----------

function pickWeather(g) {
  const entries = Object.entries(WEATHER);
  const total = entries.reduce((a, [, w]) => a + w.weight, 0);
  let r = g.rng() * total;
  for (const [k, w] of entries) { r -= w.weight; if (r <= 0) return k; }
  return 'clear';
}

export function setWeather(g, w) {
  if (!WEATHER[w] || g.weather === w) return;
  g.weather = w;
  emit(g, 'weather', { weather: w, rain: WEATHER[w].rain / 320 });
}

function updateEnvironment(g, dt) {
  g.clock += dt;
  const prevPhase = g.cond.phase;
  const prevDay = g.cond.day;
  g.cond = conditionsAt(g.clock);
  const calm = g.state === 'idle' || g.state === 'waiting';
  if (g.cond.day !== prevDay) {
    const names = marketSpecials(g.cond.day).map((id) => byId(id).name).join(' and ');
    toast(g, `New day at the market: ${names} sell for double today.`, 3500);
  }
  if (g.cond.phase !== prevPhase && calm) {
    toast(g, { night: 'Night falls. Strange things stir in the deep.', dawn: 'Dawn breaks over Hollow Lake.', dusk: 'Dusk. The water turns to gold.', day: 'Full daylight.' }[g.cond.phase]);
  }

  g.weatherTimer -= dt;
  if (g.weatherTimer <= 0) {
    g.weatherTimer = 60 + g.rng() * 90;
    const next = pickWeather(g);
    if (next !== g.weather) {
      setWeather(g, next);
      if (calm) toast(g, `Weather turns ${WEATHER[next].label.toLowerCase()} ${WEATHER[next].icon}`);
    }
  }
  const W8 = WEATHER[g.weather];
  g.waveAmp += (W8.wave - g.waveAmp) * Math.min(1, dt * 0.3);
  setWaveAmp(g.waveAmp);

  g.clouds.forEach((c, i) => {
    c.x += c.v * dt * (g.weather === 'storm' ? 2.5 : 1);
    if (c.x - c.s > W) { c.x = -c.s; c.y = 30 + g.rng() * 110; }
    c.a += ((i < W8.clouds ? 0.9 : 0) - c.a) * Math.min(1, dt * 0.25);
  });

  while (g.rain.length < W8.rain) g.rain.push({ x: g.rng() * (W + 100), y: g.rng() * H, v: 500 + g.rng() * 300 });
  if (g.rain.length > W8.rain) g.rain.length = W8.rain;
  for (const d of g.rain) {
    d.y += d.v * dt;
    d.x -= d.v * 0.25 * dt;
    if (d.y > surfaceY(d.x, g.time)) {
      if (g.rng() < 0.08) g.ripples.push({ x: d.x, r: 1, life: 0.5 });
      d.y = -10;
      d.x = g.rng() * (W + 100);
    }
  }

  if (g.weather === 'storm' && g.rng() < dt * 0.07) {
    g.flash = 1;
    sfx(g, 'thunder', 300 + g.rng() * 900);
  }
  g.flash = Math.max(0, g.flash - dt * 2.5);
  g.shake = Math.max(0, g.shake - dt * 12);

  for (const p of g.particles) { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.5; }
  g.particles = g.particles.filter((p) => p.life > 0 && p.y < surfaceY(p.x, g.time) + 4);
  for (const r of g.ripples) { r.r += 30 * dt; r.life -= dt * 0.9; }
  g.ripples = g.ripples.filter((r) => r.life > 0);
  if (g.ripples.length > 200) g.ripples.splice(0, g.ripples.length - 200);
}

// ---------- state machine ----------

/** Where a cast of power p lands: just past the rod at 0, the far shore at 1. */
export function castLanding(g, p) {
  const a = anchor(g);
  const near = a.x + 40;
  const far = W - 40;
  return near + clamp(p, 0, 1) * Math.max(0, far - near);
}

function cast(g) {
  const p = clamp(g.power, 0, 1);
  const a = anchor(g);
  const vy = -140 - p * 160;
  // solve the arc so the hook always lands at castLanding(): 300t^2 + vy t - drop = 0
  const drop = SURFACE - a.y;
  const t = (-vy + Math.sqrt(vy * vy + 1200 * drop)) / 600;
  Object.assign(g.lure, { x: a.x, y: a.y, vx: (castLanding(g, p) - a.x) / t, vy });
  setState(g, 'flying');
  sfx(g, 'whoosh');
}

function splashDown(g) {
  const L = g.lure;
  L.x = clamp(L.x, DOCK_X + 30, W - 20);
  L.y = surfaceY(L.x, g.time) + 2;
  L.vx = L.vy = 0;
  setState(g, 'waiting');
  splashAt(g, L.x, 8, 0.5);
  sfx(g, 'plop');
}

function startFight(g) {
  const f = g.target;
  f.state = 'hooked';
  g.reel = createReel({ sp: f.sp, weight: f.weight, rod: g.rod(), x: g.lure.x, y: g.lure.y, seed: g.rng() * 1000, target: reelTarget(g) });
  setState(g, 'reeling');
  splashAt(g, g.lure.x, 10 + f.size * 0.3, 0.8);
  sfx(g, 'splash');
  g.dip = 0;
}

function missBite(g, msg) {
  if (g.target) scare(g.target);
  g.target = null;
  g.dip = 0;
  setState(g, 'waiting');
  sfx(g, 'fail');
  toast(g, msg);
}

function land(g) {
  const f = g.target;
  f.state = 'gone';
  const sp = f.sp;
  const special = todaysSpecials(g).includes(sp.id);
  const value = priceFor(sp, f.weight) * (special ? SPECIAL_MULT : 1);
  const { isNew, isRecord } = recordCatch(g.save, sp, f.weight);
  const flavor = sp.id === 'bottle' ? BOTTLE_MESSAGES[Math.floor(g.rng() * BOTTLE_MESSAGES.length)] : sp.flavor;
  g.target = null;
  g.reel = null;
  g.pending = { sp, weight: f.weight, value, isNew, isRecord, flavor, special };
  setState(g, 'landed');
  splashAt(g, anchor(g).x, 18, 1);
  sfx(g, 'splash');
  sfx(g, 'fanfare', Math.max(0, rank(sp)));
  emit(g, 'landed', g.pending);
  emit(g, 'save');
}

export function sellCatch(g) {
  if (g.state !== 'landed' || !g.pending) return 0;
  const { value } = g.pending;
  g.save.money += value;
  if (value > 0) sfx(g, 'coin');
  resetLure(g);
  emit(g, 'save');
  return value;
}

export const smokerFull = (g) => g.save.smoker.length >= g.save.smokerSlots;

/** Put the landed fish in the smoker instead of selling it now. */
export function cookCatch(g) {
  if (g.state !== 'landed' || !g.pending || g.pending.sp.junk || smokerFull(g)) return false;
  const { sp, weight, value } = g.pending;
  g.save.smoker.push({ id: sp.id, weight, base: value, start: g.clock });
  sfx(g, 'sizzle');
  toast(g, `${sp.name} is on the smoker. The longer it cooks, the more it's worth.`);
  resetLure(g);
  emit(g, 'save');
  return true;
}

export function sellCooked(g, index) {
  const item = g.save.smoker[index];
  if (!item) return 0;
  const value = cookValue(item, g.clock);
  g.save.smoker.splice(index, 1);
  g.save.money += value;
  sfx(g, 'coin');
  emit(g, 'save');
  return value;
}

export function setRow(g, dir) {
  g.row = Math.sign(dir) || 0;
}

export function releaseCatch(g) {
  if (g.state !== 'landed' || !g.pending) return false;
  if (g.pending.sp.junk) { sellCatch(g); return false; }
  g.save.karma = Math.min(10, g.save.karma + 1);
  splashAt(g, DOCK_X + 30, 10, 0.6);
  toast(g, g.save.karma >= 10 ? 'The lake is grateful. Karma is maxed.' : 'The lake remembers your kindness. Luck +3%.');
  resetLure(g);
  emit(g, 'save');
  return true;
}

function updateState(g, input, dt) {
  const L = g.lure;
  switch (g.state) {
    case 'idle':
      if (g.row && g.save.boat) {
        // rowing: left of the mooring spot means stepping back onto the dock
        const x = (g.boatX ?? BOAT.min - 1) + g.row * BOAT.speed * dt;
        g.boatX = x < BOAT.min ? (g.row > 0 ? BOAT.min : null) : Math.min(x, BOAT.max);
        Object.assign(g.lure, { ...anchor(g), vx: 0, vy: 0 });
        if (g.rng() < dt * 3) g.ripples.push({ x: (g.boatX ?? DOCK_X) + 10, r: 2, life: 0.5 });
        break;
      }
      // a fresh press casts; so does a button still held from the last fight, after a short beat
      if (input.pressed || (input.down && g.stateTime > 0.5)) { setState(g, 'charging'); g.power = 0; g.powerDir = 1; }
      break;

    case 'charging':
      g.power += g.powerDir * dt * 1.1;
      if (g.power >= 1) { g.power = 1; g.powerDir = -1; }
      if (g.power <= 0) { g.power = 0; g.powerDir = 1; }
      if (!input.down) cast(g);
      break;

    case 'flying':
      L.vy += 600 * dt;
      L.x += L.vx * dt;
      L.y += L.vy * dt;
      if (L.x > W - 20) { L.x = W - 20; L.vx = 0; }
      if (L.vy > 0 && L.y >= surfaceY(L.x, g.time)) splashDown(g);
      break;

    case 'waiting': {
      if (input.down) {
        // slow retrieve: drag the hook toward the angler and up
        const ax = anchor(g).x;
        L.x += Math.sign(ax - L.x) * 70 * dt;
        L.y = Math.max(SURFACE + 6, L.y - 25 * dt);
        if (g.rng() < dt * 8) sfx(g, 'click');
        if (Math.abs(L.x - ax) < 15) { resetLure(g); toast(g, 'Reeled in. Hold to cast again.', 1600); break; }
      } else {
        L.y += 32 * dt;
      }
      // never sink past the rod's reach or through the lakebed (which rises near the dock)
      L.y = Math.min(L.y, bottomAt(L.x) - 6, yForDepth(g.rod().depth));
      if (!g.target && L.y >= bottomAt(L.x) - 8 && g.rng() < dt * 0.05) {
        const f = makeFish(g, pickJunk(g.rng, luck(g)), L.x, L.y);
        f.state = 'atlure';
        g.target = f;
        setState(g, 'bite');
        g.biteTimer = 1.2;
        sfx(g, 'bite');
        toast(g, 'Something snagged!', 1200);
      }
      break;
    }

    case 'nibble':
      g.nibbleTimer -= dt;
      if (input.pressed) { missBite(g, 'Too early! That was just a nibble.'); break; }
      if (g.nibbleTimer <= 0) {
        if (g.nibblesLeft > 0) {
          g.nibblesLeft -= 1;
          g.nibbleTimer = 0.5 + g.rng() * 0.8;
          g.dipKick = 1;
          sfx(g, 'plop');
          g.ripples.push({ x: L.x, r: 3, life: 0.6 });
        } else {
          setState(g, 'bite');
          g.biteTimer = Math.max(0.42, 0.85 - rank(g.target.sp) * 0.06);
          sfx(g, 'bite');
          splashAt(g, L.x, 6, 0.4);
        }
      }
      break;

    case 'bite':
      g.biteTimer -= dt;
      g.dip = 10 + Math.sin(g.time * 40) * 2;
      if (input.pressed) { startFight(g); break; }
      if (g.biteTimer <= 0) missBite(g, 'Too slow. It stole your bait.');
      break;

    case 'reeling': {
      const result = stepReel(g.reel, input.down, dt, g.noise);
      L.x = g.reel.x;
      L.y = g.reel.y;
      if (input.down && g.rng() < dt * 14) sfx(g, 'click');
      if (g.reel.burst) {
        if (g.rng() < dt * 6) splashAt(g, L.x, 3, 0.4);
        const r = rank(g.reel.sp);
        if (r >= 5) g.shake = Math.max(g.shake, r >= 6 ? 6 : 3);
      }
      if (result === 'caught') land(g);
      else if (result) loseFish(g, result);
      break;
    }
  }

  if (g.dipKick > 0) {
    g.dip = Math.sin((1 - g.dipKick) * Math.PI) * 5;
    g.dipKick = Math.max(0, g.dipKick - dt * 3);
  } else if (g.state !== 'bite') g.dip *= 0.8;
}

/** Self-healing: detect any impossible state and recover instead of freezing. */
function watchdog(g) {
  const L = g.lure;
  if (![L.x, L.y, L.vx, L.vy].every(Number.isFinite)) { emit(g, 'recovered', { why: 'lure NaN' }); resetLure(g); return; }
  if (['nibble', 'bite', 'reeling'].includes(g.state) && (!g.target || !g.fish.includes(g.target))) { emit(g, 'recovered', { why: 'lost target' }); resetLure(g); return; }
  if (g.state === 'reeling' && !g.reel) { emit(g, 'recovered', { why: 'no reel' }); resetLure(g); return; }
  if (g.state === 'landed' && !g.pending) { resetLure(g); return; }
  if (g.state === 'flying' && g.stateTime > LIMITS.flying) splashDown(g);
  if (g.state === 'nibble' && g.stateTime > LIMITS.nibble) { g.nibblesLeft = 0; g.nibbleTimer = 0; }
  if (g.state === 'bite' && g.stateTime > LIMITS.bite) missBite(g, 'It got away.');
  if (!g.save.boat) g.boatX = null;
  else if (g.boatX !== null) g.boatX = Number.isFinite(g.boatX) ? clamp(g.boatX, BOAT.min, BOAT.max) : null;
  if (['waiting', 'nibble', 'bite'].includes(g.state)) {
    L.x = clamp(L.x, DOCK_X + 10, W - 15);
    L.y = clamp(L.y, SURFACE + 2, bottomAt(L.x) - 6);
  }
  g.fish = g.fish.filter((f) => (Number.isFinite(f.x) && Number.isFinite(f.y)) || f === g.target);
}

/** Advance the whole game. input = { down, pressed }; pressed is consumed. */
export function step(g, input, dt) {
  dt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.05) : 0;
  g.time += dt;
  updateEnvironment(g, dt);
  // the smoker and the crew keep working while menus are open
  for (const name of tickCrew(g.save, dt, g.rng)) toast(g, `${name}'s basket is full. Collect it in the Crew menu.`, 3000);
  for (const item of g.save.smoker) {
    const idx = cookStage(g.clock - item.start).index;
    const seen = g.cookSeen.get(item);
    if (seen !== undefined && idx > seen && idx === COOK_STAGES.length - 1) {
      toast(g, `Your ${byId(item.id).name} is fully cured: worth $${cookValue(item, g.clock)} now.`, 2500);
      sfx(g, 'coin');
    }
    g.cookSeen.set(item, idx);
  }
  if (!g.paused) {
    g.stateTime += dt;
    updateState(g, input, dt);
    updateFish(g, input, dt);
    watchdog(g);
  }
  input.pressed = false;
}
