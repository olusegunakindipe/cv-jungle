/**
 * Humanize AI output: strip dash punctuation, fix common grammar glitches,
 * and collapse duplicated first-person openers.
 */

/** Strip AI-looking dashes; keep real hyphenated words (e.g. "full-stack", "6+"). */
export function sanitizeAiText(text: string): string {
  return text
    .replace(/\u2014/g, ", ") // —
    .replace(/\u2013/g, ", ") // –
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ") // spaced hyphen used as a dash
    .replace(/,{2,}/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Collapse duplicated openers like "I am a I am a results-driven…". */
export function collapseRepeatedOpeners(text: string): string {
  let t = text;
  for (let i = 0; i < 8; i++) {
    const next = t
      .replace(/\bI am a(?:\s+I am a)+\b/gi, "I am a")
      .replace(/\bI am an(?:\s+I am an)+\b/gi, "I am an")
      .replace(/\bI'm a(?:\s+I'm a)+\b/gi, "I'm a")
      .replace(/\bI am(?:\s+I am)+\b/gi, "I am")
      .replace(/\bI\s+I\b/g, "I");
    if (next === t) break;
    t = next;
  }
  return t;
}

/** Light grammar cleanup for CV / LinkedIn prose. */
export function polishGrammar(text: string): string {
  let t = collapseRepeatedOpeners(sanitizeAiText(text));

  // "Highlights ... include Utilized..." → lowercase following verb
  t = t.replace(
    /\b(include|including|covers?|covered)\s+([A-Z][a-z])/g,
    (_m, prep: string, word: string) =>
      `${prep} ${word.charAt(0).toLowerCase()}${word.slice(1)}`
  );

  t = t
    .replace(/\bI is\b/gi, "I am")
    .replace(/\bI has\b/gi, "I have")
    .replace(/\bI brings\b/gi, "I bring")
    .replace(/\bI's\b/g, "my")
    .replace(/\bI am an?\s+I\b/gi, "I")
    .replace(/\s+([,.!?])/g, "$1");

  t = t.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_m, boundary: string, ch: string) => boundary + ch.toUpperCase()
  );

  return collapseRepeatedOpeners(sanitizeAiText(t));
}

/**
 * Convert third-person bio phrasing into first person.
 * Idempotent: safe if the text is already first person.
 */
export function toFirstPerson(text: string, fullName?: string): string {
  let t = sanitizeAiText(text);
  if (!t) return t;

  if (fullName?.trim()) {
    const name = fullName.trim();
    const parts = name.split(/\s+/).filter(Boolean);
    t = t.replace(new RegExp(escapeRegExp(name), "gi"), "I");
    if (parts.length >= 2) {
      const firstLast = `${parts[0]} ${parts[parts.length - 1]}`;
      t = t.replace(new RegExp(escapeRegExp(firstLast), "gi"), "I");
    }
    if (parts[0] && parts[0].length > 2) {
      t = t.replace(
        new RegExp(
          `\\b${escapeRegExp(parts[0])}\\b(?=\\s+(?:is|has|brings|was)\\b)`,
          "gi"
        ),
        "I"
      );
    }
  }

  t = t
    .replace(/\bThis candidate\b/gi, "I")
    .replace(/\bhe is\b/gi, "I am")
    .replace(/\bshe is\b/gi, "I am")
    .replace(/\bhe has\b/gi, "I have")
    .replace(/\bshe has\b/gi, "I have")
    .replace(/\bhe was\b/gi, "I was")
    .replace(/\bshe was\b/gi, "I was")
    .replace(/\bhe brings\b/gi, "I bring")
    .replace(/\bshe brings\b/gi, "I bring")
    .replace(/\bhe can\b/gi, "I can")
    .replace(/\bshe can\b/gi, "I can")
    .replace(/\bhimself\b/gi, "myself")
    .replace(/\bherself\b/gi, "myself")
    .replace(/\bhis\b/gi, "my")
    .replace(/\bher\b/gi, "my")
    .replace(/\b([.!?]\s+)He\b/g, "$1I")
    .replace(/\b([.!?]\s+)She\b/g, "$1I")
    .replace(/^He\b/, "I")
    .replace(/^She\b/, "I")
    .replace(/\bhe\b/g, "I")
    .replace(/\bshe\b/g, "I");

  // Only inject opener when the phrase is not already first-person
  t = t.replace(
    /(?<!\bI am an?\s+)\bResults-driven professional\b/gi,
    "I am a results-driven professional"
  );
  t = t.replace(
    /(?<!\bI am an?\s+)\bAccomplished professional\b/gi,
    "I am an accomplished professional"
  );

  t = t
    .replace(/\bI is\b/gi, "I am")
    .replace(/\bI has\b/gi, "I have")
    .replace(/\bI brings\b/gi, "I bring")
    .replace(/\bI I\b/g, "I")
    .replace(/\bI's\b/g, "my");

  return polishGrammar(t);
}

/** Final pass for any user-facing generated string. */
export function humanizeGeneratedText(text: string, fullName?: string): string {
  if (!text?.trim()) return "";

  // Already first person — do not re-run opener injection
  const alreadyFirstPerson = /^(I|I'm)\b/i.test(text.trim());
  const needsThirdPersonConvert =
    !alreadyFirstPerson &&
    (/\b(he|she|his|her|this candidate)\b/i.test(text) ||
      (Boolean(fullName?.trim()) &&
        new RegExp(escapeRegExp(fullName!.trim()), "i").test(text)) ||
      /(?<!\bI am an?\s+)\b(?:Results-driven|Accomplished)\s+professional\b/i.test(text));

  const converted = needsThirdPersonConvert
    ? toFirstPerson(text, fullName)
    : polishGrammar(text);
  return polishGrammar(converted);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
