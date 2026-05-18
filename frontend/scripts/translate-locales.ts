#!/usr/bin/env node
/**
 * translate-locales.ts — AI-assisted i18n translation script
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/translate-locales.ts [en] [de] [nl]
 *
 * Reads messages/pl.json as source of truth. Diffs against target locale files
 * using a translation-lock.json hash check, then calls Claude to fill only the
 * missing/changed keys. Writes TRANSLATION_TODO.md listing all AI-generated
 * strings that await human review.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const MESSAGES_DIR = join(import.meta.dirname, "..", "messages");
const LOCK_FILE = join(MESSAGES_DIR, "translation-lock.json");
const TODO_FILE = join(import.meta.dirname, "..", "TRANSLATION_TODO.md");

const LOCALES = ["en", "de", "nl"] as const;
type Locale = (typeof LOCALES)[number];

const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "German (Deutsch)",
  nl: "Dutch (Nederlands)",
};

// ── helpers ──────────────────────────────────────────────────────────────────

type NestedObject = { [key: string]: string | NestedObject };

function flattenKeys(
  obj: NestedObject,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      result[path] = v;
    } else {
      Object.assign(result, flattenKeys(v, path));
    }
  }
  return result;
}

function setNestedKey(
  obj: NestedObject,
  path: string,
  value: string
): void {
  const parts = path.split(".");
  let cursor: NestedObject = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in cursor)) cursor[parts[i]] = {};
    cursor = cursor[parts[i]] as NestedObject;
  }
  cursor[parts[parts.length - 1]] = value;
}

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function loadJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

// ── translation via Claude ────────────────────────────────────────────────────

async function translateBatch(
  client: Anthropic,
  locale: Locale,
  entries: Record<string, string>
): Promise<Record<string, string>> {
  const pairs = Object.entries(entries);
  if (pairs.length === 0) return {};

  const inputJson = JSON.stringify(
    Object.fromEntries(pairs.map(([k, v]) => [k, v])),
    null,
    2
  );

  const systemPrompt = `You are a professional translator for a Polish staffing agency (Eurojob-West / Nexflow) that places temporary workers in warehouses and logistics roles across Poland and Germany.

Rules:
- Translate from Polish to ${LOCALE_NAMES[locale]}.
- Keep the staffing/labour-industry register: professional, clear, direct.
- Preserve all ICU placeholder syntax unchanged: {name}, {phone}, {days}, {h}, {month}, {year}.
- For German (DE): use formal "Sie" register throughout.
- For Dutch (NL): use formal "u" register throughout.
- Output ONLY valid JSON matching the exact key structure provided. No commentary, no markdown fences.`;

  const userPrompt = `Translate these Polish UI strings. Return a JSON object with the same keys but ${LOCALE_NAMES[locale]} values:

${inputJson}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Strip markdown fences if model adds them
  const cleaned = text.replace(/^```json\s*/m, "").replace(/\s*```$/m, "").trim();

  return JSON.parse(cleaned) as Record<string, string>;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  const targetLocales = (
    process.argv.slice(2).filter((a) => LOCALES.includes(a as Locale)).length >
    0
      ? process.argv.slice(2).filter((a) => LOCALES.includes(a as Locale))
      : [...LOCALES]
  ) as Locale[];

  // Load source of truth
  const plJson = loadJson<NestedObject>(
    join(MESSAGES_DIR, "pl.json"),
    {}
  );
  const plFlat = flattenKeys(plJson);

  // Load lock file — maps dotted PL key to SHA-256 of the PL value at last run
  type LockFile = Record<string, Record<string, string>>; // locale -> { key -> hash }
  const lock = loadJson<LockFile>(LOCK_FILE, {});

  const todoEntries: { locale: Locale; key: string; en: string }[] = [];

  for (const locale of targetLocales) {
    console.log(`\n── ${locale.toUpperCase()} ─────────────────────────────`);

    const outPath = join(MESSAGES_DIR, `${locale}.json`);
    const existing = loadJson<NestedObject>(outPath, {});
    const existingFlat = flattenKeys(existing);
    const localeLock = lock[locale] ?? {};

    // Find keys that need translation:
    // - missing in target, OR
    // - present but the PL source has changed (hash mismatch)
    const toTranslate: Record<string, string> = {};
    for (const [key, plValue] of Object.entries(plFlat)) {
      const currentHash = sha256(plValue);
      const lockedHash = localeLock[key];
      if (!(key in existingFlat) || lockedHash !== currentHash) {
        toTranslate[key] = plValue;
      }
    }

    const alreadyDone = Object.keys(plFlat).length - Object.keys(toTranslate).length;
    console.log(
      `  ${alreadyDone} keys already translated, ${Object.keys(toTranslate).length} to translate`
    );

    if (Object.keys(toTranslate).length === 0) {
      console.log("  ✓ nothing to do");
      continue;
    }

    // Translate in one batch (small enough for sonnet context)
    console.log(`  Calling Claude API…`);
    const translated = await translateBatch(client, locale, toTranslate);

    // Merge into existing output
    const merged: NestedObject = structuredClone(existing) as NestedObject;
    for (const [key, value] of Object.entries(translated)) {
      setNestedKey(merged, key, value);
      todoEntries.push({ locale, key, en: value });
    }

    writeFileSync(outPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
    console.log(`  ✓ wrote ${outPath}`);

    // Update lock hashes for translated keys
    lock[locale] = { ...localeLock };
    for (const key of Object.keys(toTranslate)) {
      lock[locale][key] = sha256(plFlat[key]);
    }
  }

  // Update lock file
  writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2) + "\n", "utf8");
  console.log("\n✓ Updated translation-lock.json");

  // Write TRANSLATION_TODO.md
  const now = new Date().toISOString().slice(0, 10);
  let todo = `# Translation TODO — pending human review\n\nGenerated ${now} by \`scripts/translate-locales.ts\`. Review and approve each string, then remove the row.\n\n`;

  for (const locale of targetLocales) {
    const localeEntries = todoEntries.filter((e) => e.locale === locale);
    if (localeEntries.length === 0) continue;
    todo += `## ${locale.toUpperCase()} — ${LOCALE_NAMES[locale]} (${localeEntries.length} strings)\n\n`;
    todo += `| Key | AI-generated value |\n|-----|--------------------|\n`;
    for (const { key, en } of localeEntries) {
      const escaped = en.replace(/\|/g, "\\|");
      todo += `| \`${key}\` | ${escaped} |\n`;
    }
    todo += "\n";
  }

  writeFileSync(TODO_FILE, todo, "utf8");
  console.log(`✓ Wrote TRANSLATION_TODO.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
