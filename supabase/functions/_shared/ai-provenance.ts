/**
 * Embeds the standard machine-readable "AI-generated" label into image files
 * WITHOUT decoding or re-encoding pixels:
 *
 *   Iptc4xmpExt:DigitalSourceType =
 *     http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia
 *
 * Only metadata containers are added; every pixel-carrying byte (PNG IDAT,
 * JPEG scan data, WebP VP8/VP8L/ALPH) is copied verbatim, so invisible
 * watermarks in the pixels (such as Google's SynthID on Gemini images) survive.
 *
 *   PNG : an iTXt chunk with keyword "XML:com.adobe.xmp" before the first IDAT
 *   JPEG: an APP1 XMP segment right after SOI (after JFIF APP0 if present)
 *   WebP: an "XMP " chunk, with the extended VP8X header (XMP flag set)
 *
 * Existing XMP packets are replaced so the tag is never duplicated.
 * Unknown formats are returned unchanged with tagged = false.
 */

export const DIGITAL_SOURCE_TYPE_AI =
  "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";

export type ImageFormat = "png" | "jpeg" | "webp" | "unknown";

export interface TagResult {
  bytes: Uint8Array;
  format: ImageFormat;
  tagged: boolean;
  /** Why the image was left unchanged, when tagged is false */
  reason?: string;
}

const XMP_KEYWORD = "XML:com.adobe.xmp";
const JPEG_XMP_NS = "http://ns.adobe.com/xap/1.0/\u0000";

export const AI_XMP_PACKET =
  `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>` +
  `<x:xmpmeta xmlns:x="adobe:ns:meta/">` +
  `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
  `<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/">` +
  `<Iptc4xmpExt:DigitalSourceType>${DIGITAL_SOURCE_TYPE_AI}</Iptc4xmpExt:DigitalSourceType>` +
  `</rdf:Description>` +
  `</rdf:RDF>` +
  `</x:xmpmeta>` +
  `<?xpacket end="r"?>`;

const encoder = new TextEncoder();
const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

// ---------------------------------------------------------------- utilities

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function startsWith(bytes: Uint8Array, prefix: number[], at = 0): boolean {
  if (bytes.length < at + prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (bytes[at + i] !== prefix[i]) return false;
  return true;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let s = "";
  for (let i = 0; i < length && start + i < bytes.length; i++) s += String.fromCharCode(bytes[start + i]);
  return s;
}

const readU32BE = (b: Uint8Array, i: number) =>
  ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const readU32LE = (b: Uint8Array, i: number) =>
  (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

function u32BE(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}
function u32LE(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 as used by PNG (ISO 3309 / ITU-T V.42). */
export function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function detectImageFormat(bytes: Uint8Array): ImageFormat {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  return "unknown";
}

export const MIME_TYPES: Record<Exclude<ImageFormat, "unknown">, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

// ---------------------------------------------------------------------- PNG

export interface PngChunk {
  type: string;
  /** Offset of the chunk's length field */
  offset: number;
  /** Length of the data field */
  length: number;
  data: Uint8Array;
  crc: number;
}

/** Splits a PNG into chunks. Throws on a truncated or malformed file. */
export function readPngChunks(bytes: Uint8Array): PngChunk[] {
  if (detectImageFormat(bytes) !== "png") throw new Error("not a PNG");
  const chunks: PngChunk[] = [];
  let i = 8;
  while (i < bytes.length) {
    if (i + 12 > bytes.length) throw new Error("truncated PNG chunk header");
    const length = readU32BE(bytes, i);
    const type = ascii(bytes, i + 4, 4);
    const end = i + 12 + length;
    if (end > bytes.length) throw new Error(`truncated PNG chunk ${type}`);
    chunks.push({
      type,
      offset: i,
      length,
      data: bytes.subarray(i + 8, i + 8 + length),
      crc: readU32BE(bytes, i + 8 + length),
    });
    i = end;
    if (type === "IEND") break;
  }
  if (chunks.length === 0 || chunks[0].type !== "IHDR") throw new Error("PNG does not start with IHDR");
  if (!chunks.some((c) => c.type === "IDAT")) throw new Error("PNG has no IDAT");
  return chunks;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeAndData = concat([latin1(type), data]);
  return concat([u32BE(data.length), typeAndData, u32BE(crc32(typeAndData))]);
}

function isPngXmpChunk(bytes: Uint8Array, chunk: PngChunk): boolean {
  if (chunk.type !== "iTXt") return false;
  const kw = latin1(XMP_KEYWORD + "\u0000");
  return startsWith(bytes, Array.from(kw), chunk.offset + 8);
}

function tagPng(bytes: Uint8Array): Uint8Array {
  const chunks = readPngChunks(bytes);
  // iTXt: keyword \0 compression-flag(0) compression-method(0) language-tag \0 translated-keyword \0 text(UTF-8)
  const itxt = pngChunk(
    "iTXt",
    concat([latin1(XMP_KEYWORD), new Uint8Array([0, 0, 0, 0, 0]), encoder.encode(AI_XMP_PACKET)])
  );
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let inserted = false;
  for (const chunk of chunks) {
    const raw = bytes.subarray(chunk.offset, chunk.offset + 12 + chunk.length);
    if (isPngXmpChunk(bytes, chunk)) continue; // replaced by ours
    if (!inserted && chunk.type === "IDAT") {
      parts.push(itxt);
      inserted = true;
    }
    parts.push(raw);
  }
  // Anything after IEND is carried over untouched
  const last = chunks[chunks.length - 1];
  const tailStart = last.offset + 12 + last.length;
  if (tailStart < bytes.length) parts.push(bytes.subarray(tailStart));
  return concat(parts);
}

// --------------------------------------------------------------------- JPEG

export interface JpegSegment {
  marker: number;
  offset: number;
  /** Total bytes including the 0xFF marker and the length field */
  size: number;
}

/** Lists the header segments of a JPEG up to (not including) SOS. */
export function readJpegHeaderSegments(bytes: Uint8Array): JpegSegment[] {
  if (detectImageFormat(bytes) !== "jpeg") throw new Error("not a JPEG");
  const segments: JpegSegment[] = [];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) throw new Error(`bad JPEG marker at ${i}`);
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    if (marker === 0xda || marker === 0xd9) break; // SOS / EOI: header ends
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2 || i + 2 + length > bytes.length) throw new Error("truncated JPEG segment");
    segments.push({ marker, offset: i, size: 2 + length });
    i += 2 + length;
  }
  return segments;
}

