import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  AI_XMP_PACKET,
  crc32,
  detectImageFormat,
  DIGITAL_SOURCE_TYPE_AI,
  readDigitalSourceType,
  readJpegHeaderSegments,
  readPngChunks,
  readVp8x,
  readWebpChunks,
  tagAsAiGenerated,
} from "./ai-provenance.ts";

const fixture = (name: string) => Deno.readFile(new URL(`./__fixtures__/images/${name}`, import.meta.url));

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Inflates the zlib stream carried by the IDAT chunks (the PNG's filtered pixel rows). */
async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const idatBytes = (png: Uint8Array) => concat(readPngChunks(png).filter((c) => c.type === "IDAT").map((c) => c.data));

/** Everything from SOS through EOI: the entropy-coded scan (pixel) data. */
function jpegScan(jpeg: Uint8Array): Uint8Array {
  const segs = readJpegHeaderSegments(jpeg);
  const last = segs[segs.length - 1];
  return jpeg.subarray(last.offset + last.size);
}

function assertPngCrcsValid(png: Uint8Array) {
  for (const c of readPngChunks(png)) {
    const typeAndData = png.subarray(c.offset + 4, c.offset + 8 + c.length);
    assertEquals(crc32(typeAndData), c.crc, `CRC of ${c.type}`);
  }
}

Deno.test("crc32 matches the PNG reference value for IEND", () => {
  assertEquals(crc32(new TextEncoder().encode("IEND")), 0xae426082);
});

Deno.test("PNG: tag readable back, IDAT and pixels byte-identical, CRCs valid", async () => {
  const src = await fixture("design.png");
  assertEquals(readDigitalSourceType(src), null);

  const result = tagAsAiGenerated(src);
  assertEquals(result.format, "png");
  assertEquals(result.tagged, true);
  const out = result.bytes;

  assertEquals(readDigitalSourceType(out), DIGITAL_SOURCE_TYPE_AI);
  assertPngCrcsValid(out);

  // iTXt "XML:com.adobe.xmp" sits before the first IDAT; all original chunks keep their order and bytes
  const types = readPngChunks(out).map((c) => c.type);
  assertEquals(types, ["IHDR", "pHYs", "iTXt", "IDAT", "IEND"]);
  const itxt = readPngChunks(out).find((c) => c.type === "iTXt")!;
  assertEquals(new TextDecoder().decode(itxt.data.subarray(0, 18)), "XML:com.adobe.xmp\u0000");
  for (const c of readPngChunks(src)) {
    const tagged = readPngChunks(out).find((t) => t.type === c.type)!;
    assertEquals(tagged.data, c.data, `${c.type} data unchanged`);
    assertEquals(tagged.crc, c.crc, `${c.type} CRC unchanged`);
  }

  // Pixel data: compressed IDAT identical, and the inflated scanlines identical
  assertEquals(idatBytes(out), idatBytes(src));
  const [a, b] = [await inflate(idatBytes(src)), await inflate(idatBytes(out))];
  assertEquals(b, a);
  assertEquals(a.length, 32 * (1 + 48 * 3)); // 32 rows of filter byte + RGB

  // Only bytes added: output = input + exactly one iTXt chunk
  assertEquals(out.length, src.length + 12 + itxt.length);
});

Deno.test("PNG: tagging twice keeps a single XMP chunk (idempotent)", async () => {
  const once = tagAsAiGenerated(await fixture("design.png")).bytes;
  const twice = tagAsAiGenerated(once).bytes;
  assertEquals(twice, once);
  assertEquals(readPngChunks(twice).filter((c) => c.type === "iTXt").length, 1);
});

Deno.test("PNG: multiple IDAT chunks stay contiguous and untouched", async () => {
  const src = await fixture("design.png");
  const chunks = readPngChunks(src);
  const idat = chunks.find((c) => c.type === "IDAT")!;
  const enc = new TextEncoder();
  const mk = (data: Uint8Array) => {
    const td = concat([enc.encode("IDAT"), data]);
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, data.length);
    const crc = new Uint8Array(4);
    new DataView(crc.buffer).setUint32(0, crc32(td));
    return concat([len, td, crc]);
  };
  const half = Math.floor(idat.length / 2);
  const split = concat([
    src.subarray(0, idat.offset),
    mk(idat.data.subarray(0, half)),
    mk(idat.data.subarray(half)),
    src.subarray(idat.offset + 12 + idat.length),
  ]);
  const out = tagAsAiGenerated(split).bytes;
  assertEquals(readPngChunks(out).map((c) => c.type), ["IHDR", "pHYs", "iTXt", "IDAT", "IDAT", "IEND"]);
  assertEquals(idatBytes(out), idatBytes(src));
  assertPngCrcsValid(out);
});

