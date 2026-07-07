// Stub module: semantic number parsing for the rebuild-poc POC.
// In Droid this is `semanticNumber(schema)` — a helper that wraps a zod
// numeric schema so human-friendly counts (e.g. "1.2k") are parsed into
// numbers. We implement it as a real zod transform wrapper.
import { z } from "zod";

function parseSemantic(raw) {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return NaN;
  const m = raw.trim().match(/^([\d.]+)\s*([kmb])?$/i);
  if (!m) return NaN;
  const base = parseFloat(m[1]);
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[m[2]?.toLowerCase()] ?? 1;
  return base * mult;
}

export function semanticNumber(schema) {
  return z.union([schema, z.string().transform((v) => parseSemantic(v))]);
}

export const parseSemanticNumber = parseSemantic;
