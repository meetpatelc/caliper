import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { adminEmails, isAdminEmail } from "./admin.server.ts";

const original = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = original;
});

test("an unset allowlist admits nobody", () => {
  delete process.env.ADMIN_EMAILS;
  assert.equal(adminEmails().size, 0);
  assert.equal(isAdminEmail("anyone@example.com"), false);
});

test("an empty or whitespace allowlist admits nobody", () => {
  for (const value of ["", "   ", ",", " , , "]) {
    process.env.ADMIN_EMAILS = value;
    assert.equal(adminEmails().size, 0, JSON.stringify(value));
    assert.equal(isAdminEmail("anyone@example.com"), false, JSON.stringify(value));
  }
});

test("only listed emails are admins", () => {
  process.env.ADMIN_EMAILS = "owner@example.com, second@example.com";
  assert.equal(isAdminEmail("owner@example.com"), true);
  assert.equal(isAdminEmail("second@example.com"), true);
  assert.equal(isAdminEmail("someone@example.com"), false);
});

test("matching ignores case and surrounding whitespace", () => {
  process.env.ADMIN_EMAILS = "  Owner@Example.COM  ";
  assert.equal(isAdminEmail("owner@example.com"), true);
  assert.equal(isAdminEmail("  OWNER@EXAMPLE.com "), true);
});

test("a missing session email is never an admin", () => {
  // A user row can carry a null email; that must not match an empty entry.
  process.env.ADMIN_EMAILS = "owner@example.com";
  assert.equal(isAdminEmail(null), false);
  assert.equal(isAdminEmail(undefined), false);
  assert.equal(isAdminEmail(""), false);
});

test("a substring of an admin email is not an admin", () => {
  process.env.ADMIN_EMAILS = "owner@example.com";
  assert.equal(isAdminEmail("owner@example.com.attacker.test"), false);
  assert.equal(isAdminEmail("not-owner@example.com"), false);
});
