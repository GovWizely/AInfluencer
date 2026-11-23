// One-off: builds supabase/fixtures/demo-instagram.json from a scraped
// Instagram profile dataset. The raw dataset contains real accounts, so it
// must never be committed; only the anonymized output is.
//
// Usage: node scripts/build-demo-fixture.mjs <dataset.json>
import { readFileSync, writeFileSync } from "node:fs";

import {
  createRandom,
  isIndividualCreator,
  looksEnglish,
  pick,
  profileIdentifiers,
  scrubCaption,
  topHashtags,
} from "./demo/anonymize.mjs";
import {
  BRAND_NAMES,
  FAN_NAMES,
  LONG_THREAD,
  SPAM_NAMES,
  TEMPLATES,
} from "./demo/dm-templates.mjs";

const OUTPUT = "supabase/fixtures/demo-instagram.json";
const DAY_MINUTES = 24 * 60;

const CREATORS = [
  { target: 400, handle: "quietcommits", name: "Robin Hale", threads: 0 },
  { target: 1500, handle: "maya.ships.code", name: "Maya Torres", threads: 20 },
  { target: 8000, handle: "devwithdani", name: "Dani Okoro", threads: 20 },
  { target: 40000, handle: "byte.sized.ben", name: "Ben Carter", threads: 22 },
  { target: 120000, handle: "codewithkira", name: "Kira Sato", threads: 24 },
];

const THREAD_MIX = [
  "fan",
  "fan",
  "question",
  "fan",
  "brand_deal",
  "question",
  "collab",
  "spam",
  "fan",
  "question",
];

const [datasetPath] = process.argv.slice(2);
if (!datasetPath) {
  console.error("Usage: node scripts/build-demo-fixture.mjs <dataset.json>");
  process.exit(1);
}

const profiles = JSON.parse(readFileSync(datasetPath, "utf8"))
  .filter((p) => Array.isArray(p.posts) && isIndividualCreator(p))
  .map((p) => ({
    ...p,
    english: p.posts.filter((post) => looksEnglish(post.caption)),
  }))
  .filter((p) => p.english.length >= 10)
  .sort(
    (a, b) =>
      a.followers - b.followers || String(a.id).localeCompare(String(b.id)),
  );

const used = new Set();
const accounts = CREATORS.map((creator, index) => {
  const source = profiles
    .filter((p) => !used.has(p.id))
    .reduce((best, p) =>
      Math.abs(Math.log(p.followers / creator.target)) <
      Math.abs(Math.log(best.followers / creator.target))
        ? p
        : best,
    );
  used.add(source.id);
  const random = createRandom(index + 1);

  const identifiers = profileIdentifiers(source);
  const captions = source.english
    .map((post) => scrubCaption(post.caption, identifiers))
    .filter(Boolean);
  const tags = topHashtags(captions);
  const topics = tags.length > 0 ? tags : ["coding"];

  const latest = Math.max(...source.english.map((post) => post.datetime));
  const posts = source.english.map((post, i) => ({
    key: `post-${i + 1}`,
    caption: scrubCaption(post.caption, identifiers),
    days_ago: Math.round((latest - post.datetime) / 86400) + 1,
    like_count: post.likes ?? 0,
    comment_count: post.comments ?? 0,
  }));

  const firstName = creator.name.split(" ")[0];
  const conversations = [];
  for (let i = 0; i < creator.threads; i++) {
    const category = THREAD_MIX[i % THREAD_MIX.length];
    const [handle, name] =
      category === "brand_deal"
        ? BRAND_NAMES[i % BRAND_NAMES.length]
        : category === "spam"
          ? SPAM_NAMES[i % SPAM_NAMES.length]
          : FAN_NAMES[(i + index * 3) % FAN_NAMES.length];
    const brand = category === "brand_deal" ? name : "";
    const lines =
      i === 3 && creator.threads > 20
        ? LONG_THREAD
        : pick(random, TEMPLATES[category]);

    // Spread threads over the last ~10 days, newest first.
    const start =
      Math.round(i * 0.45 * DAY_MINUTES + random() * 300) + lines.length * 20;
    const messages = lines.map((line, m) => {
      const outbound = line.startsWith("creator:");
      const text = (outbound ? line.slice("creator:".length) : line)
        .replaceAll("{name}", firstName)
        .replaceAll("{topic}", pick(random, topics))
        .replaceAll("{brand}", brand);
      return {
        key: `m${m + 1}`,
        direction: outbound ? "outbound" : "inbound",
        body: text,
        minutes_ago: start - m * (10 + Math.round(random() * 15)),
      };
    });

    conversations.push({
      key: `thread-${i + 1}`,
      participant_handle: handle,
      participant_name: name,
      expected_category: category,
      read: messages.at(-1).direction === "outbound" || random() < 0.35,
      messages,
    });
  }

  return {
    key: `creator-${index + 1}`,
    handle: creator.handle,
    display_name: creator.name,
    bio: `${firstName} · posts about ${topics
      .slice(0, 3)
      .map((t) => `#${t}`)
      .join(" ")}`,
    followers: source.followers,
    posts,
    conversations,
  };
});

writeFileSync(
  OUTPUT,
  `${JSON.stringify(
    {
      version: 1,
      note: "Anonymized demo data. Handles, names, bios and DMs are fictional; post captions are scrubbed of mentions, links and emails.",
      accounts,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `Wrote ${OUTPUT}: ${accounts.length} accounts, ${accounts.reduce((n, a) => n + a.conversations.length, 0)} conversations`,
);
