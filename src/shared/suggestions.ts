// src/shared/suggestions.ts
import type { Method } from "./domain";

export type VocabKey = "therapy" | "problem" | "method";
const PREFIX = "notizia_vocab_";

const SEEDS: Record<VocabKey, string[]> = {
  therapy: [
    "Psychotherapie",
    "Verhaltenstherapie",
    "Kognitive Verhaltenstherapie (CBT)",
    "Tiefenpsychologisch fundierte Psychotherapie",
    "Analytische Psychotherapie",
    "Systemische Therapie",
    "EMDR",
    "Hypnotherapie",
    "Traumatherapie",
    "Achtsamkeitsbasiert (MBSR/MBCT)",
    "Schmerztherapie",
    "Paartherapie",
    "Familientherapie",
    "Suchttherapie",
    "Coaching",
    "Beratung",
    "Physiotherapie",
    "Ergotherapie",
    "Logopädie",
  ],
  problem: [
    "Übergewicht",
    "Soziale Angst",
    "Panik",
    "Depression",
    "Schlafproblem",
    "Schmerzen",
    "Selbstwert",
    "Beziehungen",
    "Sonstige",
  ],
  method: ["Auflösende Hypnose", "Klassische Hypnose", "Coaching", "Sonstige"],
};

function read(key: VocabKey): string[] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(key: VocabKey, values: string[]) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(values));
  } catch {
    return;
  }
}

function normalizeDedup(a: string[]): string[] {
  const m = new Map<string, string>();
  for (const x of a) {
    const v = (x ?? "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (!m.has(k)) m.set(k, v);
  }
  return Array.from(m.values()).sort((a, b) => a.localeCompare(b, "de"));
}

export function getSuggestions(key: VocabKey): string[] {
  return normalizeDedup([...(SEEDS[key] ?? []), ...read(key)]);
}

export function learn(key: VocabKey, values: string[]) {
  if (!values?.length) return;
  const next = normalizeDedup([...read(key), ...values]);
  write(key, next);
}

export function addSuggestion(key: VocabKey, value: string) {
  learn(key, [value]);
}

// Mapping von freiem Text auf deine kanonische Method-Union
export function mapMethodLabelToCanonical(label: string): Method {
  const s = (label ?? "").toLowerCase();
  if (s.includes("auflös") || s.includes("aufloes"))
    return "aufloesende_hypnose";
  if (s.includes("klass")) return "klassische_hypnose";
  if (s.includes("coach")) return "coaching";
  return "other";
}
