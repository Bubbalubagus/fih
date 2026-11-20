import { describe, it, expect } from 'vitest';
import { SPECIES, pickSpecies, pickJunk, rollWeight, priceFor, conditionsAt, eligible, DAY } from '../src/fish.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('species data', () => {
  it('has unique ids and sane ranges', () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    expect(ids.size).toBe(SPECIES.length);
    for (const s of SPECIES) {
      expect(s.weight[0]).toBeLessThan(s.weight[1]);
      if (!s.junk) expect(s.depth[0]).toBeLessThan(s.depth[1]);
    }
  });
});

describe('conditionsAt', () => {
  it('cycles day and night', () => {
    expect(conditionsAt(0).phase).toBe('night');
    expect(conditionsAt(DAY * 0.5).phase).toBe('day');
    expect(conditionsAt(DAY * 0.25).phase).toBe('dawn');
    expect(conditionsAt(DAY * 0.75).phase).toBe('dusk');
    expect(conditionsAt(DAY * 2.5).day).toBe(3);
  });
});

describe('pickSpecies', () => {
  it('only returns eligible fish', () => {
    const ctx = { depth: 0.95, phase: 'night', weather: 'storm', luck: 0 };
    for (let i = 0; i < 200; i++) {
      const sp = pickSpecies(Math.random, ctx);
      expect(eligible(sp, ctx)).toBe(true);
    }
  });

  it('never returns Old Gnarlfin outside a night storm', () => {
    for (const weather of ['clear', 'cloudy', 'rain']) {
      for (let i = 0; i < 300; i++) {
        expect(pickSpecies(Math.random, { depth: 0.95, phase: 'night', weather, luck: 2 })?.id).not.toBe('gnarlfin');
      }
    }
  });

  it('luck makes rare fish more common', () => {
    const count = (luck) => {
      let rare = 0;
      for (let i = 0; i < 4000; i++) {
        const sp = pickSpecies(Math.random, { depth: 0.5, phase: 'day', weather: 'clear', luck });
        if (['rare', 'epic', 'legendary'].includes(sp.rarity)) rare++;
      }
      return rare;
    };
    expect(count(1)).toBeGreaterThan(count(0) * 1.5);
  });

  it('junk is never picked as a swimming fish', () => {
    for (let i = 0; i < 500; i++) expect(pickSpecies(Math.random, { depth: 0.99, phase: 'day', weather: 'clear' }).junk).toBeFalsy();
    expect(pickJunk(seq([0])).junk).toBe(true);
  });
});

describe('weights and prices', () => {
  it('rolls weights within range and prices scale with size', () => {
    const bass = SPECIES.find((s) => s.id === 'bass');
    for (let i = 0; i < 100; i++) {
      const w = rollWeight(bass, Math.random);
      expect(w).toBeGreaterThanOrEqual(bass.weight[0]);
      expect(w).toBeLessThanOrEqual(bass.weight[1]);
    }
    expect(priceFor(bass, bass.weight[1])).toBeGreaterThan(priceFor(bass, bass.weight[0]));
  });
});
