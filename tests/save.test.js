import { describe, it, expect } from 'vitest';
import { loadSave, writeSave, recordCatch, defaultSave } from '../src/save.js';
import { byId } from '../src/fish.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

describe('save', () => {
  it('round-trips through storage', () => {
    const s = memory();
    const data = defaultSave();
    data.money = 123;
    writeSave(data, s);
    expect(loadSave(s).money).toBe(123);
  });

  it('survives corrupt data', () => {
    const s = memory();
    s.setItem('hollow-lake-save-v1', '{nope');
    expect(loadSave(s)).toEqual(defaultSave());
  });

  it('tracks new species and personal bests', () => {
    const data = defaultSave();
    const bass = byId('bass');
    expect(recordCatch(data, bass, 2)).toEqual({ isNew: true, isRecord: false });
    expect(recordCatch(data, bass, 1)).toEqual({ isNew: false, isRecord: false });
    expect(recordCatch(data, bass, 3)).toEqual({ isNew: false, isRecord: true });
    expect(data.journal.bass).toEqual({ count: 3, best: 3 });
  });
});

describe('save repair', () => {
  const garbage = [null, 42, 'hi', [], { money: -50 }, { money: NaN, karma: 99 }, { rod: 'laser', ownedRods: 'all' },
    { rod: 'mythril', ownedRods: ['twig'] }, { journal: { bass: { count: 'x' }, fake: { count: 3, best: 1 } } }, { clock: Infinity }];
  it('turns any garbage into a playable save', () => {
    const s = memory();
    for (const g of garbage) {
      s.setItem('hollow-lake-save-v1', JSON.stringify(g));
      const d = loadSave(s);
      expect(d.money).toBeGreaterThanOrEqual(0);
      expect(d.karma).toBeLessThanOrEqual(10);
      expect(d.ownedRods).toContain(d.rod);
      expect(d.ownedLures).toContain(d.lure);
      expect(Number.isFinite(d.clock)).toBe(true);
      expect(Object.keys(d.journal).every((k) => k !== 'fake')).toBe(true);
    }
  });
  it('cannot equip a rod you do not own', () => {
    const s = memory();
    s.setItem('hollow-lake-save-v1', JSON.stringify({ rod: 'mythril', ownedRods: ['twig'] }));
    expect(loadSave(s).rod).toBe('twig');
  });
});
