import { W, H, SURFACE, DOCK_X, ROD_TIP, bottomAt, surfaceY, depthOf, noise2D } from './world.js';
import { RARITY } from './fish.js';
import { anchor, BOAT } from './game.js';
import { findShirt, shirtColor } from './shop.js';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const SKY = [
  [0, '#070b1f', '#141a3a'], [0.2, '#0d1333', '#26244f'], [0.27, '#4b5aa8', '#f6a26b'],
  [0.34, '#5aa7e6', '#bfe3ff'], [0.66, '#4f9be0', '#b7dcff'], [0.74, '#3d4c9a', '#f58a5a'],
  [0.8, '#141838', '#3a2a55'], [1, '#070b1f', '#141a3a'],
];
function skyAt(tod) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [a, at, ab] = SKY[i];
    const [b, bt, bb] = SKY[i + 1];
    if (tod >= a && tod <= b) {
      const k = (tod - a) / (b - a);
      return [mix(at, bt, k), mix(ab, bb, k)];
    }
  }
  return [SKY[0][1], SKY[0][2]];
}

const stars = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * (SURFACE - 60), r: Math.random() * 1.3 + 0.3, tw: Math.random() * 6 }));
const hillsFar = Array.from({ length: 49 }, (_, i) => 175 - (noise2D(i * 0.15, 3) + 1) * 30);
const hillsNear = Array.from({ length: 49 }, (_, i) => 215 - (noise2D(i * 0.22, 9) + 1) * 18);
const weeds = Array.from({ length: 34 }, (_, i) => ({ x: DOCK_X + 10 + i * 23 + Math.random() * 12, h: 14 + Math.random() * 30, p: Math.random() * 6 }));
const rocks = Array.from({ length: 14 }, () => ({ x: DOCK_X + Math.random() * (W - DOCK_X), r: 4 + Math.random() * 9 }));

