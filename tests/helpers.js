import { createGame, step, sellCatch, setRow, STATES, FISH_COUNT, LIMITS, BOAT } from '../src/game.js';
import { defaultSave } from '../src/save.js';
import { mulberry32, W, SURFACE, DOCK_X, bottomAt } from '../src/world.js';
import { FIGHT_LIMIT } from '../src/reel.js';

export const DT = 1 / 60;

export function newGame(seed = 1, saveOverrides = {}, opts = {}) {
  const rng = mulberry32(seed);
  return createGame({ ...defaultSave(), ...saveOverrides }, { rng, ...opts });
}

/** Throws with a precise description if the game is ever in an impossible state. */
export function checkInvariants(g) {
  const where = `state=${g.state} t=${g.time.toFixed(2)}`;
  const fail = (msg) => { throw new Error(`${msg} (${where})`); };
  if (!STATES.includes(g.state)) fail(`unknown state ${g.state}`);
  const L = g.lure;
  if (![L.x, L.y, L.vx, L.vy].every(Number.isFinite)) fail('lure has non-finite coordinates');
  if (['waiting', 'nibble', 'bite'].includes(g.state)) {
    if (L.x < DOCK_X || L.x > W) fail(`lure x out of lake: ${L.x}`);
    if (L.y < SURFACE - 10 || L.y > bottomAt(L.x)) fail(`lure y out of water: ${L.y}`);
  }
  if (['nibble', 'bite', 'reeling'].includes(g.state)) {
    if (!g.target) fail('no target fish');
    if (!g.fish.includes(g.target)) fail('target fish not in the lake');
  }
  if (g.state === 'reeling' && !g.reel) fail('reeling without a reel');
  if (g.state === 'landed' && !g.pending) fail('landed without a catch');
  if (g.state === 'flying' && g.stateTime > LIMITS.flying + 0.1) fail('lure flying too long');
  if (g.state === 'nibble' && g.stateTime > LIMITS.nibble + 3) fail('nibbling forever');
  if (g.state === 'bite' && g.stateTime > LIMITS.bite + 0.1) fail('bite never resolved');
  if (g.state === 'reeling' && g.stateTime > FIGHT_LIMIT + 1) fail('fight never ended');
  const engaged = g.fish.filter((f) => ['approach', 'atlure', 'hooked'].includes(f.state));
  if (engaged.length > 1) fail(`${engaged.length} fish engaged at once`);
  if (engaged.length === 1 && engaged[0] !== g.target) fail('engaged fish is not the target');
  if (g.fish.length > FISH_COUNT + 2) fail(`too many fish: ${g.fish.length}`);
  for (const f of g.fish) if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) fail(`fish ${f.sp.id} has NaN position`);
  if (!(g.save.money >= 0) || !Number.isInteger(g.save.money)) fail(`bad money ${g.save.money}`);
  if (g.boatX !== null && (!g.save.boat || !(g.boatX >= BOAT.min && g.boatX <= BOAT.max))) fail(`boat out of bounds: ${g.boatX}`);
  if (g.save.smoker.length > g.save.smokerSlots) fail('smoker over capacity');
  if (g.particles.length > 400 || g.ripples.length > 200) fail('particle leak');
}

/**
 * Run the game with a bot. policy(g, rng) returns whether the button is held.
 * Landed catches are sold automatically. Returns stats.
 */
export function play(g, policy, seconds, { rng = mulberry32(99), check = true, onFrame } = {}) {
  const input = { down: false, pressed: false };
  const stats = { caught: 0, lost: {}, states: {}, recovered: 0, species: {} };
  for (let t = 0; t < seconds; t += DT) {
    const want = !!policy(g, rng);
    if (want && !input.down) input.pressed = true;
    input.down = want;
    step(g, input, DT);
    for (const e of g.events) {
      if (e.type === 'landed') { stats.caught++; stats.species[e.sp.id] = (stats.species[e.sp.id] || 0) + 1; }
      if (e.type === 'recovered') stats.recovered++;
      if (e.type === 'toast') stats.lost[e.msg] = (stats.lost[e.msg] || 0) + 1;
    }
    g.events.length = 0;
    stats.states[g.state] = (stats.states[g.state] || 0) + DT;
    if (g.state === 'landed') sellCatch(g);
    if (check) checkInvariants(g);
    onFrame?.(g, input);
  }
  return stats;
}

/** A competent player: casts, waits out nibbles, strikes on bites, pulses the reel. */
export function smartBot() {
  let target = 0.6;
  return (g, rng) => {
    switch (g.state) {
      case 'idle': target = 0.3 + rng() * 0.7; return true;
      case 'charging': return g.power < target || g.powerDir < 0 && g.power > target;
      case 'bite': return g.stateTime > 0.15;
      case 'reeling': return g.reel.tension < 0.8 && !(g.reel.burst && g.reel.tension > 0.5);
      default: return false;
    }
  };
}

/** Mashes and holds the button at random, and rows the boat around at random. */
export function chaosBot() {
  let hold = false;
  return (g, rng) => {
    if (rng() < 0.08) hold = !hold;
    if (rng() < 0.03) setRow(g, Math.floor(rng() * 3) - 1);
    return hold;
  };
}
