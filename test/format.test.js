import test from "node:test";
import assert from "node:assert/strict";
import {
  isBurkinaFasoCountry,
  normalizeBurkinaPhone,
} from "../src/utils/format.js";

test("detects Burkina Faso country aliases", () => {
  assert.equal(isBurkinaFasoCountry("Burkina Faso"), true);
  assert.equal(isBurkinaFasoCountry("BFA"), true);
  assert.equal(isBurkinaFasoCountry("bf"), true);
  assert.equal(isBurkinaFasoCountry("Cote d'Ivoire"), false);
});

test("normalizes Burkina Faso phone numbers to eight digits", () => {
  assert.equal(normalizeBurkinaPhone("+226 70 12 34 56").phone, "70123456");
  assert.equal(normalizeBurkinaPhone("0022670123456").phone, "70123456");
  assert.equal(normalizeBurkinaPhone("22670123456").phone, "70123456");
});

test("rejects invalid Burkina Faso phone numbers", () => {
  const result = normalizeBurkinaPhone("123");

  assert.equal(result.phone, null);
  assert.equal(result.status, "invalid");
  assert.match(result.reason, /Format Burkina non reconnu/);
});
