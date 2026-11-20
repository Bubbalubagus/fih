import { describe, it, expect } from 'vitest';
import { step, cutLine, sellCatch, releaseCatch, makeFish, resetLure, setWeather, CASTING } from '../src/game.js';
import { SPECIES, byId, eligible, RARITY_ORDER } from '../src/fish.js';
import { RODS } from '../src/shop.js';
import { createReel, stepReel, FIGHT_LIMIT } from '../src/reel.js';
import { mulberry32, SURFACE, yForDepth } from '../src/world.js';
import { createNoise2D } from 'simplex-noise';
import { newGame, play, smartBot, chaosBot, checkInvariants, DT } from './helpers.js';

const press = (g, held = true) => { const i = { down: held, pressed: held }; step(g, i, DT); return i; };
const hold = (g, seconds, down = true) => { const i = { down, pressed: false }; for (let t = 0; t < seconds; t += DT) step(g, i, DT); };

/** Puts a fish right on the hook and walks the game into the bite state. */
function forceBite(g, sp, weight) {
  press(g); hold(g, 0.4); hold(g, 3, false);
  if (g.state !== 'waiting') { cutLine(g); press(g); hold(g, 0.4); hold(g, 3, false); }
  // clear any real fish that was already interested, so the forced one is the only target
  for (const other of g.fish) if (['approach', 'atlure', 'hooked'].includes(other.state)) other.state = 'flee';
  g.target = null;
  g.state = 'waiting';
  const f = makeFish(g, sp, g.lure.x, g.lure.y, weight ?? sp.weight[0]);
  f.state = 'atlure';
  g.target = f;
  g.state = 'bite';
  g.stateTime = 0;
  g.biteTimer = 1;
  return f;
}

describe('bots playing the real game', () => {
  it('a smart player catches fish for an hour with no invariant violations', () => {
    for (const seed of [1, 2, 3]) {
      const g = newGame(seed);
      const stats = play(g, smartBot(), 3600);
      expect(stats.caught).toBeGreaterThan(40);
      expect(stats.recovered).toBe(0);
      expect(g.save.money).toBeGreaterThan(0);
    }
  });

  it('a button-mashing chaos player can never break the game', () => {
    for (let seed = 10; seed < 18; seed++) play(newGame(seed), chaosBot(), 900);
  });

  it('holding the button forever just keeps charging, safely', () => {
    const g = newGame(5);
    play(g, () => true, 600);
    expect(g.state).toBe('charging');
  });

  it('still holding the button after a fight ends starts the next cast (no dead idle)', () => {
    const g = newGame(5);
    const f = forceBite(g, byId('bluegill'));
    press(g);
    cutLine(g);
    expect(g.state).toBe('idle');
    hold(g, 1, true);
    expect(g.state).toBe('charging');
    expect(f.state).toBe('flee');
  });

  it('a player who never presses anything stays idle safely', () => {
    const g = newGame(6);
    play(g, () => false, 600);
    expect(g.state).toBe('idle');
  });

  it('survives wild frame times: zero, negative, NaN, huge', () => {
    const g = newGame(7);
    const input = { down: false, pressed: false };
    for (const dt of [0, -1, NaN, Infinity, 5, 1e9, 0.0001]) { step(g, input, dt); checkInvariants(g); }
    play(g, smartBot(), 120);
  });
});

