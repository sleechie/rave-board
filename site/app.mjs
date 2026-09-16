import { ADVERTISING, UART, TX, apiFromName, BoardTransport, BoardPlayer, quantize } from './protocol.mjs?v=2';
import { EFFECTS, makeFrame, mapPoints, cornerFrame, colorAt, gravityPhase } from './effects.mjs?v=2';

const $ = id => document.getElementById(id);
const canvas = $('board'), ctx = canvas.getContext('2d');
let boards = [], board, points = [], effect = 'tour';
let time = 5, lastTime = performance.now(), previewing = false;
let device = null, transport = null, player = null, wakeLock = null;
let busy = false, testing = false, lastSent = null, testFrame = null;
let writes = 0, startedAt = 0, sendRate = 0;
const saved = (() => { try { return JSON.parse(localStorage.getItem('kilter-trip') || '{}'); } catch { return {}; } })();

function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function isConnected() { return Boolean(device?.gatt?.connected && transport && !transport.closed); }
function isRunning() { return Boolean(player?.running); }
function updateControls() {
  const connected = isConnected(), running = isRunning();
  $('connect').disabled = !board || busy || connected || !navigator.bluetooth || points.length < 4;
  $('connect').innerHTML = connected ? 'Board connected <span>✓</span>' : busy ? 'Working…' : 'Connect board <span>↗</span>';
  $('test').disabled = !connected || running || busy;
  $('play').disabled = !connected || running || busy;
  $('stop').disabled = !connected || busy;
  $('disconnect').hidden = !connected;
  $('disconnect').disabled = busy;
  for (const id of ['layout','size','protocol','pacing']) $(id).disabled = connected || busy || !board;
  for (const input of $('sets').querySelectorAll('input')) input.disabled = connected || busy;
  $('connection-badge').textContent = connected ? running ? 'TRANSMITTING' : 'CONNECTED' : 'PREVIEW ONLY';
  $('connection-badge').classList.toggle('live', connected);
  $('preview-label').textContent = running ? 'LAST FRAME SENT TO BOARD' : testing ? 'CORNER TEST' : 'ON-SCREEN PREVIEW';
  $('preview').textContent = previewing ? 'Ⅱ Pause preview' : '▶ Preview';
  $('preview').disabled = running || busy || !board;
}
function save() {
  try { localStorage.setItem('kilter-trip', JSON.stringify({ boardId: board.id, sets: selectedSets() })); } catch {}
}
function selectedSets() { return [...$('sets').querySelectorAll('input:checked')].map(el => Number(el.value)); }
function updatePoints() {
  points = mapPoints(board, selectedSets());
  $('led-count').textContent = `${points.length} LED HOLDS`;
  if (points.length < 4) status('Select at least one installed hold set.');
  else status('Choose your wall, then connect. Connecting alone will not change its lights.');
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
    const name = b.family === 'Original' ? b.name : `${b.name} · ${b.description.replace(' LED Kit','')}`;
    $('size').append(new Option(name, b.id));
  }
  if (boards.some(b => b.family === family && b.id === Number(id))) $('size').value = id;
  chooseBoard($('size').value, initial);
}

function pickEffect(id) {
  effect = id; testing = false; testFrame = null;
  time = id === 'marquee' ? 4 : 0;
  if (!isRunning()) previewing = true;
  $('effect-title').textContent = id === 'tour' ? 'The full trip' : EFFECTS.find(e => e.id === id).name;
  $('message-controls').hidden = id !== 'marquee';
  $('effect-note').textContent = id === 'tour' ? 'An automatic tour through color, rain, lasers, logos and space.' : EFFECTS.find(e => e.id === id).note;
  for (const el of document.querySelectorAll('[data-effect],#tour')) {
    const active = (el.dataset.effect || 'tour') === id;
    el.classList.toggle('selected', active); el.setAttribute('aria-pressed', String(active));
  }
  updateControls();
}
for (const e of EFFECTS) {
  const button = document.createElement('button');
  button.className = 'effect'; button.dataset.effect = e.id;
  button.title = e.note; button.setAttribute('aria-pressed', 'false');
  const tile = document.createElement('canvas'); tile.width = 180; tile.height = 80; tile.setAttribute('aria-hidden','true');
  const t = tile.getContext('2d');
  for (let y = 0; y < 80; y += 4) for (let x = 0; x < 180; x += 4) {
    const c = colorAt(e.id, (x / 180 - 0.5) * 2, (0.5 - y / 80) * 1.5, 4, 0.95);
    t.fillStyle = `rgb(${c.join(',')})`; t.fillRect(x, y, 3, 3);
  }
  const title = document.createElement('strong'); title.textContent = e.name;
  if (e.id === 'gravity' || e.id === 'purgatory') {
    const art = document.createElement('img'); art.alt = '';
    art.src = e.id === 'gravity' ? 'assets/gravity-lab.webp' : 'assets/purgatory-mark.svg';
    button.append(art, title);
  } else button.append(tile, title);
  button.addEventListener('click', () => pickEffect(e.id));
  $('effects').append(button);
}
$('tour').addEventListener('click', () => pickEffect('tour'));
$('layout').addEventListener('change', () => chooseFamily($('layout').value));
$('size').addEventListener('change', () => chooseBoard($('size').value));
$('speed').addEventListener('input', () => { $('speed-value').textContent = Number($('speed').value).toFixed(2).replace(/0$/,'') + '×'; });
$('brightness').addEventListener('input', () => { $('brightness-value').textContent = $('brightness').value + '%'; });
$('message').addEventListener('input', () => { if (!isRunning()) previewing = true; updateControls(); });
$('preview').addEventListener('click', () => { previewing = !previewing; testing = false; updateControls(); });

