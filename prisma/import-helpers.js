import path from "path";

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

function normalizeLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

export function isBurkinaFasoCountry(value) {
  const normalized = normalizeLabel(value);
  return ["burkina faso", "burkina", "bfa", "bf"].includes(normalized);
}

function isDigits(value) {
  return /^\d+$/.test(String(value || ""));
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

function sanitizePhone(raw) {
  return String(raw || "")
    .trim()
    .replace(/[ \-./()]/g, "");
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

export function normalizeBurkinaPhone(rawPhone) {
  const original = String(rawPhone || "").trim();
  if (!original) {
    return { phone: null, status: "empty", reason: null, country: "BFA" };
  }

  let cleanNum = sanitizePhone(original);
  if (!cleanNum) {
    return { phone: null, status: "empty", reason: null, country: "BFA" };
  }

  if (cleanNum.startsWith("+226")) {
    cleanNum = cleanNum.slice(4);
  } else if (cleanNum.startsWith("00226")) {
    cleanNum = cleanNum.slice(5);
  } else if (cleanNum.startsWith("226") && cleanNum.length > 8) {
    cleanNum = cleanNum.slice(3);
  }

  while (cleanNum.startsWith("00") && cleanNum.length > 8) {
    cleanNum = cleanNum.slice(2);
  }

  if (isDigits(cleanNum) && cleanNum.length === 8) {
    return { phone: cleanNum, status: "normalized", reason: null, country: "BFA" };
  }

  return {
    phone: null,
    status: "invalid",
    reason: `Format Burkina non reconnu: ${original}`,
    country: "BFA",
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
