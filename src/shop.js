export const RODS = [
  { id: 'twig', name: 'Twig Rod', price: 0, power: 1, reel: 70, depth: 0.45, desc: 'Snapped off a willow. Holds... mostly.' },
  { id: 'bamboo', name: 'Bamboo Rod', price: 75, power: 1.5, reel: 85, depth: 0.65, desc: 'Springy and honest. Reaches mid-water.' },
  { id: 'carbon', name: 'Carbon Pro', price: 300, power: 2.2, reel: 105, depth: 0.85, desc: 'Light, strong, and fast to reel.' },
  { id: 'mythril', name: 'Mythril Leviathan', price: 1200, power: 3.2, reel: 125, depth: 1, desc: 'Forged for the thing in the deep.' },
  { id: 'abyssal', name: 'Abyssal Harpoon Rod', price: 4000, power: 4.4, reel: 140, depth: 1, desc: 'Built for sea monsters. Overkill for anything else.' },
];

export const LURES = [
  { id: 'hook', name: 'Bare Hook', price: 0, attract: 70, luck: 0, desc: 'A hook. That is all.' },
  { id: 'spinner', name: 'Silver Spinner', price: 50, attract: 100, luck: 0.2, desc: 'Flashy. Draws fish from farther away.' },
  { id: 'glow', name: 'Glow Grub', price: 220, attract: 130, luck: 0.45, nightLuck: 0.4, desc: 'Shines in the dark. Big bonus at night.' },
  { id: 'fly', name: 'Golden Fly', price: 750, attract: 170, luck: 0.9, desc: 'Rare fish can\'t resist it.' },
  { id: 'chum', name: 'Chum Bucket', price: 1500, attract: 160, luck: 0.6, bonusTag: 'shark', bonusMult: 4, desc: 'Smells awful. Sharks come from all over.' },
];

export const findItem = (list, id) => list.find((i) => i.id === id) || list[0];

// Cosmetic only: shirts change how the angler looks, never how they fish.
export const SHIRTS = [
  { id: 'flannel', name: 'Brick Red Flannel', price: 0, color: '#c0533a', desc: 'The classic.' },
  { id: 'navy', name: 'Navy Tee', price: 25, color: '#2f4f8f', desc: 'Goes with everything.' },
  { id: 'forest', name: 'Forest Green', price: 25, color: '#3f7a4a', desc: 'Blends in with the reeds.' },
  { id: 'sunshine', name: 'Sunshine Yellow', price: 40, color: '#e8c33a', desc: 'Visible from the far shore.' },
  { id: 'bubblegum', name: 'Bubblegum Pink', price: 40, color: '#f07aa8', desc: 'Bold choice. Respect.' },
  { id: 'purple', name: 'Royal Purple', price: 60, color: '#7a4fc4', desc: 'Fit for lake royalty.' },
  { id: 'midnight', name: 'Midnight Black', price: 60, color: '#23262e', desc: 'Mysterious angler energy.' },
  { id: 'white', name: 'Crisp White', price: 60, color: '#eef0f2', desc: 'Brave, given all the fish.' },
  { id: 'sailor', name: 'Sailor Stripes', price: 150, color: '#f2f2f2', accent: '#2f4f8f', pattern: 'stripes', desc: 'Pairs nicely with a rowboat.' },
  { id: 'camo', name: 'Lake Camo', price: 200, color: '#5d6b3f', accent: '#38442a', pattern: 'spots', desc: 'The fish definitely can\'t see you now.' },
  { id: 'hivis', name: 'Hi-Vis Vest', price: 250, color: '#d8ff3a', accent: '#f2f2f2', pattern: 'band', glow: true, desc: 'Glows after dark.' },
  { id: 'tiedye', name: 'Rainbow Tie-Dye', price: 800, color: '#ff5d8f', pattern: 'rainbow', desc: 'Slowly shifts through every color.' },
];

export const findShirt = (id) => SHIRTS.find((s) => s.id === id) || SHIRTS[0];

export function buyShirt(save, id) {
  const shirt = SHIRTS.find((s) => s.id === id);
  if (!shirt || save.ownedShirts.includes(id) || save.money < shirt.price) return false;
  save.money -= shirt.price;
  save.ownedShirts.push(id);
  save.shirt = id;
  return true;
}

export function wearShirt(save, id) {
  if (!save.ownedShirts.includes(id)) return false;
  save.shirt = id;
  return true;
}

function hslToHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0');
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** The shirt's main color at time t (the tie-dye cycles through hues). */
export const shirtColor = (shirt, t = 0) => (shirt.pattern === 'rainbow' ? hslToHex((t * 40) % 360, 0.75, 0.6) : shirt.color);
