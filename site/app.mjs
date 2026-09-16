import { ADVERTISING, UART, TX, apiFromName, BoardTransport, BoardPlayer, quantize } from './protocol.mjs?v=3';
import { EFFECTS, makeFrame, mapPoints, cornerFrame, colorAt, gravityPhase } from './effects.mjs?v=6';
import { connectionSupport } from './compatibility.mjs?v=4';

const $ = id => document.getElementById(id);
const canvas = $('board'), ctx = canvas.getContext('2d');
const support = connectionSupport({ userAgent:navigator.userAgent, platform:navigator.platform, maxTouchPoints:navigator.maxTouchPoints, bluetooth:Boolean(navigator.bluetooth), secure:isSecureContext });
let boards = [], board, points = [], effect = 'tour';
let time = 5, lastTime = performance.now(), previewing = false;
let device = null, transport = null, player = null, wakeLock = null;
let busy = false, testing = false, lastSent = null, testFrame = null;
let writes = 0, startedAt = 0, sendRate = 0;
let stopPending = null, actionId = 0, viewCleared = false, pendingChangeAt = null;
let lastChangeMs = null, needsRender = true;
const saved = (() => { try { return JSON.parse(localStorage.getItem('rave-board') || localStorage.getItem('kilter-trip') || '{}'); } catch { return {}; } })();

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function isConnected() { return Boolean(device?.gatt?.connected && transport && !transport.closed); }
function isRunning() { return Boolean(player?.running); }
function updateControls() {
  needsRender = true;
  const connected = isConnected(), running = isRunning();
  $('connect').disabled = !board || busy || connected || !support.canConnect || points.length < 4;
  $('connect').textContent = connected ? 'Board connected' : busy ? 'Working...' : 'Connect board';
  $('test').disabled = !connected || running || busy;
  $('play').disabled = !connected || running || busy;
  $('stop').disabled = (!connected && !previewing) || Boolean(stopPending);
  $('disconnect').hidden = !connected;
  $('disconnect').disabled = false;
  for (const id of ['layout','size','protocol','pacing']) $(id).disabled = connected || busy || !board;
  for (const input of $('sets').querySelectorAll('input')) input.disabled = connected || busy;
  $('connection-badge').textContent = connected ? running ? 'Playing' : 'Connected' : 'Preview only';
  $('connection-badge').classList.toggle('live', connected);
  $('preview-label').textContent = stopPending ? 'Stopping' : viewCleared ? 'Stopped' : running ? 'Last frame sent' : testing ? 'Corner test' : 'Preview';
  $('preview').textContent = previewing ? 'Pause preview' : 'Preview';
  $('preview').disabled = running || busy || !board;
}
function save() {
  try { localStorage.setItem('rave-board', JSON.stringify({ boardId: board.id, sets: selectedSets() })); } catch {}
}
function selectedSets() { return [...$('sets').querySelectorAll('input:checked')].map(el => Number(el.value)); }
function updatePoints() {
  points = mapPoints(board, selectedSets());
  $('led-count').textContent = `${points.length} holds`;
  $('board-summary').textContent = `${board.family}, ${board.name}`;
  if (points.length < 4) status('Select at least one installed hold set.');
  else status(support.canConnect ? 'Preview an effect, or connect when you’re at the wall.' : 'Preview ready. Pick an effect to begin.');
  updateControls(); save();
}
function chooseBoard(id, initial = false) {
  board = boards.find(b => b.id === Number(id));
  const sets = initial && Array.isArray(saved.sets) ? saved.sets : board.sets.map(s => s.id);
  $('sets').innerHTML = '<legend>Installed hold sets</legend>';
  for (const set of board.sets) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox'; input.value = set.id; input.checked = sets.includes(set.id);
    input.addEventListener('change', updatePoints);
    label.append(input, document.createTextNode(set.name)); $('sets').append(label);
  }
  testing = false; testFrame = null; lastSent = null;
  updatePoints();
}
function chooseFamily(family, id, initial = false) {
  $('size').replaceChildren();
  for (const b of boards.filter(b => b.family === family)) {
    const name = b.family === 'Original' ? b.name : `${b.name}, ${b.description.replace(' LED Kit','')}`;
    $('size').append(new Option(name, b.id));
  }
  if (boards.some(b => b.family === family && b.id === Number(id))) $('size').value = id;
  chooseBoard($('size').value, initial);
}

