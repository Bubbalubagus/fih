import { W, SURFACE, DOCK_X, ROD_TIP, bottomAt, clamp } from './world.js';

export const REEL_TARGET = { x: ROD_TIP.x - 6, y: SURFACE + 4 };
export const SNAP_TIME = 0.5;     // seconds over max tension before the line breaks
export const SLACK_TIME = 2.4;    // seconds of slack before the fish spits the hook
export const RUNOUT_TIME = 3;     // seconds a fish can sit at the far edge unreeled
export const FIGHT_LIMIT = 150;   // no fight lasts longer than this

export function createReel({ sp, weight, rod, x, y, seed = Math.random() * 1000, target = REEL_TARGET }) {
  const span = sp.weight[1] - sp.weight[0] || 1;
  const wf = clamp((weight - sp.weight[0]) / span, 0, 1);
  return {
    sp, rod, seed, tx: target.x, ty: target.y,
    x: Number.isFinite(x) ? x : W / 2,
    y: Number.isFinite(y) ? y : SURFACE + 40,
    t: 0, tension: 0.25, snap: 0, slack: 0, runout: 0, stamina: 1,
    pull: 0, burst: false, fightMul: 0.8 + 0.4 * wf,
  };
}

/**
 * Advance the fight by dt seconds. noise(x, y) must return values in [-1, 1].
 * Returns 'caught' | 'snap' | 'escape' | 'runout' | 'timeout' | null.
 */
export function stepReel(r, held, dt, noise) {
  if (!(dt > 0)) return null;
  r.t += dt;
  const n = clamp((noise(r.t * 1.3, r.seed) + 1) / 2, 0, 1);
  r.burst = noise(r.t * 0.35, r.seed + 50) > 0.55;
  // Fish tire as the fight goes on, so every fight with a strong enough rod is winnable.
  const tire = 0.45 + 0.55 * r.stamina;
  const pull = r.sp.fight * r.fightMul * (0.35 + 0.65 * n) * (r.burst ? 1.6 : 1) * tire;
  const eff = pull / r.rod.power;
  r.pull = eff;
  r.stamina = clamp(r.stamina - dt * (0.012 + r.tension * 0.05) + (r.tension < 0.2 ? dt * 0.01 : 0), 0, 1);

  const dx = r.tx - r.x;
  const dy = r.ty - r.y;
  const d = Math.hypot(dx, dy) || 1;
  let target;
  if (held) {
    const speed = r.rod.reel * Math.max(0.15, 1 - eff * 0.75);
    const step = Math.min(d, speed * dt);
    r.x += (dx / d) * step;
    r.y += (dy / d) * step;
    target = 0.3 + eff * 0.85;
  } else {
    // the fish swims away from whoever is reeling: right from the dock, either way from a boat
    const away = r.sp.speed * 45 * Math.min(eff, 1.2);
    r.x += (Math.sign(r.x - r.tx) || 1) * away * dt;
    r.y += away * 0.35 * dt;
    target = eff * 0.3;
  }
  const minX = Math.min(r.tx, DOCK_X + 20);
  r.x = clamp(r.x, minX, W - 15);
  r.y = clamp(r.y, SURFACE + 4, Math.max(SURFACE + 4, bottomAt(r.x) - 6));
  r.tension = clamp(r.tension + (target - r.tension) * Math.min(1, dt * 4), 0, 1.25);

  if (r.tension >= 1) {
    r.snap += dt;
    if (r.snap > SNAP_TIME) return 'snap';
  } else r.snap = Math.max(0, r.snap - dt * 0.5);

  if (r.tension < 0.15) {
    r.slack += dt;
    if (r.slack > SLACK_TIME) return 'escape';
  } else r.slack = Math.max(0, r.slack - dt);

  const atEdge = r.x >= W - 16 || (r.x <= minX + 1 && r.x < r.tx - 12);
  if (!held && atEdge) {
    r.runout += dt;
    if (r.runout > RUNOUT_TIME) return 'runout';
  } else r.runout = Math.max(0, r.runout - dt);

  if (Math.hypot(r.tx - r.x, r.ty - r.y) < 12) return 'caught';
  if (r.t > FIGHT_LIMIT) return 'timeout';
  return null;
}
