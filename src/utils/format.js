export function digitsOnly(v = "") {
  return String(v).replace(/\D/g, "");
}

export function normalizeLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function sanitizePhone(raw) {
  return String(raw || "")
    .trim()
    .replace(/[ \-./()]/g, "");
}

export function isDigits(value) {
  return /^\d+$/.test(String(value || ""));
}

export function isBurkinaFasoCountry(value) {
  return ["burkina faso", "burkina", "bfa", "bf"].includes(normalizeLabel(value));
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
