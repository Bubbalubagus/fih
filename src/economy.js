// Cooking, market specials, and the hired crew. Pure functions over the save; no DOM.
import { SPECIES, byId, rollWeight, priceFor } from './fish.js';
import { mulberry32 } from './world.js';

// ---------- cooking ----------

/** The longer a fish sits in the smoker, the more it sells for. Times are in game seconds. */
export const COOK_STAGES = [
  { t: 0, name: 'Raw', mult: 1 },
  { t: 30, name: 'Seared', mult: 1.3 },
  { t: 90, name: 'Grilled', mult: 1.7 },
  { t: 180, name: 'Smoked', mult: 2.2 },
  { t: 300, name: 'Cured', mult: 2.8 },
];
export const BASE_SLOTS = 2;
export const SMOKER_UPGRADES = [
  { slots: 3, price: 150 },
  { slots: 4, price: 400 },
  { slots: 6, price: 1000 },
];

export function cookStage(elapsed) {
  const e = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  let i = 0;
  while (i + 1 < COOK_STAGES.length && e >= COOK_STAGES[i + 1].t) i++;
  const stage = COOK_STAGES[i];
  const next = COOK_STAGES[i + 1] || null;
  const progress = next ? (e - stage.t) / (next.t - stage.t) : 1;
  return { index: i, stage, next, progress, done: !next };
}

export const cookValue = (item, clock) => Math.round(item.base * cookStage(clock - item.start).stage.mult);

export const nextSmokerUpgrade = (save) => SMOKER_UPGRADES.find((u) => u.slots > save.smokerSlots) || null;

// ---------- market specials ----------

export const SPECIAL_MULT = 2;
const SPECIAL_POOL = SPECIES.filter((s) => s.rarity === 'common' || s.rarity === 'uncommon').map((s) => s.id);

/** Two species pay double each in-game day. Same answer for the same day, every time. */
export function marketSpecials(day) {
  const rng = mulberry32(Math.floor(day) * 7919 + 13);
  const pool = [...SPECIAL_POOL];
  const out = [];
  while (out.length < 2 && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

// ---------- crew ----------

export const CREW_HIRE_COST = [120, 300, 700];
export const CREW_MAX = CREW_HIRE_COST.length;
export const CREW_INTERVAL = [70, 110]; // game seconds between catches
export const BASKET_MAX = 6;            // an uncollected basket stops filling
const CREW_NAMES = ['Pip', 'Marlow', 'Juniper', 'Old Reed', 'Tansy', 'Wick', 'Bram', 'Ottilie', 'Fenn', 'Sorrel'];
// The crew fish from the shore with cheap gear: only small common fish and junk.
const CREW_CATCH = [['minnow', 40], ['bluegill', 30], ['perch', 20], ['can', 6], ['boot', 4]];

export const nextHireCost = (save) => (save.crew.length < CREW_MAX ? CREW_HIRE_COST[save.crew.length] : null);

export function hireCrew(save, rng = Math.random) {
  const cost = nextHireCost(save);
  if (cost === null || save.money < cost) return null;
  save.money -= cost;
  const used = new Set(save.crew.map((c) => c.name));
  const free = CREW_NAMES.filter((n) => !used.has(n));
  const name = free[Math.floor(rng() * free.length)] || `Hand ${save.crew.length + 1}`;
  const w = { name, timer: CREW_INTERVAL[0], count: 0, value: 0, last: '' };
  save.crew.push(w);
  return w;
}

function crewCatch(rng) {
  const total = CREW_CATCH.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [id, w] of CREW_CATCH) { r -= w; if (r <= 0) return byId(id); }
  return byId('minnow');
}

/** Advance every worker. Returns the names of workers whose basket just filled up. */
export function tickCrew(save, dt, rng = Math.random) {
  const filled = [];
  for (const w of save.crew) {
    if (w.count >= BASKET_MAX) continue;
    w.timer -= dt;
    if (w.timer > 0) continue;
    w.timer = CREW_INTERVAL[0] + rng() * (CREW_INTERVAL[1] - CREW_INTERVAL[0]);
    const sp = crewCatch(rng);
    w.count += 1;
    w.value += priceFor(sp, rollWeight(sp, rng));
    w.last = sp.name;
    if (w.count >= BASKET_MAX) filled.push(w.name);
  }
  return filled;
}

export function collectCrew(save) {
  let total = 0;
  for (const w of save.crew) {
    total += w.value;
    w.value = 0;
    w.count = 0;
  }
  save.money += total;
  return total;
}