function pickEffect(id) {
  effect = id; testing = false; testFrame = null; viewCleared = false;
  time = id === 'marquee' ? 4 : 0;
  if (!isRunning()) previewing = true;
  $('effect-title').textContent = id === 'tour' ? 'Cycle effects' : EFFECTS.find(e => e.id === id).name;
  $('message-controls').hidden = id !== 'marquee';
  $('effect-note').textContent = id === 'tour' ? 'Plays the built-in effects in sequence.' : EFFECTS.find(e => e.id === id).note;
  for (const el of document.querySelectorAll('[data-effect],#tour')) {
    const active = (el.dataset.effect || 'tour') === id;
    el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active));
  }
  requestUpdate();
  updateControls();
}
function requestUpdate() {
  needsRender = true;
  if (!isRunning()) return;
  pendingChangeAt = performance.now(); lastChangeMs = null;
  player.refresh();
  status('Applying your latest change...');
}
for (const e of EFFECTS) {
  const button = document.createElement('button');
  button.className = 'effect'; button.dataset.effect = e.id;
  button.title = e.note; button.setAttribute('aria-pressed', 'false');
  const tile = document.createElement('canvas'); tile.width = 180; tile.height = 80; tile.setAttribute('aria-hidden','true');
  const t = tile.getContext('2d');
  for (let y = 0; y < 80; y += 4) for (let x = 0; x < 180; x += 4) {
    const c = colorAt(e.id, (x / 180 - 0.5) * 2, (0.5 - y / 80) * (e.id === 'gravity' ? 2 : 1.5), e.id === 'gravity' ? 24 : 4, 0.95);
    t.fillStyle = `rgb(${c.join(',')})`; t.fillRect(x, y, 3, 3);
  }
  const title = document.createElement('strong'); title.textContent = e.name;
  button.append(tile, title);
  button.addEventListener('click', () => pickEffect(e.id));
  $('effects').append(button);
}
$('tour').addEventListener('click', () => pickEffect('tour'));
$('layout').addEventListener('change', () => chooseFamily($('layout').value));
$('size').addEventListener('change', () => chooseBoard($('size').value));
$('speed').addEventListener('input', () => { $('speed-value').textContent = Number($('speed').value).toFixed(2).replace(/0$/,'') + '×'; requestUpdate(); });
$('brightness').addEventListener('input', () => { $('brightness-value').textContent = $('brightness').value + '%'; requestUpdate(); });
$('fps').addEventListener('change', requestUpdate);
$('message').addEventListener('input', () => { if (!isRunning()) previewing = true; viewCleared = false; requestUpdate(); updateControls(); });
$('preview').addEventListener('click', () => { previewing = !previewing; testing = false; viewCleared = false; updateControls(); });