describe('scripted scenarios', () => {
  it('full happy path: cast, wait, bite, reel, land, sell', () => {
    const g = newGame(1);
    const f = forceBite(g, byId('bluegill'));
    press(g);
    expect(g.state).toBe('reeling');
    expect(f.state).toBe('hooked');
    let first = null;
    const i = { down: false, pressed: false };
    for (let t = 0; t < 30 && g.state !== 'landed'; t += DT) { i.down = g.reel.tension < 0.8; step(g, i, DT); }
    first = g.pending?.sp.id;
    expect(first).toBe('bluegill');
    expect(sellCatch(g)).toBeGreaterThan(0);
    expect(g.save.journal.bluegill.count).toBeGreaterThanOrEqual(1);
  });

  it('striking during a nibble scares the fish and keeps the line in', () => {
    const g = newGame(2);
    const f = forceBite(g, byId('perch'));
    g.state = 'nibble'; g.nibblesLeft = 2; g.nibbleTimer = 1;
    press(g);
    expect(g.state).toBe('waiting');
    expect(f.state).toBe('flee');
    expect(g.target).toBe(null);
  });

  it('missing a bite returns to waiting', () => {
    const g = newGame(3);
    forceBite(g, byId('perch'));
    const i = { down: false, pressed: false };
    while (g.state === 'bite') step(g, i, DT);
    expect(g.state).toBe('waiting');
    expect(g.target).toBe(null);
  });

  it('cut line works from every casting state and mid-fight', () => {
    for (const s of [...CASTING, 'reeling']) {
      const g = newGame(4);
      forceBite(g, byId('bass'));
      if (s === 'reeling') press(g);
      else if (s !== 'bite') { g.state = s; if (s === 'nibble') { g.nibbleTimer = 5; } }
      expect(cutLine(g)).toBe(true);
      expect(g.state).toBe('idle');
      expect(g.target).toBe(null);
      checkInvariants(g);
      play(g, smartBot(), 20);
    }
    const g = newGame(4);
    expect(cutLine(g)).toBe(false);
  });

  it('a fish far too strong for the rod always ends the fight', () => {
    const noise = createNoise2D(mulberry32(3));
    for (const id of ['sturgeon', 'gnarlfin', 'megalodon', 'kraken']) {
      for (const strategy of ['smart', 'never', 'always', 'flicker']) {
        const r = createReel({ sp: byId(id), weight: byId(id).weight[1], rod: RODS[0], x: 900, y: 560, seed: 7 });
        let out = null, t = 0;
        for (; t < FIGHT_LIMIT + 5 && !out; t += DT) {
          const held = strategy === 'smart' ? r.tension < 0.8 && !r.burst : strategy === 'always' ? true : strategy === 'never' ? false : Math.floor(t * 3) % 2 === 0;
          out = stepReel(r, held, DT, noise);
        }
        expect(out, `${id}/${strategy}`).not.toBe(null);
      }
    }
  });

  it('the hook never sinks through the lakebed while reeling in near the dock', () => {
    const g = newGame(8, { rod: 'mythril', ownedRods: ['twig', 'mythril'] });
    const input = { down: true, pressed: true };
    step(g, input, DT);
    for (let t = 0; t < 1; t += DT) step(g, input, DT);
    input.down = false;
    for (let t = 0; t < 12; t += DT) step(g, input, DT);
    input.down = true;
    for (let t = 0; t < 12 && g.state === 'waiting'; t += DT) { step(g, input, DT); checkInvariants(g); }
  });

  it('heals itself when the target fish vanishes mid-fight', () => {
    const g = newGame(9);
    forceBite(g, byId('bass'));
    press(g);
    g.fish = g.fish.filter((f) => f !== g.target);
    hold(g, 0.1);
    expect(g.state).toBe('idle');
  });

  it('heals itself from a corrupted lure position', () => {
    const g = newGame(9);
    forceBite(g, byId('bass'));
    g.lure.x = NaN;
    hold(g, 0.1, false);
    expect(g.state).toBe('idle');
    checkInvariants(g);
  });

  it('sell and release only work on a landed catch, and only once', () => {
    const g = newGame(11);
    expect(sellCatch(g)).toBe(0);
    forceBite(g, byId('trout'), 2);
    press(g);
    play(g, smartBot(), 40, { onFrame: () => {} });
    const g2 = newGame(12);
    forceBite(g2, byId('trout'), 2);
    press(g2);
    for (let i = 0; i < 4000 && g2.state !== 'landed'; i++) { const held = g2.reel && g2.reel.tension < 0.8; step(g2, { down: held, pressed: false }, DT); }
    expect(g2.state).toBe('landed');
    expect(releaseCatch(g2)).toBe(true);
    expect(releaseCatch(g2)).toBe(false);
    expect(g2.save.karma).toBe(1);
    expect(g2.state).toBe('idle');
  });

  it('junk cannot be released for karma', () => {
    const g = newGame(13);
    forceBite(g, byId('boot'), 1);
    press(g);
    for (let i = 0; i < 4000 && g.state !== 'landed'; i++) step(g, { down: true, pressed: false }, DT);
    expect(g.state).toBe('landed');
    expect(releaseCatch(g)).toBe(false);
    expect(g.save.karma).toBe(0);
  });

  it('pausing freezes the cast and resetLure is always safe', () => {
    const g = newGame(14);
    forceBite(g, byId('bass'));
    g.paused = true;
    hold(g, 10, false);
    expect(g.state).toBe('bite');
    g.paused = false;
    for (let i = 0; i < 3; i++) { resetLure(g); checkInvariants(g); }
  });
});

