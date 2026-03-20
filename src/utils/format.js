export function digitsOnly(v = "") {
  return String(v).replace(/\D/g, "");
}