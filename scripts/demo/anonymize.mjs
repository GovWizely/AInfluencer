// Pure helpers for turning scraped Instagram data into anonymized demo data.

const MENTION = /(^|[^\w.])@[\w.]{1,30}/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const DOMAIN =
  /\b[\w-]+\.(?:com|net|org|io|dev|in|co|me|app|ly|gg|xyz)(?:\/\S*)?\b/gi;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;

/**
 * Removes @mentions, emails, URLs, phone numbers and any of the given
 * identifiers (e.g. the source account's handle or name) from a caption.
 */
export function scrubCaption(text, identifiers = []) {
  let result = String(text ?? "")
    .replace(EMAIL, "")
    .replace(URL_RE, "")
    .replace(DOMAIN, "")
    .replace(MENTION, "$1");
  for (const id of identifiers) {
    if (String(id).length < 4) continue;
    const escaped = String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`#?${escaped}`, "gi"), "");
  }
  return result
    .replace(PHONE, "")
    .replace(/(^|\s)@(?=\s|$)/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  "the and you your for with this that are have what how our from about will can just not but all get more when make new one out".split(
    " ",
  ),
);

/** Rough check that a caption is mostly English prose. */
export function looksEnglish(text) {
  const words = String(text ?? "")
    .toLowerCase()
    .replace(/#[\w]+/g, " ")
    .match(/[a-z']+/g);
  if (!words || words.length < 8) return false;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters === 0 || latin / letters < 0.95) return false;
  const hits = words.filter((w) => STOPWORDS.has(w)).length;
  return hits / words.length >= 0.12;
}

/** Deterministic PRNG (mulberry32) so fixtures are reproducible. */
export function createRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Handle and name tokens of a scraped profile, for scrubCaption. */
export function profileIdentifiers(profile) {
  const handle = String(profile.account ?? "");
  const tokens = [
    handle,
    ...handle.split(/[._]+/),
    ...String(profile.profile_name ?? "").split(/\s+/),
  ];
  return [
    ...new Set(
      tokens
        .map((t) => t.replace(/[^\p{L}\p{N}._]/gu, ""))
        .filter((t) => t.length >= 4),
    ),
  ];
}

const ORGANIZATION_BIO =
  /\b(we|we're|us|our|company|agency|news|official|store|shop|community)\b/i;
const ORGANIZATION_CAPTION = /\b(we|us|our)\b/i;

/** Whether a scraped profile looks like an individual creator, not a business or brand. */
export function isIndividualCreator(profile) {
  if (
    profile.is_verified ||
    ORGANIZATION_BIO.test(String(profile.biography ?? ""))
  )
    return false;
  const captions = (profile.posts ?? []).map((post) =>
    String(post.caption ?? ""),
  );
  const corporate = captions.filter((caption) =>
    ORGANIZATION_CAPTION.test(caption),
  ).length;
  return captions.length > 0 && corporate / captions.length < 0.3;
}

export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/** Most frequent hashtags across captions, without the leading '#'. */
export function topHashtags(captions, limit = 5) {
  const counts = new Map();
  for (const caption of captions) {
    for (const tag of String(caption)
      .toLowerCase()
      .match(/#[a-z][\w]{1,29}/g) ?? []) {
      const key = tag.slice(1);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}
