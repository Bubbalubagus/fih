import { describe, it, expect } from 'vitest';
import { SHIRTS, buyShirt, wearShirt, findShirt, shirtColor } from '../src/shop.js';
import { defaultSave, sanitizeSave } from '../src/save.js';
import { newGame, play, smartBot } from './helpers.js';

describe('shirts', () => {
  it('start with the free flannel on', () => {
    const s = defaultSave();
    expect(s.shirt).toBe('flannel');
    expect(findShirt(s.shirt).price).toBe(0);
  });

  it('buying costs money once, then you can swap freely', () => {
    const s = { ...defaultSave(), money: 100 };
    expect(buyShirt(s, 'navy')).toBe(true);
    expect(s.money).toBe(75);
    expect(s.shirt).toBe('navy');
    expect(buyShirt(s, 'navy')).toBe(false);
    expect(s.money).toBe(75);
    expect(wearShirt(s, 'flannel')).toBe(true);
    expect(wearShirt(s, 'navy')).toBe(true);
    expect(s.money).toBe(75);
  });

  it('cannot buy without enough money, buy a fake shirt, or wear one you do not own', () => {
    const s = { ...defaultSave(), money: 10 };
    expect(buyShirt(s, 'tiedye')).toBe(false);
    expect(buyShirt(s, 'tuxedo')).toBe(false);
    expect(wearShirt(s, 'tiedye')).toBe(false);
    expect(s.shirt).toBe('flannel');
    expect(s.money).toBe(10);
  });

  it('a save cannot wear a shirt it does not own', () => {
    expect(sanitizeSave({ shirt: 'tiedye', ownedShirts: ['flannel'] }).shirt).toBe('flannel');
    expect(sanitizeSave({ shirt: 'tiedye', ownedShirts: ['flannel', 'tiedye'] }).shirt).toBe('tiedye');
    expect(sanitizeSave({ ownedShirts: 'everything' }).ownedShirts).toEqual(['flannel']);
  });

  it('every shirt has a valid color at any time, including the tie-dye', () => {
    for (const sh of SHIRTS) for (const t of [0, 1.5, 100, 9999]) expect(shirtColor(sh, t)).toMatch(/^#[0-9a-f]{6}$/);
    expect(shirtColor(findShirt('tiedye'), 0)).not.toBe(shirtColor(findShirt('tiedye'), 3));
  });

  it('shirts are purely cosmetic: the same game plays out the same in any shirt', () => {
    const run = (shirt) => { const g = newGame(77, { shirt, ownedShirts: ['flannel', shirt] }); play(g, smartBot(), 600); return g.save.money; };
    expect(run('tiedye')).toBe(run('flannel'));
  });
});
