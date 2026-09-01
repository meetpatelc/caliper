import assert from "node:assert/strict";
import test from "node:test";
import { contrastRatio, flatten, judge, parseRgb, relativeLuminance, requiredRatio } from "./contrast.mjs";

const BLACK = { r: 0, g: 0, b: 0, a: 1 };
const WHITE = { r: 255, g: 255, b: 255, a: 1 };

test("the two anchors of the scale are exact", () => {
  assert.equal(Math.round(contrastRatio(WHITE, BLACK) * 100) / 100, 21);
  assert.equal(contrastRatio(WHITE, WHITE), 1);
});

test("luminance is not linear in the channel value", () => {
  // Mid grey is 21.6% luminance, not 50%. Averaging the channels instead of
  // applying the sRGB transfer function passes the anchors above and is wrong
  // everywhere in between, which is exactly the region every real palette
  // lives in.
  const grey = relativeLuminance({ r: 128, g: 128, b: 128 });
  assert.ok(grey > 0.2 && grey < 0.23, `mid grey luminance was ${grey}`);
});

test("order does not change the ratio", () => {
  const a = { r: 244, g: 112, b: 124, a: 1 };
  const b = { r: 20, g: 22, b: 26, a: 1 };
  assert.equal(contrastRatio(a, b), contrastRatio(b, a));
});

test("translucent text is judged on what it actually looks like", () => {
  const halfWhiteOnBlack = flatten({ r: 255, g: 255, b: 255, a: 0.5 }, BLACK);
  assert.deepEqual(halfWhiteOnBlack, { r: 127.5, g: 127.5, b: 127.5, a: 1 });
  // Taken at face value this is 21:1; composited it is under 6:1. Muted text
  // is routinely painted with an alpha, so skipping this over-reports pass.
  assert.ok(contrastRatio(halfWhiteOnBlack, BLACK) < 6);
});

test("rgb and rgba both parse, and nonsense does not", () => {
  assert.deepEqual(parseRgb("rgb(20, 22, 26)"), { r: 20, g: 22, b: 26, a: 1 });
  assert.deepEqual(parseRgb("rgba(20, 22, 26, 0.4)"), { r: 20, g: 22, b: 26, a: 0.4 });
  assert.equal(parseRgb("transparent"), null);
});

test("large text takes the 3:1 allowance, and only when it qualifies", () => {
  assert.equal(requiredRatio({ fontSizePx: 24, fontWeight: "400" }), 3);
  assert.equal(requiredRatio({ fontSizePx: 19, fontWeight: "700" }), 3);
  assert.equal(requiredRatio({ fontSizePx: 19, fontWeight: "400" }), 4.5);
  assert.equal(requiredRatio({ fontSizePx: 14, fontWeight: "700" }), 4.5);
});

test("the palette this was written for", () => {
  // The dark accent before the fix, as text on the darkest surface it lands
  // on. If someone puts this value back, this test says what it costs.
  const oldAccent = judge({ color: "rgb(226, 59, 76)", background: "rgb(45, 48, 55)", fontSizePx: 12, fontWeight: "400" });
  assert.equal(oldAccent.passes, false);
  assert.ok(oldAccent.ratio < 3.2, `was ${oldAccent.ratio}`);

  const newAccent = judge({ color: "rgb(244, 112, 124)", background: "rgb(45, 48, 55)", fontSizePx: 12, fontWeight: "400" });
  assert.equal(newAccent.passes, true);

  // And the reason the fill flipped to dark ink: white on the new accent is
  // worse than white on the old one, so lightening it alone would have moved
  // the failure rather than fixed it.
  const whiteOnNew = judge({ color: "rgb(255, 255, 255)", background: "rgb(244, 112, 124)", fontSizePx: 14, fontWeight: "500" });
  assert.equal(whiteOnNew.passes, false);
  const inkOnNew = judge({ color: "rgb(20, 22, 26)", background: "rgb(244, 112, 124)", fontSizePx: 14, fontWeight: "500" });
  assert.equal(inkOnNew.passes, true);
});
