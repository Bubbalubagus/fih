import { describe, it, expect } from 'vitest';
import { COOK_STAGES, cookStage, cookValue, marketSpecials, hireCrew, tickCrew, collectCrew, nextHireCost, BASKET_MAX, CREW_MAX } from '../src/economy.js';
import { step, cookCatch, sellCooked, sellCatch, setRow, castLanding, anchor, makeFish, BOAT, smokerFull } from '../src/game.js';
import { byId, SPECIES } from '../src/fish.js';
import { defaultSave } from '../src/save.js';
import { mulberry32, W, DOCK_X } from '../src/world.js';
import { newGame, play, smartBot, chaosBot, checkInvariants, DT } from './helpers.js';

/** Land a specific fish through the real fight. */
function landFish(g, id, weight) {
  const i = { down: true, pressed: true };
  step(g, i, DT); for (let t = 0; t < 0.4; t += DT) step(g, i, DT);
  i.down = false; for (let t = 0; t < 3 && g.state !== 'waiting'; t += DT) step(g, i, DT);
  for (const o of g.fish) if (['approach', 'atlure', 'hooked'].includes(o.state)) o.state = 'flee';
  g.target = null; g.state = 'waiting';
  const f = makeFish(g, byId(id), g.lure.x, g.lure.y, weight);
  f.state = 'atlure'; g.target = f; g.state = 'bite'; g.stateTime = 0; g.biteTimer = 1;
  step(g, { down: true, pressed: true }, DT);
  for (let t = 0; t < 120 && g.state === 'reeling'; t += DT) step(g, { down: g.reel.tension < 0.8, pressed: false }, DT);
  expect(g.state).toBe('landed');
  return g.pending;
}

