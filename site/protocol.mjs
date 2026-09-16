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

export function encodePackets(leds, level = 3, { omitDark = false, maxBodyLength = 255 } = {}) {
  if (![2, 3].includes(level)) throw new Error('Unsupported board protocol');
  const stride = level === 3 ? 3 : 2;
  if (!Number.isInteger(maxBodyLength) || maxBodyLength < stride + 1 || maxBodyLength > 255) {
    throw new Error('Invalid packet size');
  }
  const markers = level === 3 ? [81, 82, 83, 84] : [77, 78, 79, 80];
  const packets = [[]];
  for (const { position, rgb } of leds) {
    if (!Number.isInteger(position) || position < 0 || position > (level === 3 ? 65535 : 1023)) {
      throw new Error('LED address is outside this board protocol');
    }
    if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(v => !Number.isInteger(v) || v < 0 || v > 255)) {
      throw new Error('Invalid LED color');
    }
    const [r, g, b] = rgb;
    const packed = level === 3
      ? [position & 255, position >> 8, ((r >> 5) << 5) | ((g >> 5) << 2) | (b >> 6)]
      : [position & 255, ((position >> 8) & 3) | ((r >> 6) << 6) | ((g >> 6) << 4) | ((b >> 6) << 2)];
    // A complete Aurora frame replaces the previous one, including unlisted
    // LEDs. Omit holds quantized to black: rain/logos need far fewer BLE writes.
    if (omitDark && (level === 3 ? packed[2] === 0 : (packed[1] & 252) === 0)) continue;
    if (packets.at(-1).length + stride > maxBodyLength - 1) packets.push([]);
    packets.at(-1).push(...packed);
  }
  return packets.map((packet, i) => {
    const marker = packets.length === 1 ? markers[3] : i === 0 ? markers[1] : i === packets.length - 1 ? markers[2] : markers[0];
    const body = [marker, ...packet];
    const checksum = (~body.reduce((sum, byte) => sum + byte, 0)) & 255;
    return Uint8Array.from([1, body.length, checksum, 2, ...body, 3]);
  });
}

export function encodeFrame(leds, level = 3, options = {}) {
  return Uint8Array.from(encodePackets(leds, level, options).flatMap(packet => [...packet]));
}

export function quantize(rgb, level = 3) {
  return rgb.map((v, i) => {
    const bits = level === 3 && i < 2 ? 3 : 2;
    return Math.round((v >> (8 - bits)) * 255 / (2 ** bits - 1));
  });
}

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const yieldForInput = () => globalThis.scheduler?.yield ? globalThis.scheduler.yield() : delay(0);

export class BoardTransport {
  constructor(characteristic, level, onFailure = () => {}, gapMs = 0) {
    this.characteristic = characteristic;
    this.level = level;
    this.onFailure = onFailure;
    this.gapMs = gapMs;
    this.tail = Promise.resolve();
    this.closed = false;
    this.revision = 0;
    this.rejectWrite = null;
  }
  // Supersede unfinished and queued work, but finish any packet already begun.
  // A subsequent FIRST/ONLY packet then resets the receiver's unfinished frame.
  interrupt() { this.revision++; }
  send(leds, { control = false } = {}) {
    const revision = this.revision;
    // At most 60 bytes = three BLE writes before a control change can take over.
    // This adds about 9% framing overhead to a dense 476-hold frame.
    const packets = encodePackets(leds, this.level, { omitDark: true, maxBodyLength: 55 });
    const op = this.tail.then(async () => {
      if (this.closed) throw new Error('Board disconnected. Reconnect before sending.');
      let sent = 0;
      try {
        for (const packet of packets) {
          if (revision !== this.revision) return null;
          const deadline = performance.now() + 1500;
          for (let i = 0; i < packet.length; i += 20) {
            if (this.closed) throw new Error('Board disconnected during a packet.');
            const endOfPacket = i + 20 >= packet.length;
            await this.writeChunk(packet.slice(i, i + 20), endOfPacket, deadline - performance.now());
            sent += Math.min(20, packet.length - i);
            if (!control && this.gapMs && !endOfPacket) await delay(this.gapMs);
          }
          if (revision !== this.revision) return null;
          // Let input events run even when the browser resolves writes quickly.
          if (packet !== packets.at(-1)) await yieldForInput();
        }
      } catch (error) {
        if (!this.closed) { this.closed = true; this.onFailure(error); }
        throw error;
      }
      return sent;
    });
    this.tail = op.catch(() => {});
    return op;
  }
  async writeChunk(chunk, endOfPacket, timeoutMs) {
    if (timeoutMs <= 0) throw new Error('Bluetooth stalled. Reconnect and try again.');
    const c = this.characteristic;
    let timer;
    try {
      // An acknowledged write at each packet boundary limits how far the sender
      // can run ahead when the controller supports it. It is not an LED receipt.
      const write = endOfPacket && c.properties?.write && typeof c.writeValueWithResponse === 'function'
        ? c.writeValueWithResponse(chunk)
        : c.properties?.writeWithoutResponse && typeof c.writeValueWithoutResponse === 'function'
          ? c.writeValueWithoutResponse(chunk)
          : c.properties?.write && typeof c.writeValueWithResponse === 'function'
            ? c.writeValueWithResponse(chunk) : c.writeValue(chunk);
      await Promise.race([write, new Promise((_, reject) => {
        this.rejectWrite = reject;
        timer = setTimeout(() => reject(new Error('Bluetooth stalled. Reconnect and try again.')), timeoutMs);
      })]);
    } finally { clearTimeout(timer); this.rejectWrite = null; }
  }
  close() {
    this.closed = true;
    this.interrupt();
    this.rejectWrite?.(new Error('Bluetooth disconnected.'));
  }
}

// One frame in flight, latest settings only. Stop/switch can supersede a frame
// after the current short packet; bytes from different packets never interleave.
export class BoardPlayer {
  constructor(transport, getFrame, onFrame = () => {}, onError = () => {}, getTargetFps = () => 30) {
    Object.assign(this, { transport, getFrame, onFrame, onError, getTargetFps });
    this.generation = 0;
    this.running = false;
    this.stopping = null;
    this.revision = 0;
    this.wake = null;
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
        const revision = this.revision;
        const frame = this.getFrame();
        const bytes = await this.transport.send(frame);
        if (!this.running || generation !== this.generation) break;
        if (bytes === null || revision !== this.revision) continue;
        const duration = performance.now() - started;
        this.onFrame(frame, bytes, duration);
        if (!this.running || generation !== this.generation) break;
        const fps = Math.max(1, Math.min(60, Number(this.getTargetFps()) || 30));
        await this.wait(Math.max(0, 1000 / fps - duration));
      }
    } catch (error) {
      this.running = false;
      if (generation === this.generation) this.onError(error);
    }
  }
  wait(ms) {
    return new Promise(resolve => {
      const finish = () => { clearTimeout(timer); this.wake = null; resolve(); };
      const timer = setTimeout(finish, ms);
      this.wake = finish;
    });
  }
  refresh() {
    if (!this.running) return;
    this.revision++;
    this.transport.interrupt();
    this.wake?.();
  }
  stop() {
    if (this.stopping) return this.stopping;
    this.running = false;
    this.generation++;
    this.transport.interrupt();
    this.wake?.();
    this.stopping = this.transport.send([], { control: true }).finally(() => { this.stopping = null; });
    return this.stopping;
  }
  abandon() {
    this.running = false; this.generation++;
    this.transport.interrupt(); this.wake?.();
  }
}
