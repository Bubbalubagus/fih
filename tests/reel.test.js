import { describe, it, expect } from 'vitest';
import { createReel, stepReel } from '../src/reel.js';
import { byId } from '../src/fish.js';
import { RODS } from '../src/shop.js';

const calm = () => 0;
const simulate = (r, policy, seconds = 60) => {
  for (let t = 0; t < seconds; t += 1 / 60) {
    const res = stepReel(r, policy(r), 1 / 60, calm);
    if (res) return res;
  }
  return null;
};

describe('reeling', () => {
  it('lands a minnow on the starter rod by holding', () => {
    const r = createReel({ sp: byId('minnow'), weight: 0.05, rod: RODS[0], x: 700, y: 320 });
    expect(simulate(r, () => true)).toBe('caught');
  });

  it('snaps the starter rod when brute-forcing a legend', () => {
    const r = createReel({ sp: byId('gnarlfin'), weight: 150, rod: RODS[0], x: 800, y: 560 });
    expect(simulate(r, () => true)).toBe('snap');
  });

  it('loses the fish to slack when never reeling', () => {
    const r = createReel({ sp: byId('minnow'), weight: 0.05, rod: RODS[0], x: 700, y: 320 });
    expect(simulate(r, () => false)).toBe('escape');
  });

  it('a patient pulse strategy lands a sturgeon on the best rod', () => {
    const r = createReel({ sp: byId('sturgeon'), weight: 30, rod: RODS[3], x: 800, y: 560 });
    expect(simulate(r, (s) => s.tension < 0.85, 120)).toBe('caught');
  });
});