function currentFrame() { return makeFrame(points, effect, time, Number($('brightness').value) / 100, { message: $('message').value }); }
function render(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.15); lastTime = now;
  if (previewing || isRunning()) time += dt * Number($('speed').value);
  if (effect === 'gravity') {
    $('effect-note').textContent = gravityPhase(time).mode === 'scroll'
      ? 'Large scrolling letters. The two-line display follows.' : 'GRAVITY scrolls above LAB, with a slow pulse.';
  }
  if (board) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
      needsRender = true;
    }
    const movingPreview = previewing && !isRunning() && !testing && !viewCleared;
    if (!needsRender && !movingPreview) { requestAnimationFrame(render); return; }
    needsRender = false;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    const [l,r,b,t] = board.bounds, aspect = (r-l)/(t-b);
    const bh = Math.min(h-28, (w-28)/aspect), bw = bh*aspect, ox = (w-bw)/2, oy = (h-bh)/2;
    ctx.strokeStyle='#ffffff0b'; ctx.lineWidth=1;
    ctx.strokeRect(ox-6,oy-6,bw+12,bh+12);
    const frame = viewCleared ? [] : testing && testFrame ? testFrame : isRunning() && lastSent ? lastSent : currentFrame();
    const colors = new Map(frame.map(p => [p.position, quantize(p.rgb, transport?.level || 3)]));
    const radius = Math.max(2.2, Math.min(6, bw / 75));
    for (const p of points) {
      const rgb = colors.get(p.position) || [0,0,0], lit = rgb.some(v => v > 0);
      const color = lit ? `rgb(${rgb.join(',')})` : '#201b2d';
      const x=ox+p.u*bw,y=oy+p.v*bh;
      ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=lit ? radius*3.5 : 0;
      ctx.beginPath();ctx.arc(x,y,lit ? radius : radius*.4,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      if (lit) {ctx.fillStyle='#ffffff80';ctx.beginPath();ctx.arc(x,y,radius*.35,0,Math.PI*2);ctx.fill();}
    }
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

async function keepAwake() {
  try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch {}
  try { navigator.bluetooth?.setScreenDimEnabled?.(false); } catch {}
}
async function releaseAwake() {
  try { await wakeLock?.release(); } catch {}
  wakeLock = null;
  try { navigator.bluetooth?.setScreenDimEnabled?.(true); } catch {}
}
function lostConnection(event) {
  if (event?.target && event.target !== device) return;
  actionId++; stopPending = null; pendingChangeAt = null;
  player?.abandon(); transport?.close();
  testing = false; previewing = false; busy = false;
  releaseAwake(); updateControls();
  status('Bluetooth disconnected. The last frame may still be lit. Reconnect here or use the Kilter app to replace it.', true);
}
function failed(error) {
  actionId++; stopPending = null; pendingChangeAt = null; busy = false;
  player?.abandon(); transport?.close();
  if (device?.gatt?.connected) device.gatt.disconnect();
  testing = false; previewing = false;
  releaseAwake(); updateControls();
  status(`${error.message} The lights may retain their last frame. Reconnect or use the Kilter app.`, true);
}

$('connect').addEventListener('click', async () => {
  if (!support.canConnect) return;
  actionId++;
  busy = true; updateControls();
  status('Select your gym’s Kilter Board in the Bluetooth picker.');
  let candidate;
  try {
    // Must run in this click handler to retain the browser's user gesture.
    candidate = await navigator.bluetooth.requestDevice({
      filters: [{services:[ADVERTISING]}, {namePrefix:'Kilter'}, {namePrefix:'kilter'}, {services:[UART]}],
      optionalServices:[UART],
    });
    const level = $('protocol').value === 'auto' ? apiFromName(candidate.name || '') : Number($('protocol').value);
    const server = await candidate.gatt.connect();
    const service = await server.getPrimaryService(UART);
    const characteristic = await service.getCharacteristic(TX);
    device = candidate;
    device.addEventListener('gattserverdisconnected', lostConnection);
    const connectionFailed = error => { if (device === candidate) failed(error); };
    transport = new BoardTransport(characteristic, level, connectionFailed, Number($('pacing').value));
    player = new BoardPlayer(transport, currentFrame, frame => {
      if (device !== candidate) return;
      lastSent = frame; writes++; needsRender = true;
      sendRate = writes / ((performance.now()-startedAt)/1000);
      if (pendingChangeAt !== null) lastChangeMs = Math.round(performance.now() - pendingChangeAt);
      const change = lastChangeMs === null ? '' : ` Change sent in ${lastChangeMs} ms.`;
      pendingChangeAt = null;
      status(`Playing. ${sendRate.toFixed(1)} frames/sec sent.${change}`);
    }, connectionFailed, () => Number($('fps').value));
    status(`Connected to ${candidate.name || 'board'}. Test corners to check the layout, then select Play on board.`);
  } catch (error) {
    candidate?.gatt?.disconnect();
    status(error.name === 'NotFoundError' ? 'No board selected. Stand near it, release the connection in the Kilter app, then try again.'
      : `Could not connect: ${error.message}`, true);
  } finally { busy = false; updateControls(); }
});

$('test').addEventListener('click', async () => {
  const request = ++actionId;
  busy = true; updateControls();
  try {
    testFrame = cornerFrame(points);
    const bytes = await transport.send(testFrame);
    if (request !== actionId || bytes === null) return;
    testing = true; previewing = false; viewCleared = false;
    status('Corners: pink at top left, cyan at top right, yellow at bottom left, green at bottom right. If wrong, clear and check the board size.');
  } catch (error) { if (request === actionId) failed(error); }
  finally { if (request === actionId) { busy = false; updateControls(); } }
});
$('play').addEventListener('click', () => {
  actionId++; viewCleared = false; pendingChangeAt = null; lastChangeMs = null;
  testing = false; previewing = false; lastSent = null; writes = 0; startedAt = performance.now();
  player.start(); keepAwake(); updateControls();
  status('Sending the first frame...');
});
function stopShow(message = 'Stopped.') {
  if (stopPending) return stopPending;
  previewing = false; testing = false; viewCleared = true; pendingChangeAt = null;
  if (!isConnected()) { status('Preview stopped.'); updateControls(); return Promise.resolve(); }
  const request = ++actionId, start = performance.now();
  busy = true;
  status('Stopping... Use Disconnect now if the connection stalls.');
  stopPending = player.stop().then(() => {
    if (request !== actionId) return;
    lastSent = null;
    status(`${message} Clear command sent in ${Math.round(performance.now() - start)} ms. This measures sending, not confirmation from the LEDs.`);
  }).catch(error => { if (request === actionId) failed(error); }).finally(() => {
    if (request !== actionId) return;
    busy = false; stopPending = null; releaseAwake(); updateControls();
  });
  updateControls();
  return stopPending;
}
$('stop').addEventListener('click', () => stopShow());
$('disconnect').addEventListener('click', () => {
  const departing = device;
  actionId++; stopPending = null; pendingChangeAt = null;
  busy = false; previewing = false; testing = false;
  player?.abandon(); transport?.close();
  departing?.removeEventListener('gattserverdisconnected', lostConnection);
  departing?.gatt?.disconnect();
  device = null; transport = null; player = null;
  releaseAwake();
  status('Disconnected immediately. The last picture may remain lit; reconnect here or in the Kilter app to replace it.'); updateControls();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isRunning()) stopShow('Show stopped because this tab was hidden. Press Play to start again.');
});
window.addEventListener('pagehide', () => { player?.abandon(); device?.gatt?.disconnect(); });

if (support.message) {
  $('compatibility').hidden = false;
  $('compatibility').dataset.kind = support.kind;
  const heading = document.createElement('h2'); heading.textContent = support.title;
  const body = document.createElement('p'); body.textContent = support.message;
  $('compatibility').replaceChildren(heading, body);
}
if (!support.canConnect) {
  $('connect').hidden = true; $('play').hidden = true;
  document.querySelector('.control-dock').classList.add('preview-only');
}
try {
  const response = await fetch('/boards.json');
  if (!response.ok) throw new Error('Hold maps could not be downloaded');
  const data = await response.json(); boards = data.boards;
  const chosen = boards.find(b => b.id === saved.boardId) || boards.find(b => b.id === 10);
  $('layout').value = chosen.family; chooseFamily(chosen.family, chosen.id, true);
  const requested = new URLSearchParams(location.search).get('effect');
  if (requested === 'tour' || EFFECTS.some(e => e.id === requested)) pickEffect(requested);
} catch (error) { status(`Could not load board maps: ${error.message}. Reload the page with an internet connection.`, true); }
