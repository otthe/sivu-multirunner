import crypto from "node:crypto";

export function isTimingSafeEqual(a, b) {
  // constant-time compare for strings (best-effort)
  if (typeof a !== "string" || typeof b !== "string") return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function stripLeadingSlashes(p) {
  return String(p || "").replace(/^\/+/, "");
}