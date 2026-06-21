import path from "path";
import {
  isBurkinaFasoCountry,
  isDigits,
  normalizeBurkinaPhone,
  normalizeLabel,
  sanitizePhone,
} from "../src/utils/format.js";

export function pickFirst(row, keys = []) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function dateFromParts(year, month, day) {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function normalizeBirthDate(value) {
  if (value === undefined || value === null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + Math.trunc(value) * 86400000);
    return dateFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return dateFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    return dateFromParts(Number(slash[3]), Number(slash[2]), Number(slash[1]));
  }

  return null;
}

const MOBILE_MTN_PREFIXES = new Set([
  "04", "05", "06", "44", "45", "46", "54", "55", "56", "64", "65", "66",
  "74", "75", "76", "84", "85", "86", "95", "96",
]);

const MOBILE_ORANGE_PREFIXES = new Set([
  "07", "08", "09", "47", "48", "49", "57", "58", "59", "67", "68", "69",
  "77", "78", "79", "87", "88", "89", "97", "98",
]);

const MOBILE_MOOV_PREFIXES = new Set([
  "01", "02", "03", "40", "41", "42", "43", "50", "51", "52", "53", "70",
  "71", "72", "73", "81", "82", "83",
]);

const ORANGE_FIX_PREFIXES = new Set([
  "202", "203", "212", "213", "215", "224", "225", "234", "235", "243",
  "244", "245", "306", "316", "319", "327", "337", "347", "359", "368",
]);

export function isIvoryCoastCountry(value) {
  const normalized = normalizeLabel(value);
  return [
    "cote d ivoire ivory coast",
    "cote d ivoire",
    "ivory coast",
    "cote divoire ivory coast",
    "cote divoire",
  ].includes(normalized);
}

function isValidCiTenDigits(num) {
  if (!isDigits(num) || String(num).length !== 10) return false;
  const prefix2 = String(num).slice(0, 2);
  const prefix4 = String(num).slice(0, 4);
  if (prefix2 === "05" || prefix2 === "07" || prefix2 === "01") return true;
  return prefix4 === "2522" || prefix4 === "2720" || prefix4 === "2120";
}

function convertMobile8Digits(num) {
  const prefix = String(num).slice(0, 2);
  if (MOBILE_MTN_PREFIXES.has(prefix)) return `05${num}`;
  if (MOBILE_ORANGE_PREFIXES.has(prefix)) return `07${num}`;
  if (MOBILE_MOOV_PREFIXES.has(prefix)) return `01${num}`;
  return null;
}

function correctFixedTenDigits(num) {
  const prefix3 = String(num).slice(0, 3);
  const prefix4 = String(num).slice(0, 4);

  if (
    ["200", "210", "220", "230", "240", "300", "310", "320", "330", "350", "360"].includes(
      prefix3,
    )
  ) {
    return `25${num}`;
  }

  if (ORANGE_FIX_PREFIXES.has(prefix3)) {
    return `27${num}`;
  }

  if (["208", "218", "228", "238"].includes(prefix3)) {
    return `21${num}`;
  }

  if (prefix4 === "2522" || prefix4 === "2720" || prefix4 === "2120") {
    return num;
  }

  return null;
}

export function normalizeCiPhone(rawPhone) {
  const original = String(rawPhone || "").trim();
  if (!original) {
    return { phone: null, status: "empty", reason: null };
  }

  let cleanNum = sanitizePhone(original);
  if (!cleanNum) {
    return { phone: null, status: "empty", reason: null };
  }

  if (isValidCiTenDigits(cleanNum)) {
    return { phone: cleanNum, status: "normalized", reason: null };
  }

  if (cleanNum.startsWith("000")) {
    cleanNum = cleanNum.slice(3);
  } else if (cleanNum.startsWith("00") && cleanNum.length > 10) {
    cleanNum = cleanNum.slice(2);
  } else if (cleanNum.startsWith("00") && cleanNum.length === 10) {
    cleanNum = cleanNum.slice(2);
  }

  if (
    cleanNum.startsWith("002") ||
    cleanNum.startsWith("003") ||
    cleanNum.startsWith("001")
  ) {
    cleanNum = cleanNum.slice(2);
  }

  if (isValidCiTenDigits(cleanNum)) {
    return { phone: cleanNum, status: "normalized", reason: null };
  }

  if (isDigits(cleanNum) && cleanNum.length === 8) {
    const converted = convertMobile8Digits(cleanNum);
    if (converted) {
      return { phone: converted, status: "normalized", reason: null };
    }
    return {
      phone: null,
      status: "invalid",
      reason: `Prefixe mobile non reconnu: ${cleanNum}`,
    };
  }

  if (isDigits(cleanNum) && cleanNum.length === 10) {
    const corrected = correctFixedTenDigits(cleanNum);
    if (corrected) {
      return { phone: corrected, status: "normalized", reason: null };
    }
    return {
      phone: null,
      status: "invalid",
      reason: `Fixe non reconnu: ${cleanNum}`,
    };
  }

  if (isDigits(cleanNum) && cleanNum.length > 10) {
    const tail = cleanNum.slice(-10);
    if (isValidCiTenDigits(tail)) {
      return { phone: tail, status: "normalized", reason: null };
    }
  }

  return {
    phone: null,
    status: "invalid",
    reason: `Format non reconnu: ${original}`,
  };
}

export function normalizeGeneralPhone(rawPhone) {
  const cleanNum = sanitizePhone(rawPhone);
  return cleanNum || null;
}

export function normalizeSourceRow(row) {
  const fbo_number = pickFirst(row, ["FBO ID", "FBO_ID", "FBO_Number", "FBO Number"]);
  const full_name = pickFirst(row, ["Name", "Full Name", "Member Name"]);
  const op_country = pickFirst(row, ["Member OpCo", "Op_Country", "op_country", "Member Opco"]);
  const country = pickFirst(row, ["Member Country", "Country", "country"]);
  const grade = pickFirst(row, ["Member Level", "Grade", "Level"]);
  const rawPhone = pickFirst(row, [
    "Phone 1",
    "Mobile Phone",
    "Phone",
    "Phone ",
    "phone",
    "mobile",
    "Mobile",
  ]);
  const rawEmail = pickFirst(row, [
    "Email",
    "E-mail",
    "email",
    "Mail",
    "mail",
    "Email Address",
    "email_address",
  ]);
  const rawBirthDate = row?.["Birth Date"] ?? row?.["Date de naissance"] ?? row?.birth_date;

  let phoneInfo;
  if (isIvoryCoastCountry(country)) {
    phoneInfo = normalizeCiPhone(rawPhone);
  } else if (isBurkinaFasoCountry(country) || isBurkinaFasoCountry(op_country)) {
    phoneInfo = normalizeBurkinaPhone(rawPhone);
  } else {
    phoneInfo = {
      phone: normalizeGeneralPhone(rawPhone),
      status: rawPhone ? "preserved" : "empty",
      reason: null,
    };
  }

  return {
    row,
    normalized: {
      fbo_number: String(fbo_number || "").trim(),
      full_name: String(full_name || "").trim(),
      grade: String(grade || "").trim(),
      op_country: op_country || null,
      country: country || null,
      phone: phoneInfo.phone,
      email: normalizeEmail(rawEmail),
      birth_date: normalizeBirthDate(rawBirthDate),
    },
    phoneInfo,
  };
}

export function chunkArray(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export function ensureReportFileName(sourcePath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.basename(sourcePath, path.extname(sourcePath));
  return `import-report-${base}-${stamp}.json`;
}
