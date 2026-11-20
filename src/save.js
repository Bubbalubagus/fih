import { DAY, SPECIES } from './fish.js';
import { RODS, LURES, SHIRTS } from './shop.js';
import { BASE_SLOTS, SMOKER_UPGRADES, CREW_MAX, BASKET_MAX } from './economy.js';

export const SAVE_KEY = 'hollow-lake-save-v1';

export const defaultSave = () => ({
  version: 1,
  money: 0,
  rod: 'twig',
  lure: 'hook',
  ownedRods: ['twig'],
  ownedLures: ['hook'],
  shirt: 'flannel',
  ownedShirts: ['flannel'],
  journal: {},
  karma: 0,
  totalCaught: 0,
  clock: DAY * 0.3,
  boat: false,
  smokerSlots: BASE_SLOTS,
  smoker: [],
  crew: [],
});

const num = (v, def, min, max) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);

/** Repairs anything a hand-edited or corrupted save could contain. */
export function sanitizeSave(data) {
  const base = defaultSave();
  const d = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const ids = (list, valid, starter) => {
    const out = Array.isArray(list) ? list.filter((id) => valid.some((i) => i.id === id)) : [];
    return [...new Set([starter, ...out])];
  };
  const s = {
    ...base,
    money: Math.floor(num(d.money, 0, 0, 1e9)),
    karma: Math.floor(num(d.karma, 0, 0, 10)),
    totalCaught: Math.floor(num(d.totalCaught, 0, 0, 1e9)),
    clock: num(d.clock, base.clock, 0, 1e9),
    ownedRods: ids(d.ownedRods, RODS, 'twig'),
    ownedLures: ids(d.ownedLures, LURES, 'hook'),
    ownedShirts: ids(d.ownedShirts, SHIRTS, 'flannel'),
    journal: {},
  };
  s.rod = s.ownedRods.includes(d.rod) ? d.rod : 'twig';
  s.lure = s.ownedLures.includes(d.lure) ? d.lure : 'hook';
  s.shirt = s.ownedShirts.includes(d.shirt) ? d.shirt : 'flannel';
  s.boat = d.boat === true;
  const slotChoices = [BASE_SLOTS, ...SMOKER_UPGRADES.map((u) => u.slots)];
  s.smokerSlots = slotChoices.includes(d.smokerSlots) ? d.smokerSlots : BASE_SLOTS;
  s.smoker = (Array.isArray(d.smoker) ? d.smoker : [])
    .filter((i) => i && SPECIES.some((sp) => sp.id === i.id && !sp.junk) && [i.weight, i.base, i.start].every(Number.isFinite))
    .map((i) => ({ id: i.id, weight: i.weight, base: Math.max(0, Math.round(i.base)), start: Math.min(i.start, s.clock) }))
    .slice(0, s.smokerSlots);
  s.crew = (Array.isArray(d.crew) ? d.crew : [])
    .filter((w) => w && typeof w.name === 'string')
    .map((w) => ({
      name: w.name.slice(0, 20),
      timer: num(w.timer, 60, 0, 1000),
      count: Math.floor(num(w.count, 0, 0, BASKET_MAX)),
      value: Math.floor(num(w.value, 0, 0, 1e6)),
      last: typeof w.last === 'string' ? w.last.slice(0, 40) : '',
    }))
    .slice(0, CREW_MAX);
  if (d.journal && typeof d.journal === 'object') {
    for (const sp of SPECIES) {
      const e = d.journal[sp.id];
      if (e && Number.isFinite(e.count) && e.count > 0) s.journal[sp.id] = { count: Math.floor(e.count), best: num(e.best, 0, 0, 1e7) };
    }
  }
  return s;
}

const store = () => { try { return globalThis.localStorage; } catch { return null; } };

export function loadSave(storage = store()) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    return raw ? sanitizeSave(JSON.parse(raw)) : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function writeSave(save, storage = store()) {
  try { storage?.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}

export function clearSave(storage = store()) {
  try { storage?.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}

export function recordCatch(save, sp, weight) {
  const entry = (save.journal[sp.id] ||= { count: 0, best: 0 });
  const isNew = entry.count === 0;
  const isRecord = !isNew && weight > entry.best;
  entry.count += 1;
  entry.best = Math.max(entry.best, weight);
  save.totalCaught += 1;
  return { isNew, isRecord };
}
