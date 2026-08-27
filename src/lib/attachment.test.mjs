import assert from "node:assert/strict";
import test from "node:test";
import { ATTACHMENT_MAX_BYTES, decodeBase64, inspectAttachment } from "@/lib/attachment";

const withMagic = (magic, length = 64) => {
  const bytes = new Uint8Array(length);
  bytes.set(magic, 0);
  return bytes;
};
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];

test("real images are accepted by their bytes", () => {
  assert.deepEqual(inspectAttachment(withMagic(PNG)), { ok: true, type: "image/png" });
  assert.deepEqual(inspectAttachment(withMagic(JPEG)), { ok: true, type: "image/jpeg" });
});

// The point of sniffing. Both the filename and the declared MIME type are
// caller-supplied, and this endpoint takes anonymous submissions.
test("a non-image is refused however it is labelled", () => {
  const script = new TextEncoder().encode("#!/bin/sh\nrm -rf /\n");
  const check = inspectAttachment(script);
  assert.equal(check.ok, false);
  assert.match(check.reason, /PNG, JPEG, GIF or WebP/);
});

test("an oversized image is refused before anything decodes it", () => {
  const huge = withMagic(PNG, ATTACHMENT_MAX_BYTES + 1);
  const check = inspectAttachment(huge);
  assert.equal(check.ok, false);
  assert.match(check.reason, /limited to 2 MB/);
});

test("an empty file is refused", () => {
  const check = inspectAttachment(new Uint8Array(0));
  assert.equal(check.ok, false);
});

test("a webp needs both markers, not just RIFF", () => {
  const riffOnly = withMagic([0x52, 0x49, 0x46, 0x46]);
  assert.equal(inspectAttachment(riffOnly).ok, false, "RIFF alone is not a WebP");
  const webp = withMagic([0x52, 0x49, 0x46, 0x46]);
  webp.set([0x57, 0x45, 0x42, 0x50], 8);
  assert.deepEqual(inspectAttachment(webp), { ok: true, type: "image/webp" });
});

test("malformed base64 is a refusal, not a crash", () => {
  assert.equal(decodeBase64("not base64 !!!"), null);
  const round = decodeBase64(Buffer.from(withMagic(PNG)).toString("base64"));
  assert.ok(round && round.length === 64);
  assert.deepEqual(inspectAttachment(round), { ok: true, type: "image/png" });
});