export function drawFishShape(ctx, sp, s, t, silhouette = false) {
  const col = silhouette ? '#1c2733' : sp.color;
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  const wag = Math.sin(t * 9 * sp.speed + s) * 0.3;
  switch (sp.shape) {
    case 'jelly': {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.7, s * 0.6, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const x = -s * 0.5 + i * s * 0.25;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + Math.sin(t * 3 + i) * 4, s * 0.6, x + Math.sin(t * 2 + i) * 6, s * 1.3);
        ctx.stroke();
      }
      return;
    }
    case 'boot':
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s); ctx.lineTo(s * 0.2, -s); ctx.lineTo(s * 0.2, 0);
      ctx.lineTo(s * 0.9, s * 0.15); ctx.lineTo(s * 0.9, s * 0.5); ctx.lineTo(-s * 0.4, s * 0.5);
      ctx.closePath(); ctx.fill();
      return;
    case 'can':
      ctx.fillRect(-s * 0.4, -s * 0.6, s * 0.8, s * 1.2);
      if (!silhouette) { ctx.fillStyle = '#b5523b'; ctx.fillRect(-s * 0.4, -s * 0.2, s * 0.8, s * 0.4); }
      return;
    case 'bottle':
      ctx.globalAlpha *= 0.85;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.7, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(s * 0.6, -s * 0.1, s * 0.5, s * 0.2);
      if (!silhouette) { ctx.fillStyle = '#f0e2c0'; ctx.fillRect(-s * 0.35, -s * 0.12, s * 0.6, s * 0.24); }
      return;
    case 'shark':
    case 'hammer': {
      // crescent tail
      ctx.save();
      ctx.translate(-s * 1.2, 0);
      ctx.rotate(wag * 0.6);
      ctx.beginPath();
      ctx.moveTo(s * 0.05, 0); ctx.lineTo(-s * 0.35, -s * 0.62); ctx.lineTo(-s * 0.16, 0); ctx.lineTo(-s * 0.3, s * 0.36);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      // torpedo body
      ctx.beginPath();
      ctx.moveTo(s * 1.45, s * 0.03);
      ctx.quadraticCurveTo(s * 1.05, -s * 0.36, 0, -s * 0.3);
      ctx.quadraticCurveTo(-s * 0.9, -s * 0.2, -s * 1.25, -s * 0.04);
      ctx.lineTo(-s * 1.25, s * 0.06);
      ctx.quadraticCurveTo(-s * 0.9, s * 0.22, 0, s * 0.28);
      ctx.quadraticCurveTo(s * 1.05, s * 0.28, s * 1.45, s * 0.03);
      ctx.fill();
      // dorsal and pectoral fins
      ctx.beginPath(); ctx.moveTo(s * 0.15, -s * 0.28); ctx.lineTo(-s * 0.2, -s * 0.78); ctx.lineTo(-s * 0.38, -s * 0.24); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.45, s * 0.15); ctx.lineTo(s * 0.0, s * 0.58); ctx.lineTo(-s * 0.05, s * 0.2); ctx.fill();
      if (sp.shape === 'hammer') {
        ctx.beginPath(); ctx.ellipse(s * 1.38, 0, s * 0.11, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (!silhouette) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath(); ctx.ellipse(s * 0.2, s * 0.15, s * 1.0, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = Math.max(1, s * 0.025);
        for (let i = 0; i < 4; i++) { const gx = s * (0.62 + i * 0.06); ctx.beginPath(); ctx.moveTo(gx, -s * 0.12); ctx.lineTo(gx - s * 0.03, s * 0.1); ctx.stroke(); }
        ctx.fillStyle = '#0b0b0b';
        if (sp.shape === 'hammer') {
          ctx.beginPath(); ctx.arc(s * 1.4, -s * 0.32, Math.max(1.2, s * 0.04), 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(s * 1.08, -s * 0.08, Math.max(1.2, s * 0.04), 0, Math.PI * 2); ctx.fill();
          // teeth
          ctx.fillStyle = '#f4f4f4';
          for (let i = 0; i < 5; i++) { const tx = s * (1.05 + i * 0.07); ctx.beginPath(); ctx.moveTo(tx, s * 0.1); ctx.lineTo(tx + s * 0.03, s * 0.16); ctx.lineTo(tx + s * 0.06, s * 0.09); ctx.fill(); }
        }
      }
      return;
    }
    case 'kraken': {
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const off = (i - 3.5) * s * 0.06;
        const w1 = Math.sin(t * 3 + i) * s * 0.25;
        ctx.lineWidth = Math.max(1.5, s * (i % 2 ? 0.07 : 0.1));
        ctx.beginPath();
        ctx.moveTo(-s * 0.15, off);
        ctx.bezierCurveTo(-s * 0.7, off + w1, -s * 1.05, off * 2 - w1, -s * (1.45 + (i % 3) * 0.15), off * 3 + Math.sin(t * 2 + i) * s * 0.3);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, -s * 0.36);
      ctx.quadraticCurveTo(s * 0.75, -s * 0.55, s * 1.1, 0);
      ctx.quadraticCurveTo(s * 0.75, s * 0.55, -s * 0.25, s * 0.36);
      ctx.closePath();
      ctx.fill();
      if (!silhouette) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(s * (0.1 + i * 0.17), -s * 0.12 + (i % 2) * s * 0.18, s * 0.05, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath(); ctx.ellipse(s * 0.05, -s * 0.05, s * 0.13, s * 0.11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.ellipse(s * 0.05, -s * 0.05, s * 0.03, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    case 'serpent': {
      ctx.lineCap = 'round';
      const segs = 16;
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const k = i / segs;
        pts.push({ x: s * 1.1 - k * s * 2.7, y: Math.sin(t * 3 - i * 0.6) * s * 0.2 * (k + 0.2) });
      }
      for (let i = 0; i < segs; i++) {
        ctx.lineWidth = Math.max(1.5, s * 0.3 * (1 - (i / segs) * 0.8));
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke();
        if (i % 2 === 1 && i < segs - 2) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x + s * 0.08, pts[i].y - s * 0.12);
          ctx.lineTo(pts[i].x, pts[i].y - s * 0.3 * (1 - i / segs));
          ctx.lineTo(pts[i].x - s * 0.1, pts[i].y - s * 0.12);
          ctx.fill();
        }
      }
      const hy = pts[0].y;
      ctx.beginPath(); ctx.ellipse(s * 1.2, hy, s * 0.32, s * 0.19, 0, 0, Math.PI * 2); ctx.fill();
      if (!silhouette) {
        ctx.fillStyle = '#ffde59';
        ctx.beginPath(); ctx.arc(s * 1.3, hy - s * 0.06, Math.max(1.3, s * 0.05), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.ellipse(s * 1.2, hy + s * 0.07, s * 0.24, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    case 'chest':
      ctx.fillRect(-s * 0.8, -s * 0.5, s * 1.6, s);
      if (!silhouette) { ctx.fillStyle = '#e8c35a'; ctx.fillRect(-s * 0.8, -s * 0.1, s * 1.6, s * 0.15); ctx.fillRect(-s * 0.1, -s * 0.15, s * 0.2, s * 0.3); }
      return;
  }
  const len = sp.shape === 'eel' ? 1.7 : sp.shape === 'long' ? 1.35 : 1;
  const thick = sp.shape === 'eel' ? 0.18 : sp.shape === 'long' ? 0.3 : 0.45;
  ctx.save();
  ctx.translate(-s * len * 0.85, 0);
  ctx.rotate(wag);
  ctx.beginPath();
  ctx.moveTo(s * 0.1, 0);
  ctx.lineTo(-s * 0.5, -s * Math.max(thick, 0.3) * 0.9);
  ctx.lineTo(-s * 0.38, 0);
  ctx.lineTo(-s * 0.5, s * Math.max(thick, 0.3) * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, s * len, s * thick, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.35 * len, -s * thick * 0.8);
  ctx.quadraticCurveTo(0, -s * thick * 1.8, s * 0.3 * len, -s * thick * 0.85);
  ctx.fill();
  if (!silhouette) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(s * 0.1, s * thick * 0.35, s * len * 0.7, s * thick * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s * len * 0.62, -s * thick * 0.2, Math.max(1.3, s * 0.09), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(s * len * 0.64, -s * thick * 0.2, Math.max(0.7, s * 0.05), 0, Math.PI * 2); ctx.fill();
  }
}

function drawFish(ctx, f, t, nightness) {
  const depth = depthOf(f.y);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.dir, 1);
  let a = (0.9 - depth * 0.5) * f.alpha;
  if (!f.sp.glow) a *= 1 - nightness * 0.55;
  ctx.globalAlpha = Math.max(0, a);
  if (f.sp.glow) { ctx.shadowColor = f.sp.color; ctx.shadowBlur = 12 + nightness * 14; }
  drawFishShape(ctx, f.sp, f.size, t);
  ctx.restore();
  if (RARITY[f.sp.rarity].luck >= 2.5 && f.state !== 'flee' && Math.sin(t * 4 + f.seed) > 0.85) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(f.x + Math.cos(f.seed + t) * f.size, f.y - f.size * 0.6, 2, 2);
  }
}

function drawCloud(ctx, c, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(c.x + i * c.s * 0.35 - c.s * 0.7, c.y - Math.sin(i * 1.3) * c.s * 0.18, c.s * 0.4, c.s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHills(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, SURFACE);
  pts.forEach((y, i) => ctx.lineTo((i / (pts.length - 1)) * W, y));
  ctx.lineTo(W, SURFACE);
  ctx.closePath();
  ctx.fill();
}

export function drawShirt(ctx, shirt, body, t, nightness) {
  ctx.save();
  if (shirt.glow && nightness > 0.3) { ctx.shadowColor = shirt.color; ctx.shadowBlur = 14 * nightness; }
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.roundRect(112, 158, 26, 44, 8); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  const accent = shirt.accent ? mix(shirt.accent, '#1f1c24', nightness * (shirt.glow ? 0.1 : 0.6)) : null;
  if (shirt.pattern === 'stripes') {
    ctx.fillStyle = accent;
    for (let y = 161; y < 202; y += 8) ctx.fillRect(110, y, 30, 4);
  } else if (shirt.pattern === 'spots') {
    ctx.fillStyle = accent;
    for (const [x, y, r] of [[117, 165, 5], [131, 172, 6], [119, 184, 6], [133, 192, 5], [124, 198, 4]]) {
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0.6, 0, Math.PI * 2); ctx.fill();
    }
  } else if (shirt.pattern === 'band') {
    ctx.fillStyle = accent;
    ctx.fillRect(110, 178, 30, 5);
    ctx.fillRect(110, 188, 30, 5);
  } else if (shirt.pattern === 'rainbow') {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = mix(shirtColor(shirt, t + 2 + i * 2), '#1f1c24', nightness * 0.6);
      ctx.beginPath(); ctx.arc(125, 180, 22 - i * 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// The boat and angler are drawn in "dock coordinates" and shifted into place when rowing.
const boatShift = (boatX) => boatX - 168;
const boatBob = (boatX, t) => surfaceY(boatX - 30, t) - SURFACE;

function drawHull(ctx, nightness, lantern) {
  ctx.fillStyle = mix('#8a4b2a', '#2b170d', nightness * 0.7);
  ctx.beginPath();
  ctx.moveTo(66, 196); ctx.lineTo(204, 196);
  ctx.quadraticCurveTo(198, 216, 182, 222); ctx.lineTo(88, 222);
  ctx.quadraticCurveTo(72, 216, 66, 196);
  ctx.fill();
  ctx.fillStyle = mix('#d9b48a', '#3a2a1c', nightness * 0.7);
  ctx.fillRect(64, 193, 142, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(72, 204, 124, 2);
  ctx.strokeStyle = mix('#b08a5a', '#2a1e12', nightness * 0.7);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(100, 196); ctx.lineTo(74, 226); ctx.stroke();
  if (lantern && nightness > 0.3) {
    const lg = ctx.createRadialGradient(198, 184, 2, 198, 184, 70);
    lg.addColorStop(0, `rgba(255,200,110,${0.45 * nightness})`);
    lg.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(128, 114, 140, 140);
  }
  if (lantern) { ctx.fillStyle = nightness > 0.3 ? '#ffd27a' : '#cfa86a'; ctx.fillRect(195, 180, 7, 9); }
}

function drawMooredBoat(ctx, g, t, nightness) {
  if (!g.save.boat || g.boatX !== null) return;
  const x = BOAT.min;
  ctx.save();
  ctx.translate(boatShift(x), 36 + boatBob(x, t));
  drawHull(ctx, nightness, false);
  ctx.restore();
}

function drawFisher(ctx, g, t, nightness) {
  const inBoat = g.boatX !== null;
  ctx.save();
  if (inBoat) ctx.translate(boatShift(g.boatX), 36 + boatBob(g.boatX, t));
  const hand = { x: 150, y: 168 };
  const shirt = findShirt(g.save.shirt);
  // glowing shirts barely darken at night
  const body = mix(shirtColor(shirt, t), '#1f1c24', nightness * (shirt.glow ? 0.1 : 0.6));
  // legs dangling off the dock (hidden inside the hull in the boat)
  if (!inBoat) {
  ctx.strokeStyle = mix('#2f4a6b', '#141c2b', nightness * 0.6);
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  const swing = Math.sin(t * 1.5) * 3;
  ctx.beginPath(); ctx.moveTo(128, 200); ctx.lineTo(146, 204); ctx.lineTo(148 + swing, 228); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(124, 200); ctx.lineTo(138, 206); ctx.lineTo(139 - swing, 230); ctx.stroke();
  }
  // torso
  drawShirt(ctx, shirt, body, t, nightness);
  // arm
  ctx.strokeStyle = body;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(130, 168); ctx.lineTo(hand.x, hand.y); ctx.stroke();
  // head and hat
  ctx.fillStyle = mix('#f1c9a5', '#6b5a50', nightness * 0.6);
  ctx.beginPath(); ctx.arc(126, 146, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = mix('#e4b33c', '#4f4220', nightness * 0.6);
  ctx.beginPath(); ctx.ellipse(126, 138, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(126, 133, 10, 7, 0, Math.PI, 0); ctx.fill();

  // rod, bending under tension
  const bend = g.state === 'reeling' ? g.reel.tension : g.state === 'bite' ? 0.5 : 0;
  const tip = { x: ROD_TIP.x - bend * 10, y: ROD_TIP.y + bend * 34 }; // local coordinates
  ctx.strokeStyle = mix('#5b3a1e', '#2a1b0f', nightness * 0.5);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hand.x - 14, hand.y + 10);
  ctx.quadraticCurveTo(hand.x + 30, ROD_TIP.y - 10 + bend * 25, tip.x, tip.y);
  ctx.stroke();
  if (inBoat) drawHull(ctx, nightness, true);
  ctx.restore();
}

export function rodTip(g, t = g.time) {
  const bend = g.state === 'reeling' ? g.reel.tension : g.state === 'bite' ? 0.5 : 0;
  const a = anchor(g);
  const bob = g.boatX !== null ? boatBob(g.boatX, t) : 0;
  return { x: a.x - bend * 10, y: a.y + bend * 34 + bob };
}

function drawLine(ctx, g, t) {
  const tip = rodTip(g);
  const L = g.lure;
  ctx.lineWidth = 1;
  if (g.state === 'idle' || g.state === 'charging') {
    ctx.strokeStyle = 'rgba(240,240,240,0.7)';
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x, tip.y + 34); ctx.stroke();
    drawBobber(ctx, tip.x, tip.y + 38);
    return;
  }
  if (g.state === 'flying') {
    ctx.strokeStyle = 'rgba(240,240,240,0.7)';
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(L.x, L.y); ctx.stroke();
    drawBobber(ctx, L.x, L.y);
    return;
  }
  if (g.state === 'reeling') {
    const ten = Math.min(1, g.reel.tension);
    ctx.strokeStyle = `rgb(255,${Math.round(255 - ten * 190)},${Math.round(255 - ten * 200)})`;
    ctx.lineWidth = 1 + ten;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    const midX = (tip.x + L.x) / 2, midY = (tip.y + L.y) / 2 + (1 - ten) * 40;
    ctx.quadraticCurveTo(midX, midY, L.x, L.y);
    ctx.stroke();
    return;
  }
  // in the water: rod -> bobber -> hook
  const by = surfaceY(L.x, t) + g.dip;
  ctx.strokeStyle = 'rgba(240,240,240,0.6)';
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
  ctx.quadraticCurveTo((tip.x + L.x) / 2, Math.max(tip.y, by) + 20, L.x, by);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(220,230,240,0.35)';
  ctx.beginPath(); ctx.moveTo(L.x, by); ctx.lineTo(L.x, L.y); ctx.stroke();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(L.x - 2, L.y, 3, 0, Math.PI); ctx.stroke();
  drawBobber(ctx, L.x, by);
}

function drawBobber(ctx, x, y) {
  ctx.fillStyle = '#e8403a';
  ctx.beginPath(); ctx.arc(x, y, 5, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI); ctx.fill();
}

function drawMeter(ctx, x, y, w, h, value, color, label) {
  ctx.fillStyle = 'rgba(8,14,28,0.65)';
  ctx.beginPath(); ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 8); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x, y, Math.max(0, Math.min(1, value)) * w, h, 5); ctx.fill();
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h - 4);
  }
}

function drawReelUI(ctx, g, t) {
  const r = g.reel;
  const x = W / 2 - 160, y = 118, w = 320, h = 18;
  ctx.fillStyle = 'rgba(8,14,28,0.7)';
  ctx.beginPath(); ctx.roundRect(x - 10, y - 30, w + 20, h + 62, 12); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const known = g.save.journal[r.sp.id];
  const label = known ? r.sp.name : r.sp.fight > 3 ? 'SOMETHING MONSTROUS...' : r.sp.fight > 1.5 ? 'Something HUGE...' : r.sp.fight > 0.8 ? 'Something strong...' : '???';
  ctx.fillText(label, W / 2, y - 12);
  // zones
  ctx.fillStyle = '#28354a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(160,170,190,0.35)';
  ctx.fillRect(x, y, w * 0.15, h);
  ctx.fillStyle = 'rgba(255,70,60,0.45)';
  ctx.fillRect(x + w * 0.85, y, w * 0.15, h);
  const ten = Math.min(1, r.tension);
  const shake = r.snap > 0 ? Math.sin(t * 80) * 3 : 0;
  ctx.fillStyle = ten > 0.85 ? '#ff4b3e' : ten < 0.15 ? '#9aa6b8' : '#5fe08a';
  ctx.fillRect(x + shake, y, ten * w, h);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = '#cfd8e3';
  ctx.textAlign = 'left';
  ctx.fillText('SLACK', x, y + h + 14);
  ctx.textAlign = 'right';
  ctx.fillText('SNAP', x + w, y + h + 14);
  ctx.textAlign = 'center';
  ctx.fillStyle = r.burst ? '#ffb84d' : '#cfd8e3';
  ctx.fillText(r.burst ? 'IT\'S THRASHING! EASE OFF!' : 'TENSION', W / 2, y + h + 14);
  ctx.fillStyle = '#28354a';
  ctx.fillRect(x, y + h + 20, w, 4);
  ctx.fillStyle = '#ffb84d';
  ctx.fillRect(x, y + h + 20, w * r.stamina, 4);
}

export function render(ctx, g, t) {
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake * 2, (Math.random() - 0.5) * g.shake * 2);
  drawScene(ctx, g, t);
  ctx.restore();
}

function drawScene(ctx, g, t) {
  const { tod, daylight } = g.cond;
  const nightness = 1 - daylight;
  const storm = g.weather === 'storm' ? 1 : g.weather === 'rain' ? 0.6 : g.weather === 'cloudy' ? 0.35 : 0;
  g.stormVis += (storm - g.stormVis) * 0.01;
  const sv = g.stormVis;

  // sky
  let [top, bottom] = skyAt(tod);
  top = mix(top, '#3b4450', sv * 0.55 * daylight);
  bottom = mix(bottom, '#6b7480', sv * 0.55 * daylight);
  const sky = ctx.createLinearGradient(0, 0, 0, SURFACE);
  sky.addColorStop(0, top);
  sky.addColorStop(1, bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, SURFACE + 10);

  // stars
  const starA = nightness * (1 - sv * 0.8);
  if (starA > 0.02) {
    for (const s of stars) {
      ctx.globalAlpha = starA * (0.5 + 0.5 * Math.sin(t * 2 + s.tw));
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }

  // sun and moon on opposite arcs
  const arc = (p) => ({ x: W * p, y: 230 - Math.sin(Math.PI * p) * 190 });
  if (tod > 0.2 && tod < 0.8) {
    const p = arc((tod - 0.2) / 0.6);
    ctx.globalAlpha = 1 - sv * 0.7;
    const grd = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 60);
    grd.addColorStop(0, 'rgba(255,240,180,0.9)');
    grd.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(p.x - 60, p.y - 60, 120, 120);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    const mt = tod >= 0.8 ? tod - 0.8 : tod + 0.2;
    const p = arc(mt / 0.4);
    ctx.globalAlpha = 1 - sv * 0.7;
    ctx.fillStyle = '#e9edf5';
    ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.arc(p.x + 6, p.y - 4, 13, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // hills
  drawHills(ctx, hillsFar, mix(mix('#5b7f9a', '#141c33', nightness), '#4a525c', sv * 0.4));
  drawHills(ctx, hillsNear, mix(mix('#3e6b4f', '#0d1a1d', nightness), '#363d3a', sv * 0.4));

  // clouds
  const cloudCol = mix(mix('#ffffff', '#59606b', sv), '#1c2236', nightness * 0.8);
  for (const c of g.clouds) { ctx.globalAlpha = c.a; drawCloud(ctx, c, cloudCol); }
  ctx.globalAlpha = 1;

  // water body
  const wTop = mix(mix('#3a8fc4', '#10304d', nightness), '#3d5866', sv * 0.4);
  const wBot = mix('#0b2a4a', '#02060f', nightness);
  const water = ctx.createLinearGradient(0, SURFACE, 0, H);
  water.addColorStop(0, wTop);
  water.addColorStop(1, wBot);
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, surfaceY(x, t));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  // light rays during the day
  if (daylight > 0.1) {
    ctx.save();
    ctx.globalAlpha = daylight * 0.07 * (1 - sv);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) {
      const x = 260 + i * 120 + Math.sin(t * 0.3 + i) * 30;
      ctx.beginPath();
      ctx.moveTo(x, SURFACE); ctx.lineTo(x + 40, SURFACE); ctx.lineTo(x - 30, H); ctx.lineTo(x - 90, H);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // lakebed, rocks, weeds
  ctx.fillStyle = mix('#5a4a32', '#16110b', nightness * 0.8);
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, bottomAt(Math.max(x, DOCK_X - 60)));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mix('#6f675c', '#1a1814', nightness * 0.8);
  for (const r of rocks) { ctx.beginPath(); ctx.ellipse(r.x, bottomAt(r.x) + 2, r.r, r.r * 0.6, 0, Math.PI, 0); ctx.fill(); }
  ctx.strokeStyle = mix('#3f7a3a', '#0f2412', nightness * 0.8);
  ctx.lineWidth = 3;
  for (const w of weeds) {
    const by = bottomAt(w.x);
    const sway = Math.sin(t * 1.2 + w.p) * 6;
    ctx.beginPath(); ctx.moveTo(w.x, by);
    ctx.quadraticCurveTo(w.x + sway, by - w.h * 0.6, w.x + sway * 1.5, by - w.h);
    ctx.stroke();
  }

  // depth marker for the equipped rod's reach
  const reachY = SURFACE + g.rod().depth * (585 - SURFACE);
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(DOCK_X + 20, reachY); ctx.lineTo(W, reachY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('line reach', W - 8, reachY - 4);

  // fish
  for (const f of g.fish) if (!f.sp.glow) drawFish(ctx, f, t, nightness);

  // dock
  ctx.fillStyle = mix('#4a3320', '#1b120b', nightness * 0.7);
  for (const px of [20, 80, 140, 180]) ctx.fillRect(px, 205, 9, 150);
  ctx.fillStyle = mix('#8a6440', '#2e2216', nightness * 0.7);
  ctx.fillRect(0, 200, DOCK_X + 5, 12);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let x = 0; x < DOCK_X; x += 22) ctx.fillRect(x, 200, 2, 12);

  // lantern
  ctx.fillStyle = '#333';
  ctx.fillRect(176, 160, 3, 40);
  if (nightness > 0.3) {
    const flick = 0.85 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.3) * 0.05;
    const lg = ctx.createRadialGradient(178, 160, 2, 178, 160, 110);
    lg.addColorStop(0, `rgba(255,200,110,${0.5 * nightness * flick})`);
    lg.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(68, 50, 220, 220);
  }
  ctx.fillStyle = nightness > 0.3 ? '#ffd27a' : '#cfa86a';
  ctx.fillRect(173, 152, 9, 10);

  drawMooredBoat(ctx, g, t, nightness);
  drawFisher(ctx, g, t, nightness);

  // darkness
  ctx.fillStyle = `rgba(4,8,24,${nightness * 0.35 + sv * 0.12})`;
  ctx.fillRect(0, 0, W, H);

  // glowing fish shine through the dark
  for (const f of g.fish) if (f.sp.glow) drawFish(ctx, f, t, nightness);

  // surface sheen
  ctx.strokeStyle = `rgba(255,255,255,${0.25 - nightness * 0.12})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = DOCK_X - 10; x <= W; x += 8) ctx[x === DOCK_X - 10 ? 'moveTo' : 'lineTo'](x, surfaceY(x, t));
  ctx.stroke();

  drawLine(ctx, g, t);

  // ripples and splashes
  for (const r of g.ripples) {
    ctx.strokeStyle = `rgba(255,255,255,${r.life * 0.6})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(r.x, surfaceY(r.x, t), r.r, r.r * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(220,240,255,0.85)';
  for (const p of g.particles) ctx.fillRect(p.x, p.y, 2, 2);

  // rain
  if (g.rain.length) {
    ctx.strokeStyle = 'rgba(190,210,235,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of g.rain) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 12); }
    ctx.stroke();
  }

  if (g.flash > 0) {
    ctx.fillStyle = `rgba(230,235,255,${g.flash * 0.7})`;
    ctx.fillRect(0, 0, W, H);
  }

  // UI overlays drawn in world space
  if (g.state === 'charging') {
    drawMeter(ctx, 40, 108, 70, 12, g.power, `hsl(${120 - g.power * 120},80%,55%)`);
    ctx.fillStyle = '#fff';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POWER', 75, 100);
  }
  if (g.state === 'bite') {
    const L = g.lure;
    ctx.fillStyle = '#ffdf4d';
    ctx.font = '900 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(L.x, SURFACE - 30);
    ctx.scale(1 + Math.sin(t * 30) * 0.08, 1 + Math.sin(t * 30) * 0.08);
    ctx.fillText('!', 0, 0);
    ctx.restore();
  }
  if (g.state === 'reeling') drawReelUI(ctx, g, t);
}
