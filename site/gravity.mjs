import { FONT_5X7 } from './lettering.mjs?v=6';

// Use filled 5x7 glyphs at wall scale; custom scrolling messages stay unchanged.
export const GRAVITY_SCROLL_SECONDS = 20;
export const GRAVITY_STACK_SECONDS = 12;
const MESSAGE = 'GRAVITY LAB';
const CYCLE = GRAVITY_SCROLL_SECONDS + GRAVITY_STACK_SECONDS;
const fract = n => n - Math.floor(n);
const hash = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const scale = (rgb, v) => rgb.map(c => Math.max(0, Math.min(255, Math.round(c * v))));
const blend = (a, b, amount) => a.map((c,i) => Math.round(c + (b[i]-c)*amount));

export function gravityPhase(time) {
  const phase = ((time % CYCLE) + CYCLE) % CYCLE;
  return phase < GRAVITY_SCROLL_SECONDS
    ? { mode:'scroll', time:phase }
    : { mode:'stacked', time:phase-GRAVITY_SCROLL_SECONDS };
}

function layout(text, font, glyphWidth, left, top, cellWidth, cellHeight, color) {
  const width = (text.length * (glyphWidth+1) - 1) * cellWidth;
  const height = font[text[0]].length * cellHeight;
  return { text, font, glyphWidth, left, top, cellWidth, cellHeight, color, width, height };
}

// Sample filled glyph cells, including a small expansion for thicker strokes.
// Geometry is in wall coordinates, so selected screw-ons also fill the letters.
function inkAt(line, u, v, expand = 0) {
  const x = (u-line.left)/line.cellWidth, y = (v-line.top)/line.cellHeight;
  const column = Math.floor(x), row = Math.floor(y);
  for (let py=row-1;py<=row+1;py++) {
    if (py<0 || py>=line.font[line.text[0]].length) continue;
    for (let px=column-1;px<=column+1;px++) {
      if (px<0) continue;
      const character=Math.floor(px/(line.glyphWidth+1)), cell=px%(line.glyphWidth+1);
      if (character>=line.text.length || cell>=line.glyphWidth) continue;
      const glyph=line.font[line.text[character]];
      if (!glyph || glyph[py][cell]!=='1') continue;
      if (x>=px-expand && x<=px+1+expand && y>=py-expand && y<=py+1+expand) {
        return { character, vertical:Math.max(0,Math.min(1,y/glyph.length)) };
      }
    }
  }
  return null;
}

function linesAt(phase) {
  if (phase.mode==='scroll') {
    const cellWidth=.085, cellHeight=.102;
    const width=(MESSAGE.length*6-1)*cellWidth;
    const left=.78-phase.time*(.78+width+.1)/GRAVITY_SCROLL_SECONDS;
    return [layout(MESSAGE,FONT_5X7,5,left,.13,cellWidth,cellHeight,'mixed')];
  }
  return [
    // Seven letters do not fit legibly on 17 handhold columns. Keep readable
    // full-width glyphs scrolling across the upper line, with LAB fixed below.
    layout('GRAVITY',FONT_5X7,5,.78-phase.time*(.78+41*2/36+.1)/GRAVITY_STACK_SECONDS,2.5/39,2/36,2/39,'blue'),
    layout('LAB',FONT_5X7,5,1/36,22.5/39,2/36,2/39,'yellow'),
  ];
}

function faceColor(line, ink, u, phase) {
  if (phase.mode==='stacked' && line.color==='blue') {
    return ink.character%2 ? [150,210,255] : [235,245,255];
  }
  const yellow = line.color==='yellow' || (line.color==='mixed' && ink.character>=8);
  const top = yellow ? [255,255,165] : [225,245,255];
  const bottom = yellow ? [220,245,30] : [75,140,255];
  const face = blend(top,bottom,ink.vertical);
  const sweep = Math.max(0,1-Math.abs(u-fract(phase.time*.16))/.15);
  return blend(face,[255,255,240],sweep*.22);
}

export function gravityColor(point, time, brightness = 1) {
  const u=point.u ?? (point.x+1)/2, v=point.v ?? (1-point.y)/2;
  const phase=gravityPhase(time), lines=linesAt(phase);
  // Keep every letter lit during the pulse; avoid full-wall on/off flashes.
  const pulse=phase.mode==='stacked' ? .82+.18*(.5+.5*Math.sin(phase.time*Math.PI*.8)) : 1;
  for (const line of lines) {
    const face=inkAt(line,u,v,.06);
    if (face) return scale(faceColor(line,face,u,phase),brightness*(phase.mode==='stacked'&&line.color==='blue' ? .95+.05*pulse : pulse));
  }
  for (const line of lines) {
    if (phase.mode==='stacked' && line.color==='blue') continue;
    const edge=inkAt(line,u,v,.15);
    if (edge) return scale(line.color==='yellow' || (line.color==='mixed'&&edge.character>=8) ? [130,175,15] : [55,100,215],brightness*pulse);
  }
  for (const line of lines) {
    if (phase.mode==='stacked' && line.color==='blue') continue;
    if (inkAt(line,u-.015,v-.022,.06)) return scale([0,30,120],brightness*pulse);
  }
  // Twinkles stay outside the line rectangles, never inside letter counters.
  const nearText=lines.some(line=>u>line.left-.025 && u<line.left+line.width+.025 && v>line.top-.035 && v<line.top+line.height+.045);
  const seed=point.position ?? Math.floor(u*997+v*7919);
  if (!nearText && hash(seed+9)>.83) {
    const shimmer=Math.max(0,Math.sin(time*1.7+hash(seed+41)*Math.PI*2))**10;
    if(shimmer>.12) return scale(hash(seed+17)>.5?[190,220,255]:[225,245,60],brightness*shimmer*.8);
  }
  return [0,0,0];
}