describe('cooking', () => {
  it('value only ever goes up with time, and caps at the last stage', () => {
    const item = { base: 100, start: 0 };
    let prev = 0;
    for (let t = 0; t <= 1000; t += 5) {
      const v = cookValue(item, t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(prev).toBe(Math.round(100 * COOK_STAGES.at(-1).mult));
    expect(cookStage(-50).stage.name).toBe('Raw');
    expect(cookStage(NaN).stage.name).toBe('Raw');
  });

  it('cooking a landed fish and waiting pays more than selling it raw', () => {
    const g = newGame(1);
    const p = landFish(g, 'bass', 3);
    const raw = p.value;
    expect(cookCatch(g)).toBe(true);
    expect(g.state).toBe('idle');
    play(g, () => false, 320);
    const money = g.save.money;
    expect(sellCooked(g, 0)).toBe(Math.round(raw * COOK_STAGES.at(-1).mult));
    expect(g.save.money).toBeGreaterThan(money);
    expect(g.save.smoker.length).toBe(0);
  });

  it('respects the smoker capacity and refuses junk', () => {
    const g = newGame(2);
    for (let i = 0; i < g.save.smokerSlots; i++) { landFish(g, 'perch', 0.5); expect(cookCatch(g)).toBe(true); }
    expect(smokerFull(g)).toBe(true);
    landFish(g, 'perch', 0.5);
    expect(cookCatch(g)).toBe(false);
    expect(g.state).toBe('landed');
    sellCatch(g);
    landFish(g, 'boot', 1);
    expect(cookCatch(g)).toBe(false);
    expect(sellCooked(g, 99)).toBe(0);
  });
});

describe('market specials', () => {
  it('are stable per day, two distinct catchable species, and vary across days', () => {
    const seen = new Set();
    for (let d = 1; d < 30; d++) {
      const s = marketSpecials(d);
      expect(s).toEqual(marketSpecials(d));
      expect(new Set(s).size).toBe(2);
      for (const id of s) expect(['common', 'uncommon']).toContain(byId(id).rarity);
      seen.add(s.join());
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('doubles the sale price of a special fish', () => {
    const g = newGame(3);
    const [id] = marketSpecials(g.cond.day);
    const sp = byId(id);
    const p = landFish(g, id, sp.weight[1]);
    expect(p.special).toBe(true);
    expect(p.value % 2).toBe(0);
  });
});

describe('crew', () => {
  it('hiring costs escalate and stop at the cap', () => {
    const save = { ...defaultSave(), money: 10000 };
    for (let i = 0; i < CREW_MAX; i++) expect(hireCrew(save, mulberry32(i))).not.toBe(null);
    expect(hireCrew(save)).toBe(null);
    expect(nextHireCost(save)).toBe(null);
    expect(new Set(save.crew.map((w) => w.name)).size).toBe(CREW_MAX);
    const poor = defaultSave();
    expect(hireCrew(poor)).toBe(null);
  });

  it('baskets stop filling when full, so idling earns almost nothing', () => {
    const save = { ...defaultSave(), money: 10000 };
    for (let i = 0; i < CREW_MAX; i++) hireCrew(save);
    const rng = mulberry32(5);
    for (let t = 0; t < 36000; t += 1) tickCrew(save, 1, rng); // ten idle hours
    for (const w of save.crew) expect(w.count).toBe(BASKET_MAX);
    const before = save.money;
    expect(collectCrew(save)).toBeLessThan(150);
    expect(save.money).toBeGreaterThan(before);
    expect(collectCrew(save)).toBe(0);
  });

  it('a full crew, collected often, earns far less than actually fishing', () => {
    const save = { ...defaultSave(), money: 10000 };
    for (let i = 0; i < CREW_MAX; i++) hireCrew(save);
    const rng = mulberry32(6);
    let crew = 0;
    for (let t = 0; t < 3600; t += 1) { tickCrew(save, 1, rng); if (t % 300 === 0) crew += collectCrew(save); }
    crew += collectCrew(save);
    const g = newGame(7);
    play(g, smartBot(), 3600);
    const fishing = g.save.money;
    console.log(`one hour: crew of ${CREW_MAX} earned $${crew}, a player with the starter rod earned $${fishing}`);
    expect(crew).toBeGreaterThan(0);
    expect(crew).toBeLessThan(fishing * 0.25);
  });
});

describe('the boat', () => {
  const boatGame = (seed) => newGame(seed, { boat: true });

  it('rowing moves the boat within bounds and back onto the dock', () => {
    const g = boatGame(1);
    setRow(g, 1);
    for (let t = 0; t < 20; t += DT) { step(g, { down: false, pressed: false }, DT); checkInvariants(g); }
    expect(g.boatX).toBe(BOAT.max);
    setRow(g, -1);
    for (let t = 0; t < 20; t += DT) step(g, { down: false, pressed: false }, DT);
    expect(g.boatX).toBe(null);
  });

  it('cannot row without owning a boat, or while a cast is out', () => {
    const g = newGame(2);
    setRow(g, 1);
    for (let t = 0; t < 3; t += DT) step(g, { down: false, pressed: false }, DT);
    expect(g.boatX).toBe(null);
    const b = boatGame(2);
    step(b, { down: true, pressed: true }, DT);
    setRow(b, 1);
    for (let t = 0; t < 3; t += DT) step(b, { down: true, pressed: false }, DT);
    expect(b.boatX).toBe(null);
  });

  it('every cast power from every boat position lands in the water, in front of the angler', () => {
    for (const bx of [null, BOAT.min, 400, 600, BOAT.max]) {
      for (let p = 0; p <= 1.0001; p += 0.1) {
        const g = boatGame(3);
        g.boatX = bx;
        g.state = 'charging'; g.power = p;
        step(g, { down: false, pressed: false }, DT);
        for (let t = 0; t < 5 && g.state === 'flying'; t += DT) step(g, { down: false, pressed: false }, DT);
        expect(g.state).toBe('waiting');
        expect(g.lure.x).toBeGreaterThan(anchor(g).x);
        expect(g.lure.x).toBeLessThan(W - 15);
        expect(Math.abs(g.lure.x - castLanding(g, p))).toBeLessThan(15); // one frame of travel
      }
    }
  });

  it('fish are reeled to the boat, including ones on the dock side of it', () => {
    const g = boatGame(4);
    g.boatX = 600;
    const p = landFish(g, 'bass', 2);
    expect(p.sp.id).toBe('bass');
    const h = boatGame(5);
    h.boatX = BOAT.max;
    h.state = 'charging'; h.power = 0;
    step(h, { down: false, pressed: false }, DT);
    for (let t = 0; t < 5 && h.state === 'flying'; t += DT) step(h, { down: false, pressed: false }, DT);
    for (const o of h.fish) if (['approach', 'atlure', 'hooked'].includes(o.state)) o.state = 'flee';
    h.target = null;
    const f = makeFish(h, byId('perch'), h.lure.x, h.lure.y, 0.5);
    f.state = 'atlure'; h.target = f; h.state = 'bite'; h.biteTimer = 1;
    h.lure.x = 400; h.reel = null;
    step(h, { down: true, pressed: true }, DT);
    for (let t = 0; t < 60 && h.state === 'reeling'; t += DT) step(h, { down: h.reel.tension < 0.8, pressed: false }, DT);
    expect(h.state).toBe('landed');
  });

  it('a chaos player with a boat, a full smoker, and a crew never breaks anything', () => {
    for (let seed = 40; seed < 46; seed++) {
      const g = newGame(seed, { boat: true, money: 5000 });
      for (let i = 0; i < CREW_MAX; i++) hireCrew(g.save, mulberry32(seed + i));
      let cooked = 0;
      play(g, chaosBot(), 900, { onFrame: (gg) => { if (gg.state === 'landed' && cooked++ % 2 === 0) cookCatch(gg); } });
    }
  });

  it('a smart player in a boat still catches plenty', () => {
    const g = boatGame(8);
    g.boatX = 550;
    const stats = play(g, smartBot(), 1800);
    expect(stats.caught).toBeGreaterThan(20);
  });
});
