import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateExpression, FormulaError, validateExpression } from "../src/index.ts";

test("kit: force / area on canonical SI", () => {
  const stress = evaluateExpression("force / area", { force: 50000, area: 0.0012 });
  assert.ok(Math.abs(stress - 41666666.6667) < 1);
});

test("kit: 0.5 * mass * speed^2", () => {
  const energy = evaluateExpression("0.5 * mass * speed^2", { mass: 80, speed: 5 });
  assert.equal(energy, 1000);
});

test("kit: sqrt, pi, unary minus", () => {
  const value = evaluateExpression("sqrt(2) * pi + -1", {});
  assert.ok(Math.abs(value - (Math.sqrt(2) * Math.PI - 1)) < 1e-12);
});

test("kit: lookup is optional context, not a product catalog", () => {
  const value = evaluateExpression("force / lookup(bolt, As)", { force: 10000 }, { tables: { bolt: { As: 84.3e-6 } } });
  assert.ok(Math.abs(value - 10000 / 84.3e-6) < 1e-6);
});

test("kit: division by zero carries the divisor name", () => {
  assert.throws(
    () => evaluateExpression("force / area", { force: 1, area: 0 }),
    (error) => error instanceof FormulaError && error.fieldId === "area",
  );
});

test("kit: validateExpression rejects unknown names", () => {
  const message = validateExpression("force / width", ["force", "area"]);
  assert.match(String(message), /unknown name/i);
  assert.equal(validateExpression("force / area", ["force", "area"]), null);
});

test("kit: scientific notation is a number, not the constant e", () => {
  assert.equal(evaluateExpression("1e-6", {}), 1e-6);
  assert.equal(evaluateExpression("4.76e6", {}), 4.76e6);
  assert.equal(evaluateExpression("1E+9", {}), 1e9);
  assert.ok(Math.abs(evaluateExpression("cte*1e-6*deltaT*length", { cte: -6, deltaT: 80, length: 975 }) - -0.468) < 1e-12);
});

test("kit: hypot, atan2, logmean, eq", () => {
  assert.equal(evaluateExpression("hypot(3, 4)", {}), 5);
  assert.ok(Math.abs(evaluateExpression("atan2(0, 1)", {}) - 0) < 1e-12);
  assert.equal(evaluateExpression("logmean(10, 10)", {}), 10);
  assert.ok(Math.abs(evaluateExpression("logmean(10, 20)", {}) - (10 - 20) / Math.log(10 / 20)) < 1e-12);
  assert.equal(evaluateExpression("eq(1, 1)", {}), 1);
  assert.equal(evaluateExpression("eq(1, 2)", {}), 0);
});

// `-x^2` is -(x²) everywhere an engineer writes it — Python, MATLAB, and every
// textbook. Only Excel disagrees. Parsing the base as a unary expression gave
// (-x)², which flips the sign of a result with nothing on screen to show it.
test("kit: exponentiation binds tighter than a leading sign", () => {
  assert.equal(evaluateExpression("-2^2", {}), -4);
  assert.equal(evaluateExpression("-x^2", { x: 3 }), -9);
  assert.equal(evaluateExpression("(-2)^2", {}), 4);
  assert.equal(evaluateExpression("0-2^2", {}), -4);
});

test("kit: exponentiation stays right associative and takes a signed exponent", () => {
  assert.equal(evaluateExpression("2^3^2", {}), 512);
  assert.equal(evaluateExpression("2^-1", {}), 0.5);
  assert.equal(evaluateExpression("-2^-2", {}), -0.25);
});

// The failure that matters is not NaN — that is caught and reported. It is a
// finite, plausible, wrong number: logmean(10, 0) returned 0, which reads as a
// heat exchanger transferring nothing rather than one that cannot work.
test("kit: logmean refuses a pinch and a temperature cross", () => {
  assert.throws(() => evaluateExpression("logmean(10, 0)", {}), /pinch|positive/i);
  assert.throws(() => evaluateExpression("logmean(10, -5)", {}), /cross|positive/i);
  assert.throws(() => evaluateExpression("logmean(0, 0)", {}), /positive/i);
  assert.equal(evaluateExpression("logmean(10, 10)", {}), 10);
});

test("kit: log and sqrt name the domain they left", () => {
  assert.throws(() => evaluateExpression("sqrt(-1)", {}), /below zero/i);
  assert.throws(() => evaluateExpression("ln(0)", {}), /at and below zero/i);
  assert.throws(() => evaluateExpression("log(-3)", {}), /at and below zero/i);
  assert.equal(evaluateExpression("sqrt(9)", {}), 3);
});
