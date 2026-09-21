import { DichromacyType } from './filters';

export interface PlateDot {
  x: number;
  y: number;
  r: number;
  figure: boolean;
  tier: number;
}

export interface PlatePalette {
  figure: readonly string[];
  ground: readonly string[];
}

export type GlyphName = '7';

// Each palette is one confusable pair (a figure hue and a ground hue that the named
// deficiency maps to almost the same colour) scaled in linear light by TIER_SCALES.
// Scaling in linear light commutes with the feColorMatrix, so the tonal mottle
// simulates identically in both families and carries no figure-ground information.
// Hue is the only cue left, which is what makes the digit disappear under simulation.
export const PLATE_PALETTES: Record<DichromacyType, PlatePalette> = {
  deuteranopia: {
    figure: ['#c52666', '#e12d75', '#fd3484'],
    ground: ['#238960', '#2a9d6f', '#30b17d'],
  },
  protanopia: {
    figure: ['#b66550', '#d0745d', '#ea8369'],
    ground: ['#0c7c4f', '#108e5c', '#13a068'],
  },
  tritanopia: {
    figure: ['#5e52c1', '#6c5fdd', '#7a6cf8'],
    ground: ['#236523', '#2a742a', '#308330'],
  },
};

type Segment = readonly [number, number, number, number];

interface Glyph {
  strokes: readonly Segment[];
  halfWidth: number;
}

// Glyphs are thick line segments in a normalised unit box rather than a pixel bitmap:
// the capsule test below is exact at any plate size, so the digit edge stays crisp
// however many dots land on it.
const GLYPHS: Record<GlyphName, Glyph> = {
  '7': {
    strokes: [
      [0.27, 0.21, 0.75, 0.21],
      [0.72, 0.24, 0.41, 0.81],
    ],
    halfWidth: 0.072,
  },
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distanceToSegment(px: number, py: number, seg: Segment): number {
  const [ax, ay, bx, by] = seg;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function isInsideGlyph(px: number, py: number, glyph: Glyph): boolean {
  return glyph.strokes.some(seg => distanceToSegment(px, py, seg) <= glyph.halfWidth);
}

// Tier is hashed from the dot's own position, never from the mask, so the tonal
// distribution inside the digit matches the distribution outside it.
function tierFor(x: number, y: number, tierCount: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return Math.floor((h - Math.floor(h)) * tierCount);
}

interface PlateOptions {
  glyph?: GlyphName;
  seed?: number;
  count?: number;
  tierCount?: number;
  /** Multiplies every dot radius, for the coarse plate used as the logo mark. */
  radiusScale?: number;
}

const RADII = [0.0132, 0.0168, 0.0208, 0.0252, 0.0305];
const MAX_ATTEMPTS = 160000;
// Dot size climbs across the attempt budget, so the tight small dots seed the field and
// the larger ones drop into whatever room is left. That is the density a printed plate has.
const RADIUS_EASE = 1;

// Dart-throwing inside the unit circle: sample a candidate, keep it when it clears every
// dot already placed. Same seed always yields the same plate, so the hero and the two
// proof panes show one identical plate and only the filter differs between them.
export function generatePlate(options: PlateOptions = {}): PlateDot[] {
  const { glyph: glyphName = '7', seed = 20260921, count = 600, tierCount = 3, radiusScale = 1 } = options;
  const glyph = GLYPHS[glyphName];
  const random = mulberry32(seed);
  const dots: PlateDot[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS && dots.length < count; attempt++) {
    const progress = attempt / MAX_ATTEMPTS;
    const radius = RADII[Math.min(RADII.length - 1, Math.floor(progress ** RADIUS_EASE * RADII.length))] * radiusScale;
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * (0.5 - radius - 0.004);
    const x = 0.5 + Math.cos(angle) * distance;
    const y = 0.5 + Math.sin(angle) * distance;

    if (dots.some(d => Math.hypot(d.x - x, d.y - y) < d.r + radius + 0.0035)) continue;

    dots.push({ x, y, r: radius, figure: isInsideGlyph(x, y, glyph), tier: tierFor(x, y, tierCount) });
  }

  return dots;
}

export function dotColor(dot: PlateDot, palette: PlatePalette): string {
  const family = dot.figure ? palette.figure : palette.ground;
  return family[dot.tier % family.length];
}