Deno.test("JPEG: APP1 XMP after SOI/EXIF, scan data byte-identical", async () => {
  const src = await fixture("design.jpg");
  const result = tagAsAiGenerated(src);
  assertEquals(result.format, "jpeg");
  assertEquals(result.tagged, true);
  const out = result.bytes;

  assertEquals(readDigitalSourceType(out), DIGITAL_SOURCE_TYPE_AI);
  assertEquals([out[0], out[1]], [0xff, 0xd8]);
  // EXIF APP1 stays first, our XMP APP1 follows it, then every original segment
  const segs = readJpegHeaderSegments(out);
  const ns = (s: { offset: number }) => new TextDecoder().decode(out.subarray(s.offset + 4, s.offset + 10));
  assertEquals(segs[0].marker, 0xe1);
  assertEquals(ns(segs[0]), "Exif\u0000\u0000");
  assertEquals(segs[1].marker, 0xe1);
  assertEquals(ns(segs[1]), "http:/");
  const srcSegs = readJpegHeaderSegments(src);
  assertEquals(segs.length, srcSegs.length + 1);
  // Every original header segment (quant/huffman tables, SOF...) unchanged, and the scan identical
  const rest = segs.filter((_, i) => i !== 1);
  rest.forEach((s, i) => {
    const o = srcSegs[i];
    assertEquals(out.subarray(s.offset, s.offset + s.size), src.subarray(o.offset, o.offset + o.size));
  });
  assertEquals(jpegScan(out), jpegScan(src));
  assertEquals(out.length, src.length + segs[1].size);
  // Idempotent
  assertEquals(tagAsAiGenerated(out).bytes, out);
});

Deno.test("JPEG: with a JFIF APP0 header, XMP goes right after APP0", async () => {
  const src = await fixture("design.jpg");
  const [exif] = readJpegHeaderSegments(src);
  const jfif = new Uint8Array([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const jfifJpeg = concat([src.subarray(0, 2), jfif, src.subarray(exif.offset + exif.size)]);
  const out = tagAsAiGenerated(jfifJpeg).bytes;
  const segs = readJpegHeaderSegments(out);
  assertEquals(segs[0].marker, 0xe0);
  assertEquals(segs[1].marker, 0xe1);
  assertEquals(readDigitalSourceType(out), DIGITAL_SOURCE_TYPE_AI);
  assertEquals(jpegScan(out), jpegScan(jfifJpeg));
});

for (const [name, expectedChunks] of [
  ["design-lossy.webp", ["VP8X", "VP8 ", "XMP "]],
  ["design-lossless.webp", ["VP8X", "VP8L", "XMP "]],
  ["design-alpha.webp", ["VP8X", "ALPH", "VP8 ", "XMP "]],
] as const) {
  Deno.test(`WebP (${name}): XMP chunk + VP8X flag, bitstream byte-identical`, async () => {
    const src = await fixture(name);
    const result = tagAsAiGenerated(src);
    assertEquals(result.format, "webp");
    assertEquals(result.tagged, true);
    const out = result.bytes;

    assertEquals(readDigitalSourceType(out), DIGITAL_SOURCE_TYPE_AI);
    const chunks = readWebpChunks(out);
    assertEquals(chunks.map((c) => c.fourcc), [...expectedChunks]);
    // RIFF size covers the whole file
    assertEquals(new DataView(out.buffer, out.byteOffset).getUint32(4, true), out.length - 8);

    const vp8x = readVp8x(chunks[0]);
    assert((vp8x.flags & 0x04) !== 0, "XMP flag set");
    assertEquals([vp8x.width, vp8x.height], [48, 32]);
    if (name === "design-alpha.webp" || name === "design-lossless.webp") assert((vp8x.flags & 0x10) !== 0, "alpha flag kept");

    // Image bitstreams (VP8 / VP8L / ALPH) copied byte for byte
    for (const c of readWebpChunks(src)) {
      if (c.fourcc === "VP8X") continue;
      const t = chunks.find((x) => x.fourcc === c.fourcc)!;
      assertEquals(t.data, c.data, `${c.fourcc} unchanged`);
    }
    // Idempotent
    assertEquals(tagAsAiGenerated(out).bytes, out);
  });
}

Deno.test("unknown format: returned unchanged and not tagged", () => {
  const bytes = new TextEncoder().encode("GIF89a not supported");
  const result = tagAsAiGenerated(bytes);
  assertEquals(result.format, "unknown");
  assertEquals(result.tagged, false);
  assertEquals(result.bytes, bytes);
  assert(result.reason);
});

Deno.test("malformed PNG: returned unchanged with a reason, never throws", async () => {
  const src = await fixture("design.png");
  const truncated = src.subarray(0, 40);
  const result = tagAsAiGenerated(truncated);
  assertEquals(detectImageFormat(truncated), "png");
  assertEquals(result.tagged, false);
  assertEquals(result.bytes, truncated);
  assert(result.reason?.startsWith("could not parse png"));
});

Deno.test("XMP packet carries the IPTC DigitalSourceType for AI media", () => {
  assert(AI_XMP_PACKET.includes('xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"'));
  assert(AI_XMP_PACKET.includes(
    "<Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>",
  ));
  assertNotEquals(AI_XMP_PACKET.indexOf("<?xpacket begin"), -1);
});
