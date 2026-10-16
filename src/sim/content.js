/** Declarative level, encounters and combat data. Coordinates are metres, +Y up, +Z south. */
export const LEVEL = {
  id: 'hollow-belfry',
  name: 'The Hollow Belfry',
  spawn: [32, 107],
  bounds: { width: 66, depth: 122, tile: 2 },
  regions: [
    { id: 'court', name: 'Kindled Court', x: 32, z: 103, w: 26, d: 28 },
    { id: 'bridge', name: 'The Processional', x: 32, z: 82, w: 8, d: 16 },
    { id: 'nave', name: 'The Broken Nave', x: 32, z: 60, w: 26, d: 32 },
    { id: 'garden', name: 'Mourning Garden', x: 12, z: 73, w: 18, d: 40 },
    { id: 'southlink', name: 'Pilgrim’s Walk', x: 21, z: 94, w: 24, d: 7 },
    { id: 'northlink', name: 'Choir Passage', x: 22, z: 54, w: 22, d: 7 },
    { id: 'threshold', name: 'The Last Threshold', x: 32, z: 42, w: 10, d: 10 },
    { id: 'belfry', name: 'The Hollow Belfry', x: 32, z: 22, r: 19 },
  ],
  obstacles: [
    ...[22, 42].flatMap((x) =>
      [48, 58, 68, 99, 111].map((z) => ({ x, z, w: 1.5, d: 1.5, h: 7, type: 'column' })),
    ),
    { x: 32, z: 62, w: 4, d: 2, h: 1.5, type: 'tomb' },
    { x: 10, z: 72, w: 3, d: 2, h: 1.4, type: 'tomb' },
    { x: 39, z: 103, w: 2.4, d: 2.2, h: 2.1, type: 'rock' },
  ],
};
export const SHRINES = [
  { id: 'kindle', name: 'Kindled Court', x: 29, z: 106 },
  { id: 'choir', name: 'Choir Refuge', x: 22, z: 51 },
];
export const ENEMIES = [
  { id: 'watcher-1', kind: 'hollow', x: 32, z: 95 },
  { id: 'watcher-2', kind: 'hollow', x: 31, z: 78 },
  { id: 'cantor-1', kind: 'cantor', x: 39, z: 69 },
  { id: 'watcher-3', kind: 'hollow', x: 26, z: 66 },
  { id: 'keeper', kind: 'knight', x: 32, z: 52 },
  { id: 'gardener', kind: 'knight', x: 12, z: 66 },
  { id: 'cantor-2', kind: 'cantor', x: 16, z: 85 },
  { id: 'bellkeeper', kind: 'boss', x: 32, z: 18 },
];
export const ARCHETYPES = {
  hollow: {
    name: 'Hushed Pilgrim',
    hp: 78,
    poise: 45,
    speed: 2.1,
    range: 2.25,
    damage: 18,
    windup: 42,
    recovery: 56,
    reward: 35,
    aggro: 10,
  },
  cantor: {
    name: 'Ash Cantor',
    hp: 62,
    poise: 32,
    speed: 1.5,
    range: 12,
    damage: 15,
    windup: 66,
    recovery: 100,
    reward: 45,
    aggro: 14,
  },
  knight: {
    name: 'Vigil Knight',
    hp: 150,
    poise: 80,
    speed: 2,
    range: 2.9,
    damage: 26,
    windup: 48,
    recovery: 64,
    reward: 90,
    aggro: 11,
  },
  boss: {
    name: 'Vesper, the Bellkeeper',
    hp: 680,
    poise: 145,
    speed: 2.4,
    range: 4,
    damage: 29,
    windup: 62,
    recovery: 80,
    reward: 500,
    aggro: 25,
  },
};
export const ITEMS = [
  {
    id: 'verse-court',
    kind: 'verse',
    x: 35,
    z: 88,
    name: 'Verse of Cinders',
    text: 'Every bell remembers the hands that cast it. Find three verses to awaken your Resonance.',
  },
  {
    id: 'verse-nave',
    kind: 'verse',
    x: 38,
    z: 56,
    name: 'Verse of Silence',
    text: 'The choir fell silent. One voice remained beneath the bronze.',
  },
  {
    id: 'verse-garden',
    kind: 'verse',
    x: 7,
    z: 58,
    name: 'Verse of Returning',
    text: 'The dead do not ask to be remembered. They ask us to keep walking.',
  },
  {
    id: 'longsword',
    kind: 'weapon',
    weapon: 'greatsword',
    x: 10,
    z: 62,
    name: 'Choirbreaker',
    text: 'A heavy blade. Slower swings, greater reach and poise damage. Cycle blades with D-pad right / Q.',
  },
  {
    id: 'flask',
    kind: 'flask',
    x: 13,
    z: 89,
    name: 'Amber Phial',
    text: 'An additional healing charge. Refills whenever you rest.',
  },
  {
    id: 'ember-cache',
    kind: 'currency',
    x: 42,
    z: 48,
    name: 'Gathered echoes',
    text: '80 echoes, left by a pilgrim who never returned.',
  },
  {
    id: 'lore-1',
    kind: 'lore',
    x: 25,
    z: 109,
    name: 'A pilgrim’s vow',
    text: '“We rang the bell to keep the dark away. When the bell cracked, we learned the dark had been listening.”',
  },
  {
    id: 'lore-2',
    kind: 'lore',
    x: 6,
    z: 78,
    name: 'The gardener’s prayer',
    text: '“Plant a seed where they fall. Let something gentle inherit this place.”',
  },
];
export const BREAKABLES = [
  { id: 'urn-1', x: 35, z: 99 },
  { id: 'urn-2', x: 35.8, z: 99.4 },
  { id: 'urn-3', x: 23, z: 73 },
  { id: 'urn-4', x: 40, z: 58 },
];
export const NPC = {
  id: 'mara',
  x: 25,
  z: 102,
  name: 'Mara, the Last Listener',
  text: 'You carry a sound this place has forgotten. Follow the amber light to the belfry. The garden holds a blade, and a verse that even Vesper fears. Rest at the choir before you face him.',
};
export const WEAPONS = {
  sword: {
    name: 'Pilgrim’s Edge',
    light: { cost: 16, damage: 25, poise: 21, windup: 10, active: 8, recovery: 18, range: 2.7 },
    heavy: { cost: 30, damage: 58, poise: 58, windup: 32, active: 10, recovery: 30, range: 3.1 },
  },
  greatsword: {
    name: 'Choirbreaker',
    light: { cost: 22, damage: 38, poise: 36, windup: 18, active: 10, recovery: 23, range: 3.2 },
    heavy: { cost: 37, damage: 80, poise: 80, windup: 40, active: 12, recovery: 32, range: 3.7 },
  },
};
export function onGround(x, z, margin = 0) {
  return LEVEL.regions.some((r) =>
    r.r
      ? Math.hypot(x - r.x, z - r.z) < r.r - margin
      : Math.abs(x - r.x) < r.w / 2 - margin && Math.abs(z - r.z) < r.d / 2 - margin,
  );
}
export function regionAt(x, z) {
  return (
    [...LEVEL.regions]
      .reverse()
      .find((r) =>
        r.r ? Math.hypot(x - r.x, z - r.z) < r.r : Math.abs(x - r.x) < r.w / 2 && Math.abs(z - r.z) < r.d / 2,
      )?.name || 'The Pale Below'
  );
}
export const angleTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export const LANDMARKS = {
  fog: { x: 32, z: 40, boundaryZ: 39, entryZ: 36, halfWidth: 8 },
  bell: { x: 32, z: 7 },
  shortcut: { x: 22, z: 94, minX: 19.5, maxX: 25, minZ: 90, maxZ: 98 },
};
