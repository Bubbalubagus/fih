export const DAY = 300; // seconds per in-game day

export const RARITY = {
  junk:      { label: 'Junk',      color: '#a39b8b', weight: 10,  luck: -0.5, shy: 1 },
  common:    { label: 'Common',    color: '#cfd8dc', weight: 50,  luck: 0,    shy: 1 },
  uncommon:  { label: 'Uncommon',  color: '#7fdc8a', weight: 22,  luck: 1,    shy: 0.8 },
  rare:      { label: 'Rare',      color: '#5fb4ff', weight: 9,   luck: 2.5,  shy: 0.6 },
  epic:      { label: 'Epic',      color: '#c58cff', weight: 3,   luck: 4,    shy: 0.45 },
  legendary: { label: 'Legendary', color: '#ffb84d', weight: 0.8, luck: 6,    shy: 0.3 },
  mythic:    { label: 'Mythic',    color: '#ff5d8f', weight: 0.3, luck: 8,    shy: 0.25 },
};
export const RARITY_ORDER = ['junk', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

export const SPECIES = [
  { id: 'minnow', name: 'Silver Minnow', rarity: 'common', depth: [0, 0.4], time: 'any', weight: [0.02, 0.1], price: 2, fight: 0.2, speed: 1.4, size: 9, color: '#cfd8dc', flavor: 'Tiny, twitchy, and everywhere. Every angler starts here.' },
  { id: 'bluegill', name: 'Bluegill', rarity: 'common', depth: [0.05, 0.5], time: 'any', weight: [0.1, 0.6], price: 5, fight: 0.3, speed: 1, size: 15, color: '#5c8db8', flavor: 'A scrappy panfish that hits anything shiny.' },
  { id: 'perch', name: 'Yellow Perch', rarity: 'common', depth: [0.1, 0.55], time: 'day', weight: [0.2, 1], price: 8, fight: 0.38, speed: 1, size: 18, color: '#e2c044', flavor: 'Striped like a sunbeam through the reeds.' },
  { id: 'trout', name: 'Rainbow Trout', rarity: 'uncommon', depth: [0.15, 0.6], time: 'day', likes: ['rain'], weight: [0.5, 3], price: 22, fight: 0.6, speed: 1.3, size: 24, color: '#e98aa8', flavor: 'Rises eagerly when rain dimples the surface.' },
  { id: 'bass', name: 'Largemouth Bass', rarity: 'uncommon', depth: [0.25, 0.7], time: 'any', weight: [1, 5], price: 30, fight: 0.75, speed: 1, size: 28, color: '#6b8e4e', flavor: 'All mouth and attitude. Fights like it owes you money.' },
  { id: 'catfish', name: 'Channel Catfish', rarity: 'uncommon', depth: [0.55, 1], time: 'night', weight: [2, 12], price: 35, fight: 0.9, speed: 0.7, size: 32, color: '#7a6a58', flavor: 'Whiskered bottom-prowler that wakes after dark.' },
  { id: 'pike', name: 'Northern Pike', rarity: 'rare', depth: [0.3, 0.8], time: 'day', likes: ['cloudy'], weight: [3, 14], price: 75, fight: 1.2, speed: 1.5, size: 38, shape: 'long', color: '#8aa36b', flavor: 'An ambush torpedo. Loves gray skies.' },
  { id: 'koi', name: 'Ghost Koi', rarity: 'rare', depth: [0, 0.35], time: 'night', glow: true, weight: [1, 6], price: 90, fight: 0.8, speed: 0.8, size: 24, color: '#f4f1ea', flavor: 'Pale as moonlight. Locals say it was someone\'s pet, once.' },
  { id: 'eel', name: 'Moon Eel', rarity: 'rare', depth: [0.6, 1], time: 'night', weight: [1, 4], price: 110, fight: 1.1, speed: 1.2, size: 26, shape: 'eel', color: '#3d5a6c', flavor: 'Slips through the deep like a ribbon of ink.' },
  { id: 'goldcarp', name: 'Golden Carp', rarity: 'epic', depth: [0.2, 0.6], time: 'day', weather: ['clear'], glow: true, weight: [4, 15], price: 260, fight: 1.4, speed: 0.9, size: 32, color: '#f5b82e', flavor: 'Only basks under perfectly clear skies. Said to bring fortune.' },
  { id: 'jelly', name: 'Lantern Jelly', rarity: 'epic', depth: [0.4, 0.9], time: 'night', weather: ['rain', 'storm'], glow: true, weight: [0.5, 2], price: 320, fight: 0.7, speed: 0.5, size: 18, shape: 'jelly', color: '#9be7ff', flavor: 'A freshwater jellyfish that glows when rain drums the lake.' },
  { id: 'sturgeon', name: 'Lake Sturgeon', rarity: 'epic', depth: [0.8, 1], time: 'any', weight: [15, 60], price: 400, fight: 1.9, speed: 0.6, size: 52, shape: 'long', color: '#6d7b86', flavor: 'Armored, ancient, and older than the town.' },
  { id: 'dawnfin', name: 'Dawnfin Spirit', rarity: 'legendary', depth: [0.1, 0.45], time: 'twilight', weather: ['clear', 'cloudy'], glow: true, weight: [20, 40], price: 1800, fight: 2.0, speed: 1.8, size: 46, color: '#ff9e57', flavor: 'Appears only in the hush between night and day.' },
  { id: 'gnarlfin', name: 'Old Gnarlfin', rarity: 'legendary', depth: [0.85, 1], time: 'night', weather: ['storm'], glow: true, weight: [80, 200], price: 2500, fight: 2.6, speed: 0.9, size: 70, color: '#2e4b3c', flavor: 'The lake\'s oldest legend. It only surfaces when lightning splits the sky.' },
  // Sharks and sea monsters. Nobody can explain how they got into a lake.
  { id: 'bullshark', name: 'Bull Shark', rarity: 'epic', tags: ['shark'], depth: [0.35, 0.9], time: 'any', likes: ['rain', 'storm'], weight: [80, 230], price: 550, fight: 1.8, speed: 1.3, size: 44, shape: 'shark', color: '#7d8a96', flavor: 'One of the few sharks that can live in fresh water. Nobody knows how it got here.' },
  { id: 'hammerhead', name: 'Lantern Hammerhead', rarity: 'legendary', tags: ['shark'], depth: [0.5, 1], time: 'night', glow: true, weight: [150, 400], price: 2200, fight: 2.3, speed: 1.2, size: 54, shape: 'hammer', color: '#5fa8a0', flavor: 'Its wide head glows faintly, sweeping the dark like a lighthouse.' },
  { id: 'greatwhite', name: 'Great White', rarity: 'legendary', tags: ['shark'], depth: [0.6, 1], time: 'any', weather: ['rain', 'storm'], weight: [600, 1800], price: 3200, fight: 2.8, speed: 1.4, size: 72, shape: 'shark', color: '#a9b6bf', flavor: 'It should not be here. It definitely should not be this big.' },
  { id: 'megalodon', name: 'Megalodon', rarity: 'mythic', tags: ['shark', 'monster'], depth: [0.88, 1], time: 'any', weather: ['storm'], weight: [20000, 48000], price: 9000, fight: 3.6, speed: 1.1, size: 98, shape: 'shark', color: '#5b6670', flavor: 'Extinct for three million years. Apparently not in Hollow Lake.' },
  { id: 'kraken', name: 'Hollow Kraken', rarity: 'mythic', tags: ['monster'], depth: [0.85, 1], time: 'night', weather: ['rain', 'storm'], glow: true, weight: [900, 3000], price: 7000, fight: 3.3, speed: 0.6, size: 62, shape: 'kraken', color: '#b0466e', flavor: 'Eight arms, one eye, and a very long memory.' },
  { id: 'serpent', name: 'Lake Serpent', rarity: 'mythic', tags: ['monster'], depth: [0.6, 1], time: 'twilight', glow: true, weight: [2000, 6000], price: 8000, fight: 3.1, speed: 1.3, size: 58, shape: 'serpent', color: '#3f7f6a', flavor: 'Blurry photos never did it justice.' },
  // Junk is never seen swimming. It gets snagged when the hook rests on the lakebed.
  { id: 'can', name: 'Rusty Can', rarity: 'junk', junk: true, snag: 40, weight: [0.1, 0.3], price: 0, fight: 0.15, speed: 0.3, size: 12, shape: 'can', color: '#8f9aa1', flavor: 'Somebody\'s lunch, circa 1987.' },
  { id: 'boot', name: 'Old Boot', rarity: 'junk', junk: true, snag: 50, weight: [0.5, 1.5], price: 1, fight: 0.2, speed: 0.3, size: 16, shape: 'boot', color: '#6b4a32', flavor: 'Left foot. The right one is still out there.' },
  { id: 'bottle', name: 'Message in a Bottle', rarity: 'junk', junk: true, snag: 9, weight: [0.3, 0.6], price: 40, fight: 0.2, speed: 0.3, size: 14, shape: 'bottle', color: '#4f9a6b', flavor: '' },
  { id: 'lockbox', name: 'Sunken Lockbox', rarity: 'junk', junk: true, snag: 3, weight: [3, 8], price: 150, fight: 0.6, speed: 0.3, size: 18, shape: 'chest', color: '#7b5230', flavor: 'Heavy, waterlogged, and full of old coins.' },
];

export const BOTTLE_MESSAGES = [
  '"The Gnarlfin is real. I saw it in the storm of \'09. Bring a stronger rod than I did."',
  '"If you are reading this, the Golden Carp only comes out when the sky has no clouds at all."',
  '"Ghost Koi swim near the surface after dark. Don\'t go deep for them."',
  '"Release a few fish. The lake remembers kindness."',
  '"Watch the nibbles. Strike on the real bite, not the tease."',
  '"Dawn and dusk. That is when the spirit swims."',
];

export const byId = (id) => SPECIES.find((s) => s.id === id);

export function conditionsAt(clock) {
  const tod = ((clock % DAY) + DAY) % DAY / DAY; // 0 = midnight
  const day = Math.floor(clock / DAY) + 1;
  let phase = 'day';
  if (tod < 0.22 || tod >= 0.8) phase = 'night';
  else if (tod < 0.32) phase = 'dawn';
  else if (tod >= 0.7) phase = 'dusk';
  const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const daylight = smooth(0.2, 0.32, tod) * (1 - smooth(0.7, 0.82, tod));
  return { tod, day, phase, daylight };
}

export function timeMatches(time, phase) {
  switch (time) {
    case 'day': return phase !== 'night';
    case 'night': return phase !== 'day';
    case 'twilight': return phase === 'dawn' || phase === 'dusk';
    default: return true;
  }
}

export function eligible(sp, { depth, phase, weather }) {
  if (sp.junk) return false;
  if (depth < sp.depth[0] || depth > sp.depth[1]) return false;
  if (!timeMatches(sp.time, phase)) return false;
  if (sp.weather && !sp.weather.includes(weather)) return false;
  return true;
}

export function speciesWeight(sp, { luck = 0, weather, bonusTag = null, bonusMult = 1 } = {}) {
  const r = RARITY[sp.rarity];
  let w = r.weight * Math.max(0.1, 1 + luck * r.luck);
  if (sp.likes && sp.likes.includes(weather)) w *= 2.5;
  if (bonusTag && sp.tags?.includes(bonusTag)) w *= bonusMult;
  return w;
}

function weightedPick(rng, items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function pickSpecies(rng, ctx) {
  const pool = SPECIES.filter((s) => eligible(s, ctx));
  if (!pool.length) return null;
  return weightedPick(rng, pool, (s) => speciesWeight(s, ctx));
}

export function pickJunk(rng, luck = 0) {
  const pool = SPECIES.filter((s) => s.junk);
  return weightedPick(rng, pool, (s) => s.snag * (s.price > 20 ? 1 + luck : 1));
}

/** Weights skew small: trophies are rare. */
export function rollWeight(sp, rng) {
  const [a, b] = sp.weight;
  return +(a + (b - a) * Math.pow(rng(), 2.2)).toFixed(2);
}

export function priceFor(sp, weight) {
  const [a, b] = sp.weight;
  const k = b > a ? (weight - a) / (b - a) : 0;
  return Math.round(sp.price * (0.6 + 0.9 * k));
}

export function describeHabitat(sp) {
  if (sp.junk) return 'Snagged on the lakebed';
  const mid = (sp.depth[0] + sp.depth[1]) / 2;
  const depth = mid < 0.3 ? 'Shallows' : mid < 0.65 ? 'Mid-water' : 'The deep';
  const time = { any: 'any time', day: 'daytime', night: 'at night', twilight: 'dawn & dusk' }[sp.time];
  const weather = sp.weather ? ` · ${sp.weather.join('/')} only` : sp.likes ? ` · loves ${sp.likes.join('/')}` : '';
  return `${depth} · ${time}${weather}`;
}

export const fmtWeight = (w) => (w < 1 ? `${Math.round(w * 1000)} g` : w < 1000 ? `${w.toFixed(2)} kg` : `${(w / 1000).toFixed(2)} t`);

/** How far the mouth sits in front of the body's center, in units of size. */
const BODY_LEN = { eel: 1.7, long: 1.35, shark: 1.45, hammer: 1.5, serpent: 1.45, kraken: 1.1, jelly: 0.6, boot: 0.9, can: 0.5, bottle: 1.1, chest: 0.8 };
export const bodyLen = (sp) => BODY_LEN[sp.shape] ?? 1;
