export const WORLD = {
  w: 2400,
  h: 1400
};

// Rechtecke: {x,y,w,h}
export const WALLS = [
  // Außenrand
  {x: 0, y: 0, w: 2400, h: 40},
  {x: 0, y: 1360, w: 2400, h: 40},
  {x: 0, y: 0, w: 40, h: 1400},
  {x: 2360, y: 0, w: 40, h: 1400},

  // Innenwände (einfaches „Labyrinth“)
  {x: 260, y: 180, w: 900, h: 40},
  {x: 260, y: 180, w: 40, h: 520},
  {x: 260, y: 660, w: 560, h: 40},

  {x: 980, y: 360, w: 40, h: 620},
  {x: 980, y: 360, w: 700, h: 40},

  {x: 1380, y: 560, w: 40, h: 520},
  {x: 1180, y: 1040, w: 780, h: 40},

  {x: 520, y: 900, w: 520, h: 40},
  {x: 520, y: 900, w: 40, h: 260},
  {x: 520, y: 1120, w: 420, h: 40},
];

// Tore (werden per State geöffnet)
export const GATES = {
  gate1: {x: 820, y: 660, w: 60, h: 40},
  gate2: {x: 980, y: 720, w: 40, h: 80},
  gate3: {x: 1380, y: 920, w: 40, h: 80},
  gate4: {x: 1180, y: 1040, w: 80, h: 40},
  gate5: {x: 940, y: 1120, w: 80, h: 40},
  gateEnd:{x: 1960, y: 1040, w: 80, h: 40}
};

// Interaktions-Stationen (NPCs / Aufgabenpunkte)
export const NPCS = [
  { id: "npc0", missionId: 0, name: "Hof",       x: 360,  y: 280,  r: 46 },
  { id: "npc1", missionId: 1, name: "Schlesien", x: 700,  y: 560,  r: 46 },
  { id: "npc2", missionId: 2, name: "Sanssouci", x: 1240, y: 460,  r: 46 },
  { id: "npc3", missionId: 3, name: "Krieg",     x: 1600, y: 640,  r: 46 },
  { id: "npc4", missionId: 4, name: "Reformen",  x: 1600, y: 1120, r: 46 },
  { id: "npc5", missionId: 5, name: "Versorgung",x: 2100, y: 1120, r: 46 }
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
