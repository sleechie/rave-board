// Aurora LED API 2/3, checked against Grip Connect's published wire fixtures.
// Reference and attribution: see THIRD-PARTY-LICENSE.txt and README.md.
export const ADVERTISING = '4488b571-7806-4df6-bcff-a2897e4953ff';
export const UART = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const TX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

export function apiFromName(name = '') {
  const match = name.match(/@(\d+)$/);
  const level = match ? Number(match[1]) : 2;
  if (![2, 3].includes(level)) throw new Error(`Board protocol ${level} is not supported. No lights were sent.`);
  return level;
}

export function encodeFrame(leds, level = 3) {
  if (![2, 3].includes(level)) throw new Error('Unsupported board protocol');
  const stride = level === 3 ? 3 : 2;
  const markers = level === 3 ? [81, 82, 83, 84] : [77, 78, 79, 80];
  const packets = [[]];
  for (const { position, rgb } of leds) {
    if (!Number.isInteger(position) || position < 0 || position > (level === 3 ? 65535 : 1023)) {
      throw new Error('LED address is outside this board protocol');
    }
    if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(v => !Number.isInteger(v) || v < 0 || v > 255)) {
      throw new Error('Invalid LED color');
    }
    if (packets.at(-1).length + stride > 254) packets.push([]);
    const [r, g, b] = rgb;
    const packed = level === 3
      ? [position & 255, position >> 8, ((r >> 5) << 5) | ((g >> 5) << 2) | (b >> 6)]
      : [position & 255, ((position >> 8) & 3) | ((r >> 6) << 6) | ((g >> 6) << 4) | ((b >> 6) << 2)];
    packets.at(-1).push(...packed);
  }
  return Uint8Array.from(packets.flatMap((packet, i) => {
    const marker = packets.length === 1 ? markers[3] : i === 0 ? markers[1] : i === packets.length - 1 ? markers[2] : markers[0];
    const body = [marker, ...packet];
    const checksum = (~body.reduce((sum, byte) => sum + byte, 0)) & 255;
    return [1, body.length, checksum, 2, ...body, 3];
  }));
}

export function quantize(rgb, level = 3) {
  return rgb.map((v, i) => {
    const bits = level === 3 && i < 2 ? 3 : 2;
    return Math.round((v >> (8 - bits)) * 255 / (2 ** bits - 1));
  });
}

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export class BoardTransport {
  constructor(characteristic, level, onFailure = () => {}, gapMs = 6) {
    this.characteristic = characteristic;
    this.level = level;
    this.onFailure = onFailure;
    this.gapMs = gapMs;
    this.tail = Promise.resolve();
    this.closed = false;
  }
  send(leds) {
    const payload = encodeFrame(leds, this.level);
    const op = this.tail.then(async () => {
      if (this.closed) throw new Error('Board disconnected. Reconnect before sending.');
      try {
        for (let i = 0; i < payload.length; i += 20) {
          if (this.closed) throw new Error('Board disconnected during a frame.');
          const c = this.characteristic;
          const chunk = payload.slice(i, i + 20);
          let timer;
          try {
            const write = c.properties?.writeWithoutResponse && typeof c.writeValueWithoutResponse === 'function'
              ? c.writeValueWithoutResponse(chunk)
              : typeof c.writeValueWithResponse === 'function' && c.properties?.write
                ? c.writeValueWithResponse(chunk) : c.writeValue(chunk);
            await Promise.race([write, new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('Bluetooth write timed out.')), 5000);
            })]);
          } finally { clearTimeout(timer); }
          if (this.gapMs && i + 20 < payload.length) await delay(this.gapMs);
        }
      } catch (error) {
        this.closed = true;
        this.onFailure(error);
        throw error;
      }
      return payload.length;
    });
    this.tail = op.catch(() => {});
    return op;
  }
  close() { this.closed = true; }
}

// At most one animation frame is in flight. Stop appends a clear AFTER that
// whole frame, so a stale final packet cannot relight the board after clearing.
export class BoardPlayer {
  constructor(transport, getFrame, onFrame = () => {}, onError = () => {}) {
    Object.assign(this, { transport, getFrame, onFrame, onError });
    this.generation = 0;
    this.running = false;
    this.stopping = null;
  }
  start() {
    if (this.running || this.stopping) return;
    this.running = true;
    const generation = ++this.generation;
    this.done = this.loop(generation);
  }
  async loop(generation) {
    try {
      while (this.running && generation === this.generation) {
        const started = performance.now();
        const frame = this.getFrame();
        const bytes = await this.transport.send(frame);
        if (!this.running || generation !== this.generation) break;
        const duration = performance.now() - started;
        this.onFrame(frame, bytes, duration);
        await delay(Math.max(0, 250 - duration));
      }
    } catch (error) {
      this.running = false;
      if (generation === this.generation) this.onError(error);
    }
  }
  stop() {
    if (this.stopping) return this.stopping;
    this.running = false;
    this.generation++;
    this.stopping = this.transport.send([]).finally(() => { this.stopping = null; });
    return this.stopping;
  }
  abandon() { this.running = false; this.generation++; }
}
