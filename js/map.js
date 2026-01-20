export const WORLD = { w: 2400, h: 1400 };

// Piraten-Karte: weniger "Labyrinth", mehr "Inselpfade"
export const WALLS = [
  // Rand
  {x: 0, y: 0, w: 2400, h: 40},
  {x: 0, y: 1360, w: 2400, h: 40},
  {x: 0, y: 0, w: 40, h: 1400},
  {x: 2360, y: 0, w: 40, h: 1400},

  // Insel-Felsen / Klippen (ink-style)
  {x: 220, y: 220, w: 920, h: 50},
  {x: 220, y: 220, w: 50, h: 520},
  {x: 220, y: 690, w: 560, h: 50},

  {x: 980, y: 420, w: 50, h: 640},
  {x: 980, y: 420, w: 760, h: 50},

  {x: 1500, y: 640, w: 50, h: 520},
  {x: 1200, y: 1100, w: 820, h: 50},

  {x: 520, y: 940, w: 520, h: 50}
];

export const GATES = {
  gate1: {x: 820, y: 690, w: 60, h: 50},
  gate2: {x: 980, y: 760, w: 50, h: 90},
  gate3: {x: 1500, y: 980, w: 50, h: 90},
  gateEnd:{x: 2020, y: 1100, w: 90, h: 50}
};

export const NPCS = [
  { id: "npc0", missionId: 0, name: "Bauern & Land", x: 360,  y: 320,  r: 54 },
  { id: "npc1", missionId: 1, name: "Justiz",       x: 700,  y: 600,  r: 54 },
  { id: "npc2", missionId: 2, name: "Schule",       x: 1240, y: 540,  r: 54 },
  { id: "npc3", missionId: 3, name: "Kanzlei",      x: 1900, y: 1120, r: 54 }
];

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function circleDist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx*dx + dy*dy);
}
