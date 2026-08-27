/**
 * What counts as an image, decided by the bytes rather than by the sender.
 *
 * The declared MIME type and the filename are both caller-supplied and both
 * trivially wrong — a renamed executable claims `image/png` as easily as a real
 * one. Sniffing the leading bytes is the only part of the claim the sender does
 * not control, and this endpoint is unauthenticated, so it is the only part
 * worth believing.
 *
 * Deliberately a short list. Every accepted format is one more decoder that
 * eventually renders somewhere.
 */
export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;

type Signature = { type: string; test: (bytes: Uint8Array) => boolean };

const starts = (bytes: Uint8Array, magic: number[], offset = 0) =>
  magic.every((byte, index) => bytes[offset + index] === byte);

const SIGNATURES: Signature[] = [
  { type: "image/png", test: (b) => starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { type: "image/jpeg", test: (b) => starts(b, [0xff, 0xd8, 0xff]) },
  { type: "image/gif", test: (b) => starts(b, [0x47, 0x49, 0x46, 0x38]) },
  {
    type: "image/webp",
    // "RIFF" .... "WEBP" — the size field sits between the two markers.
    test: (b) => starts(b, [0x52, 0x49, 0x46, 0x46]) && starts(b, [0x57, 0x45, 0x42, 0x50], 8),
  },
];

export type AttachmentCheck = { ok: true; type: string } | { ok: false; reason: string };

export function inspectAttachment(bytes: Uint8Array): AttachmentCheck {
  if (bytes.length === 0) return { ok: false, reason: "That file is empty." };
  if (bytes.length > ATTACHMENT_MAX_BYTES) {
    return { ok: false, reason: `Attachments are limited to ${Math.round(ATTACHMENT_MAX_BYTES / 1024 / 1024)} MB.` };
  }
  const match = SIGNATURES.find((signature) => signature.test(bytes));
  if (!match) {
    // Says what is wrong without teaching a prober which formats pass.
    return { ok: false, reason: "Attach a PNG, JPEG, GIF or WebP image." };
  }
  return { ok: true, type: match.type };
}

/** Base64 is how the bytes survive the JSON server-function boundary. */
export function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}
