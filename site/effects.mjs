export const EFFECTS = [
  { id: 'vortex', name: 'Rainbow vortex', note: 'A spiral with no exit', hue: 290 },
  { id: 'plasma', name: 'Acid plasma', note: 'Liquid color interference', hue: 130 },
  { id: 'kaleido', name: 'Kaleidoscope', note: 'Sixfold neon symmetry', hue: 35 },
  { id: 'tunnel', name: 'Cosmic tunnel', note: 'Falling into the spectrum', hue: 220 },
  { id: 'aurora', name: 'Neon tide', note: 'Slow waves of electric color', hue: 165 },
  { id: 'liquid', name: 'Liquid dream', note: 'Melting rainbow contours', hue: 330 },
];
const TAU = Math.PI * 2;
const fract = x => x - Math.floor(x);

export function hsv(h, s, v) {
  const h6 = fract(h) * 6, i = Math.floor(h6), f = h6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const rgb = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i % 6];
  return rgb.map(x => Math.max(0, Math.min(255, Math.round(x * 255))));
}

export function colorAt(id, x, y, time, intensity = 1) {
  const r = Math.hypot(x, y), a = Math.atan2(y, x);
  let h = 0, v = 1;
  switch (id) {
    case 'vortex':
      h = a / TAU * 2 + r * 1.15 - time * 0.10;
      v = 0.72 + 0.28 * Math.sin(a * 3 - r * 7 + time * 0.9) ** 2;
      break;
    case 'plasma': {
      const p = Math.sin(x * 4 + time * 0.7) + Math.sin(y * 5 - time * 0.55)
        + Math.sin((x + y) * 3 + time * 0.42) + Math.sin(r * 7 - time * 0.8);
      h = p * 0.22 + time * 0.04;
      v = 0.7 + 0.3 * (Math.sin(p * 2) * 0.5 + 0.5);
      break;
    }
    case 'kaleido': {
      const fold = Math.cos(a * 6 + Math.sin(time * 0.13));
      h = fold * 0.33 + r * 0.8 + Math.sin(r * 5 - time * 0.6) * 0.22 + time * 0.04;
      v = 0.65 + 0.35 * Math.sin(fold * 3 + r * 6 - time * 0.7) ** 2;
      break;
    }
    case 'tunnel':
      h = r * 1.8 - time * 0.18 + a / TAU * 0.6;
      v = 0.48 + 0.52 * (0.5 + 0.5 * Math.cos(r * 14 - time * 1.7));
      break;
    case 'aurora': {
      const wave = Math.sin(x * 3 + time * 0.45) * 0.35 + Math.sin(x * 6 - time * 0.24) * 0.12;
      h = y * 0.65 + wave + time * 0.045;
      v = 0.65 + 0.35 * Math.cos((y + wave) * 4 + time * 0.15) ** 2;
      break;
    }
    case 'liquid':
      h = Math.sin(x * 3 + Math.sin(y * 4 + time * 0.4)) * 0.42
        + Math.cos(y * 3 + Math.cos(x * 4 - time * 0.35)) * 0.42 + time * 0.07;
      v = 0.65 + 0.35 * Math.sin(h * TAU) ** 2;
      break;
    default: throw new Error('Unknown effect');
  }
  return hsv(h, 0.96, v * intensity);
}

export function makeFrame(points, effect, time, brightness = 1) {
  let id = effect, next, mix = 0;
  if (effect === 'tour') {
    const scene = time / 24;
    const i = Math.floor(scene) % EFFECTS.length;
    id = EFFECTS[i].id;
    next = EFFECTS[(i + 1) % EFFECTS.length].id;
    mix = Math.max(0, (fract(scene) - 0.85) / 0.15);
    mix = mix * mix * (3 - 2 * mix);
  }
  return points.map(p => {
    let rgb = colorAt(id, p.x, p.y, time, brightness);
    if (mix) {
      const other = colorAt(next, p.x, p.y, time, brightness);
      rgb = rgb.map((v, i) => Math.round(v * (1 - mix) + other[i] * mix));
    }
    return { position: p.position, rgb };
  });
}

export function mapPoints(board, setIds) {
  const [left, right, bottom, top] = board.bounds;
  const scale = Math.max(right - left, top - bottom) / 2;
  return board.points.filter(p => setIds.includes(p[3])).map(([position, x, y]) => ({
    position, x: (x - (left + right) / 2) / scale, y: (y - (top + bottom) / 2) / scale,
    u: (x - left) / (right - left), v: 1 - (y - bottom) / (top - bottom),
  }));
}

export function cornerFrame(points) {
  const used = new Set();
  return [[0,0,[255,0,255]],[1,0,[0,255,255]],[0,1,[255,255,0]],[1,1,[0,255,0]]].map(([x,y,rgb]) => {
    const p = [...points].filter(p => !used.has(p.position)).sort((a,b) =>
      (a.u-x)**2 + (a.v-y)**2 - ((b.u-x)**2 + (b.v-y)**2))[0];
    used.add(p.position);
    return { position: p.position, rgb };
  });
}