function currentFrame() { return makeFrame(points, effect, time, Number($('brightness').value) / 100, { message: $('message').value }); }
function render(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.15); lastTime = now;
  if (previewing || isRunning()) time += dt * Number($('speed').value);
  if (effect === 'gravity') {
    $('effect-note').textContent = gravityPhase(time, points[0]?.textWidth).mode === 'logo'
      ? 'Flask + climber → GRAVITY LAB lettering comes next.' : 'GRAVITY LAB · scrolling across the handholds in the gym’s colors.';
  }
  if (board) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    const [l,r,b,t] = board.bounds, aspect = (r-l)/(t-b);
    const bh = Math.min(h-28, (w-28)/aspect), bw = bh*aspect, ox = (w-bw)/2, oy = (h-bh)/2;
    ctx.strokeStyle='#ffffff0b'; ctx.lineWidth=1;
    ctx.strokeRect(ox-6,oy-6,bw+12,bh+12);
    const frame = testing && testFrame ? testFrame : isRunning() && lastSent ? lastSent : currentFrame();
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
function lostConnection() {
  player?.abandon(); transport?.close();
  testing = false; previewing = false; busy = false;
  releaseAwake(); updateControls();
  status('Bluetooth disconnected. The last frame may still be lit. Reconnect here or use the Kilter app to replace it.', true);
}
function failed(error) {
  player?.abandon(); transport?.close();
  if (device?.gatt?.connected) device.gatt.disconnect();
  testing = false; previewing = false;
  releaseAwake(); updateControls();
  status(`${error.message} The lights may retain their last frame. Reconnect or use the Kilter app.`, true);
}

$('connect').addEventListener('click', async () => {
  if (!navigator.bluetooth) return;
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
    transport = new BoardTransport(characteristic, level, failed, Number($('pacing').value));
    player = new BoardPlayer(transport, currentFrame, (frame, bytes, duration) => {
      lastSent = frame; writes++;
      sendRate = writes / ((performance.now()-startedAt)/1000);
      status(`Playing · ${sendRate.toFixed(1)} frames/sec sent · ${bytes} bytes/frame · target ${$('fps').value} fps. Actual speed depends on the controller.`);
    }, failed, () => Number($('fps').value));
    status(`Connected to ${candidate.name || 'board'} · API ${level}. Test corners to check the map, then Play on board.`);
  } catch (error) {
    candidate?.gatt?.disconnect();
    status(error.name === 'NotFoundError' ? 'No board selected. Stand near it, release the connection in the Kilter app, then try again.'
      : `Could not connect: ${error.message}`, true);
  } finally { busy = false; updateControls(); }
});

$('test').addEventListener('click', async () => {
  busy = true; updateControls();
  try {
    testFrame = cornerFrame(points);
    await transport.send(testFrame);
    testing = true; previewing = false;
    status('Check corners: top left PINK · top right CYAN · bottom left YELLOW · bottom right GREEN. If wrong, clear and choose a different size.');
  } catch (error) { failed(error); }
  finally { busy = false; updateControls(); }
});
$('play').addEventListener('click', () => {
  testing = false; previewing = false; lastSent = null; writes = 0; startedAt = performance.now();
  player.start(); keepAwake(); updateControls();
  status('Sending the first full frame…');
});
async function stopShow(message = 'Stopped. A clear-lights command was sent. You can pick another effect or disconnect.') {
  if (!isConnected() || busy) return;
  busy = true; previewing = false; testing = false; updateControls();
  status('Stopping… finishing the current frame, then clearing the lights.');
  try { await player.stop(); lastSent = null; status(message); }
  catch (error) { failed(error); }
  finally { busy = false; await releaseAwake(); updateControls(); }
}
$('stop').addEventListener('click', () => stopShow());
$('disconnect').addEventListener('click', async () => {
  if (busy) return;
  const departing = device;
  await stopShow();
  departing?.removeEventListener('gattserverdisconnected', lostConnection);
  transport?.close(); departing?.gatt?.disconnect();
  device = null; transport = null; player = null;
  status('Disconnected. Reconnect using the Kilter app when you’re ready to climb.'); updateControls();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isRunning()) stopShow('Show stopped because this tab was hidden. Press Play to start again.');
});
window.addEventListener('pagehide', () => { player?.abandon(); device?.gatt?.disconnect(); });

if (!navigator.bluetooth) {
  $('compatibility').hidden = false;
  $('compatibility').innerHTML = 'Preview works here. To connect, use Chrome or Edge on a Windows/Mac laptop, Chrome on Android, or <a href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055">Bluefy on iPhone</a>.';
}
try {
  const response = await fetch('./boards.json');
  if (!response.ok) throw new Error('Hold maps could not be downloaded');
  const data = await response.json(); boards = data.boards;
  const chosen = boards.find(b => b.id === saved.boardId) || boards.find(b => b.id === 10);
  $('layout').value = chosen.family; chooseFamily(chosen.family, chosen.id, true);
} catch (error) { status(`Could not load board maps: ${error.message}. Reload the page with an internet connection.`, true); }
