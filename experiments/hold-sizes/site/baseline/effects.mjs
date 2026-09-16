import { cleanMessage, letterPixel, textDuration } from './lettering.mjs?v=6';
import { gravityColor, gravityPhase } from './gravity.mjs?v=6';
export { gravityPhase };

export const EFFECTS = [
  { id: 'rain', name: 'Make it rain', note: 'Falling green lights with long trails', hue: 125, category: 'new' },
  { id: 'gravity', name: 'Gravity Lab', note: 'Large scrolling letters, then GRAVITY above LAB', hue: 60, category: 'new' },
  { id: 'lasers', name: 'Laser cathedral', note: 'Crossing neon beams sweep the wall', hue: 310, category: 'new' },
  { id: 'warp', name: 'Hyperspace', note: 'Colored streaks moving out from the center', hue: 190, category: 'new' },
  { id: 'fireworks', name: 'Fireworks', note: 'Expanding bursts of color', hue: 25, category: 'new' },
  { id: 'marquee', name: 'Scrolling text', note: 'Your message in large pixel letters', hue: 70, category: 'new' },
  { id: 'vortex', name: 'Rainbow vortex', note: 'A rotating rainbow spiral', hue: 290 },
  { id: 'plasma', name: 'Acid plasma', note: 'Waves of shifting color', hue: 130 },
  { id: 'kaleido', name: 'Kaleidoscope', note: 'Sixfold neon symmetry', hue: 35 },
  { id: 'tunnel', name: 'Cosmic tunnel', note: 'Moving rings of color', hue: 220 },
  { id: 'aurora', name: 'Neon tide', note: 'Slow waves of electric color', hue: 165 },
  { id: 'liquid', name: 'Liquid dream', note: 'Melting rainbow contours', hue: 330 },
];
const TAU = Math.PI * 2;
const fract = x => x - Math.floor(x);
const hash = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const scaled = (rgb, intensity) => rgb.map(v => Math.max(0, Math.min(255, Math.round(v * intensity))));
function rainAt(x, y, t, intensity) {
  const column = Math.floor((x + 1) * 10);
  const speed = 0.28 + hash(column + 8) * 0.38;
  const head = 1.15 - fract(t * speed * 0.3 + hash(column + 17)) * 2.8;
  const behind = y - head;
  const tail = 0.25 + hash(column + 53) * 0.35;
  if (behind < -0.07 || behind > tail) return [0, 0, 0];
  const light = behind < 0.05 ? 1 : Math.max(0, 1 - behind / tail) ** 1.3;
  return scaled(behind < 0.05 ? [145, 255, 165] : [0, 245, 35], light * intensity);
}

function specialColor(id, x, y, time, intensity, options) {
  const point = options.point || { x, y };
  switch (id) {
    case 'rain': return rainAt(x, y, time, intensity);
    case 'gravity': return gravityColor(point,time,intensity);
    case 'marquee': {
      const message = cleanMessage(options.message);
      const pixel = letterPixel(message, point, time % textDuration(message, point.textWidth));
      return pixel ? hsv(pixel.character * .09 + time * .035, .9, intensity) : [0,0,0];
    }
    case 'lasers': {
      let best = 0, color = [0,0,0];
      for (let i = 0; i < 5; i++) {
        const angle = time * (.18 + i * .02) + i * 1.3;
        const distance = Math.abs(x * Math.cos(angle) + y * Math.sin(angle) - Math.sin(time * .35 + i) * .35);
        const light = Math.max(0, 1 - distance / .075) ** .7;
        if (light > best) { best = light; color = hsv(i / 5 + time * .025, .96, intensity * light); }
      }
      return color;
    }
    case 'warp': {
      let best = 0, color = [0,0,0];
      for (let i = 0; i < 28; i++) {
        const a = hash(i + 1) * TAU, phase = fract(time * .16 + hash(i + 41));
        const radius = .04 + phase * phase * 1.7;
        const sx = Math.cos(a) * radius, sy = Math.sin(a) * radius;
        const along = (x-sx)*Math.cos(a)+(y-sy)*Math.sin(a), across = Math.abs((x-sx)*Math.sin(a)-(y-sy)*Math.cos(a));
        const length = .05 + phase * .2;
        const light = along < .04 && along > -length ? Math.max(0,1-across/(.025+phase*.025)) * (1+along/length) : 0;
        if (light > best) {best=light;color=hsv(i*.077+time*.025,.72,intensity*Math.min(1,light));}
      }
      return color;
    }
    case 'fireworks': {
      let best = 0, color = [0,0,0];
      for (let i = 0; i < 4; i++) {
        const cycle = time * .22 + i * .31, age = fract(cycle), seed = Math.floor(cycle)*13+i;
        const cx = (hash(seed+10)-.5)*1.35, cy = (hash(seed+31)-.5)*1.25;
        const dx=x-cx, dy=y-cy+age*age*.22, r=Math.hypot(dx,dy), angle=Math.atan2(dy,dx);
        const ring=Math.max(0,1-Math.abs(r-age*.9)/.08), spokes=Math.max(0,Math.cos(angle*9+seed));
        const light=ring*(.2+.8*spokes)*(1-age);
        if(light>best){best=light;color=hsv(hash(seed),.9,Math.min(1,light*1.8)*intensity);}
      }
      return color;
    }
    default: return null;
  }
}

export function hsv(h, s, v) {
  const h6 = fract(h) * 6, i = Math.floor(h6), f = h6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const rgb = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i % 6];
  return rgb.map(x => Math.max(0, Math.min(255, Math.round(x * 255))));
}

export function colorAt(id, x, y, time, intensity = 1, options = {}) {
  const special = specialColor(id, x, y, time, intensity, options);
  if (special) return special;
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

export const TOUR = ['vortex','rain','plasma','lasers','gravity','kaleido','warp','fireworks','tunnel','aurora','liquid'];
export function makeFrame(points, effect, time, brightness = 1, options = {}) {
  let id = effect, next, mix = 0, sceneTime = time;
  if (effect === 'tour') {
    const scene = time / 32;
    const i = Math.floor(scene) % TOUR.length;
    id = TOUR[i]; next = TOUR[(i + 1) % TOUR.length]; sceneTime = time % 32;
    mix = Math.max(0, (fract(scene) - 0.93) / 0.07);
    mix = mix * mix * (3 - 2 * mix);
  }
  return points.map(p => {
    let rgb = colorAt(id, p.x, p.y, sceneTime, brightness, { ...options, point: p });
    if (mix) {
      const other = colorAt(next, p.x, p.y, 0, brightness, { ...options, point: p });
      rgb = rgb.map((v, i) => Math.round(v * (1 - mix) + other[i] * mix));
    }
    return { position: p.position, rgb };
  });
}

export function mapPoints(board, setIds) {
  const [left, right, bottom, top] = board.bounds;
  const scale = Math.max(right - left, top - bottom) / 2;
  const selected = board.points.filter(p => setIds.includes(p[3]));
  const textPoints = board.family === 'Original' && setIds.includes(1) ? selected.filter(p => p[3] === 1) : selected;
  const columns = [...new Set(textPoints.map(p => p[1]))].sort((a,b)=>a-b);
  const rows = [...new Set(textPoints.map(p => p[2]))].sort((a,b)=>b-a);
  return selected.map(([position, x, y]) => ({
    position, x: (x - (left + right) / 2) / scale, y: (y - (top + bottom) / 2) / scale,
    u: (x - left) / (right - left), v: 1 - (y - bottom) / (top - bottom),
    textX: columns.indexOf(x), textY: rows.indexOf(y), textWidth: columns.length, textHeight: rows.length,
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
