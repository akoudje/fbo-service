import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCiPhone,
  normalizeSourceRow,
} from "../prisma/import-helpers.js";

test("normalizes Ivory Coast eight-digit mobile numbers", () => {
  assert.deepEqual(normalizeCiPhone("44 12 34 56"), {
    phone: "0544123456",
    status: "normalized",
    reason: null,
  });
});

test("normalizes Ivory Coast mobile numbers by operator prefixes", () => {
  assert.equal(normalizeCiPhone("44 12 34 56").phone, "0544123456");
  assert.equal(normalizeCiPhone("47 12 34 56").phone, "0747123456");
  assert.equal(normalizeCiPhone("40 12 34 56").phone, "0140123456");
});

test("normalizes Ivory Coast fixed phone numbers", () => {
  assert.equal(normalizeCiPhone("2001234567").phone, "252001234567");
  assert.equal(normalizeCiPhone("2021234567").phone, "272021234567");
  assert.equal(normalizeCiPhone("2081234567").phone, "212081234567");
});

test("normalizes a complete source row", () => {
  const row = normalizeSourceRow({
    "FBO ID": " 123456789012 ",
    Name: "Ada Lovelace",
    "Member Level": "Manager",
    "Member Country": "Burkina Faso",
    "Phone 1": "+226 70 12 34 56",
    Email: " ADA@example.COM ",
  });

  assert.equal(row.normalized.fbo_number, "123456789012");
  assert.equal(row.normalized.full_name, "Ada Lovelace");
  assert.equal(row.normalized.grade, "Manager");
  assert.equal(row.normalized.phone, "70123456");
  assert.equal(row.normalized.email, "ada@example.com");
  assert.equal(row.phoneInfo.status, "normalized");
});

test("normalizes birth date from Excel serial numbers", () => {
  const row = normalizeSourceRow({
    "FBO ID": "123456789012",
    Name: "Ada Lovelace",
    "Member Level": "Manager",
    "Birth Date": 16418,
  });

  assert.equal(row.normalized.birth_date.toISOString(), "1944-12-12T00:00:00.000Z");
});

test("normalizes birth date from text columns", () => {
  const isoRow = normalizeSourceRow({
    "FBO ID": "123456789012",
    Name: "Ada Lovelace",
    "Member Level": "Manager",
    "Birth Date": "1984-08-01",
  });
  const frenchRow = normalizeSourceRow({
    "FBO ID": "123456789013",
    Name: "Grace Hopper",
    "Member Level": "Manager",
    "Date de naissance": "01/08/1984",
  });

  assert.equal(isoRow.normalized.birth_date.toISOString(), "1984-08-01T00:00:00.000Z");
  assert.equal(frenchRow.normalized.birth_date.toISOString(), "1984-08-01T00:00:00.000Z");
});

test("drops invalid emails without rejecting the row", () => {
  const row = normalizeSourceRow({
    "FBO ID": "123456789012",
    Name: "Ada Lovelace",
    "Member Level": "Manager",
    Email: "not-an-email",
  });

  assert.equal(row.normalized.email, null);
});