function isJpegXmpSegment(bytes: Uint8Array, seg: JpegSegment): boolean {
  return seg.marker === 0xe1 && ascii(bytes, seg.offset + 4, JPEG_XMP_NS.length) === JPEG_XMP_NS;
}

function tagJpeg(bytes: Uint8Array): Uint8Array {
  const segments = readJpegHeaderSegments(bytes);
  const payload = concat([latin1(JPEG_XMP_NS), encoder.encode(AI_XMP_PACKET)]);
  if (payload.length + 2 > 0xffff) throw new Error("XMP packet too large for one APP1 segment");
  const app1 = concat([
    new Uint8Array([0xff, 0xe1, ((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff]),
    payload,
  ]);

  // Insert after SOI, keeping a leading JFIF APP0 (and EXIF APP1) first as readers expect
  let insertAt = 2;
  for (const seg of segments) {
    const isApp0 = seg.marker === 0xe0;
    const isExif = seg.marker === 0xe1 && ascii(bytes, seg.offset + 4, 6) === "Exif\u0000\u0000";
    if ((isApp0 || isExif) && seg.offset === insertAt) insertAt = seg.offset + seg.size;
    else break;
  }

  const parts: Uint8Array[] = [bytes.subarray(0, insertAt), app1];
  let cursor = insertAt;
  for (const seg of segments) {
    if (seg.offset < insertAt) continue;
    if (isJpegXmpSegment(bytes, seg)) {
      parts.push(bytes.subarray(cursor, seg.offset));
      cursor = seg.offset + seg.size;
    }
  }
  parts.push(bytes.subarray(cursor));
  return concat(parts);
}

// --------------------------------------------------------------------- WebP

export interface RiffChunk {
  fourcc: string;
  offset: number;
  /** Data size as declared (without padding) */
  size: number;
  data: Uint8Array;
}

/** Lists the chunks inside a RIFF/WEBP container. */
export function readWebpChunks(bytes: Uint8Array): RiffChunk[] {
  if (detectImageFormat(bytes) !== "webp") throw new Error("not a WebP");
  const riffEnd = Math.min(bytes.length, 8 + readU32LE(bytes, 4));
  const chunks: RiffChunk[] = [];
  let i = 12;
  while (i + 8 <= riffEnd) {
    const fourcc = ascii(bytes, i, 4);
    const size = readU32LE(bytes, i + 4);
    if (i + 8 + size > riffEnd) throw new Error(`truncated WebP chunk ${fourcc}`);
    chunks.push({ fourcc, offset: i, size, data: bytes.subarray(i + 8, i + 8 + size) });
    i += 8 + size + (size & 1);
  }
  if (chunks.length === 0) throw new Error("empty WebP");
  return chunks;
}

const readU24LE = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u24LE = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff]);

/** Canvas size from a simple-format (VP8 / VP8L) bitstream, for building VP8X. */
function webpCanvasSize(chunk: RiffChunk): { width: number; height: number; alpha: boolean } {
  const d = chunk.data;
  if (chunk.fourcc === "VP8 ") {
    // Frame tag (3 bytes) + start code 9d 01 2a + 14-bit width/height
    if (d.length < 10 || d[3] !== 0x9d || d[4] !== 0x01 || d[5] !== 0x2a) throw new Error("bad VP8 header");
    return { width: (d[6] | (d[7] << 8)) & 0x3fff, height: (d[8] | (d[9] << 8)) & 0x3fff, alpha: false };
  }
  if (chunk.fourcc === "VP8L") {
    if (d.length < 5 || d[0] !== 0x2f) throw new Error("bad VP8L header");
    const bits = readU32LE(d, 1);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, alpha: ((bits >>> 28) & 1) === 1 };
  }
  throw new Error(`unexpected WebP chunk ${chunk.fourcc}`);
}

function riffChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const pad = data.length & 1 ? new Uint8Array([0]) : new Uint8Array(0);
  return concat([latin1(fourcc), u32LE(data.length), data, pad]);
}

const VP8X_XMP_FLAG = 0x04;
const VP8X_ALPHA_FLAG = 0x10;

function tagWebp(bytes: Uint8Array): Uint8Array {
  const chunks = readWebpChunks(bytes);
  const raw = (c: RiffChunk) => bytes.subarray(c.offset, c.offset + 8 + c.size + (c.size & 1));
  const xmp = riffChunk("XMP ", encoder.encode(AI_XMP_PACKET));

  const body: Uint8Array[] = [];
  if (chunks[0].fourcc === "VP8X") {
    // Extended format: set the XMP flag; the XMP chunk goes after the image data (spec order)
    const vp8x = new Uint8Array(raw(chunks[0]));
    vp8x[8] |= VP8X_XMP_FLAG;
    body.push(vp8x);
    for (const c of chunks.slice(1)) if (c.fourcc !== "XMP ") body.push(raw(c));
    body.push(xmp);
  } else {
    // Simple format (lone VP8 / VP8L): wrap it in VP8X so it can carry XMP
    const image = chunks[0];
    const { width, height, alpha } = webpCanvasSize(image);
    const vp8xData = concat([
      new Uint8Array([VP8X_XMP_FLAG | (alpha ? VP8X_ALPHA_FLAG : 0), 0, 0, 0]),
      u24LE(width - 1),
      u24LE(height - 1),
    ]);
    body.push(riffChunk("VP8X", vp8xData));
    for (const c of chunks) if (c.fourcc !== "XMP ") body.push(raw(c));
    body.push(xmp);
  }
  const payload = concat([latin1("WEBP"), ...body]);
  return concat([latin1("RIFF"), u32LE(payload.length), payload]);
}

/** Exposed for tests: the 24-bit canvas fields of a VP8X chunk. */
export function readVp8x(chunk: RiffChunk): { flags: number; width: number; height: number } {
  return { flags: chunk.data[0], width: readU24LE(chunk.data, 4) + 1, height: readU24LE(chunk.data, 7) + 1 };
}

// ------------------------------------------------------------------ public API

/**
 * Returns the image with the AI DigitalSourceType XMP tag embedded.
 * Never throws: unknown or malformed files come back unchanged with a reason.
 */
export function tagAsAiGenerated(bytes: Uint8Array): TagResult {
  const format = detectImageFormat(bytes);
  try {
    switch (format) {
      case "png":
        return { bytes: tagPng(bytes), format, tagged: true };
      case "jpeg":
        return { bytes: tagJpeg(bytes), format, tagged: true };
      case "webp":
        return { bytes: tagWebp(bytes), format, tagged: true };
      default:
        return { bytes, format, tagged: false, reason: "unrecognized image format" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { bytes, format, tagged: false, reason: `could not parse ${format}: ${message}` };
  }
}

/** Reads back the DigitalSourceType from an image's embedded XMP, if any. */
export function readDigitalSourceType(bytes: Uint8Array): string | null {
  const decoder = new TextDecoder();
  let xmp: string | null = null;
  const format = detectImageFormat(bytes);
  if (format === "png") {
    for (const c of readPngChunks(bytes)) {
      if (isPngXmpChunk(bytes, c)) {
        // keyword\0 flag method lang\0 translated\0 text
        let p = XMP_KEYWORD.length + 1 + 2;
        while (c.data[p] !== 0) p++;
        p++;
        while (c.data[p] !== 0) p++;
        p++;
        xmp = decoder.decode(c.data.subarray(p));
      }
    }
  } else if (format === "jpeg") {
    for (const s of readJpegHeaderSegments(bytes)) {
      if (isJpegXmpSegment(bytes, s)) {
        xmp = decoder.decode(bytes.subarray(s.offset + 4 + JPEG_XMP_NS.length, s.offset + s.size));
      }
    }
  } else if (format === "webp") {
    for (const c of readWebpChunks(bytes)) if (c.fourcc === "XMP ") xmp = decoder.decode(c.data);
  }
  if (!xmp) return null;
  const m = xmp.match(/<Iptc4xmpExt:DigitalSourceType>([^<]+)<\/Iptc4xmpExt:DigitalSourceType>/) ??
    xmp.match(/Iptc4xmpExt:DigitalSourceType="([^"]+)"/);
  return m ? m[1] : null;
}