describe('sharks and sea monsters', () => {
  const monsters = SPECIES.filter((s) => s.tags?.includes('shark') || s.tags?.includes('monster'));

  it('includes sharks and mythic monsters', () => {
    expect(monsters.length).toBeGreaterThanOrEqual(6);
    expect(monsters.some((s) => s.rarity === 'mythic')).toBe(true);
  });

  it('every species can actually spawn somewhere the best rod reaches', () => {
    for (const sp of SPECIES.filter((s) => !s.junk)) {
      let ok = false;
      for (const phase of ['day', 'night', 'dawn', 'dusk']) for (const weather of ['clear', 'cloudy', 'rain', 'storm'])
        for (let d = 0; d <= 1; d += 0.05) if (eligible(sp, { depth: d, phase, weather })) ok = true;
      expect(ok, sp.id).toBe(true);
    }
  });

  it('every monster is catchable with the Abyssal rod by a skilled player', () => {
    const rod = RODS.find((r) => r.id === 'abyssal');
    for (const sp of monsters) {
      let wins = 0;
      for (let seed = 0; seed < 12; seed++) {
        const noise = createNoise2D(mulberry32(seed + 100));
        const r = createReel({ sp, weight: sp.weight[1], rod, x: 900, y: 560, seed });
        let out = null;
        for (let t = 0; t < 200 && !out; t += DT) out = stepReel(r, r.tension < 0.8 && !(r.burst && r.tension > 0.5), DT, noise);
        if (out === 'caught') wins++;
      }
      expect(wins, sp.id).toBeGreaterThanOrEqual(6);
    }
  });

  it('mythic monsters are hopeless on the starter rod', () => {
    for (const sp of monsters.filter((s) => s.rarity === 'mythic')) {
      const noise = createNoise2D(mulberry32(1));
      const r = createReel({ sp, weight: sp.weight[1], rod: RODS[0], x: 900, y: 560, seed: 1 });
      let out = null;
      for (let t = 0; t < 200 && !out; t += DT) out = stepReel(r, r.tension < 0.8 && !r.burst, DT, noise);
      expect(out, sp.id).not.toBe('caught');
    }
  });

  it('the chum bucket attracts far more sharks', () => {
    const count = (lure) => {
      const g = newGame(21, { lure, ownedLures: ['hook', lure] });
      setWeather(g, 'storm');
      let sharks = 0;
      play(g, () => false, 1200, { onFrame: (gg) => { for (const f of gg.fish) if (f.sp.tags?.includes('shark') && !f.counted) { f.counted = true; sharks++; } } });
      return sharks;
    };
    expect(count('chum')).toBeGreaterThan(count('fly') * 1.5);
  });

  it('a full monster fight in the real game: hook a Megalodon and land it', () => {
    const g = newGame(31, { rod: 'abyssal', ownedRods: ['twig', 'abyssal'] });
    forceBite(g, byId('megalodon'));
    press(g);
    let landed = false;
    play(g, smartBot(), FIGHT_LIMIT + 5, { onFrame: (gg) => { if (gg.save.journal.megalodon) landed = true; } });
    expect(landed).toBe(true);
    expect(g.save.money).toBeGreaterThan(5000);
  });
});
