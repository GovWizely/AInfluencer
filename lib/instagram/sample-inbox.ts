import "server-only";

import { createHash } from "node:crypto";

import type { createAdminClient } from "@/lib/supabase/admin";
import { FAN_NAMES } from "@/scripts/demo/dm-templates.mjs";
import { seedDemo } from "@/scripts/demo/seed.mjs";
import demo from "@/supabase/fixtures/demo-instagram.json";

const pendingPreviews = new Map<string, Promise<void>>();

const surnames = [
  "Ahmed",
  "Brooks",
  "Chen",
  "Costa",
  "Das",
  "Ellis",
  "Flores",
  "García",
  "Hassan",
  "Ito",
  "Khan",
  "Kim",
  "Lopez",
  "Mensah",
  "Miller",
  "Nguyen",
  "Okafor",
  "Park",
  "Patel",
  "Reyes",
  "Sato",
  "Wong",
];
const topics = [
  "video lighting",
  "writing captions",
  "planning a shoot",
  "getting better sound",
  "making a first Reel",
  "finding music",
  "editing on a phone",
  "batching posts",
  "taking better photos",
  "choosing a camera",
  "filming outdoors",
  "writing a script",
  "sharing a portfolio",
  "doing a livestream",
  "setting up a tripod",
  "editing interviews",
  "organizing clips",
  "making thumbnails",
  "working with a brand",
  "recording a voiceover",
];
const openers = [
  "Where would you start with",
  "Do you have a favorite tip for",
  "Would you make a tutorial about",
  "Could we do a joint post about",
  "I loved your post about",
];

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function shuffled<T>(items: readonly T[], seed: string) {
  return items
    .map((value, index) => ({ value, rank: digest(`${seed}:${index}`) }))
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .map(({ value }) => value);
}

export function sampleInbox(
  handle: string,
  occupiedHandles: Iterable<string>,
  existingThreadKeys: ReadonlySet<string> = new Set(),
) {
  const layout = demo.accounts.find(
    (account) => account.conversations.length > 0,
  );
  if (!layout) throw new Error("No sample conversations available");

  const fans = shuffled(FAN_NAMES, `${handle}:fans`);
  const lastNames = shuffled(surnames, `${handle}:surnames`);
  const themes = shuffled(topics, `${handle}:topics`);
  const prompts = shuffled(openers, `${handle}:prompts`);
  const usedHandles = new Set(occupiedHandles);
  usedHandles.add(handle);

  return {
    accounts: [
      {
        ...layout,
        key: `preview:${handle}`,
        handle,
        display_name: null,
        bio: null,
        conversations: layout.conversations
          .map((thread, index) => {
            if (existingThreadKeys.has(thread.key)) return null;

            const [username, displayName] = fans[index % fans.length];
            const surname = lastNames[index % lastNames.length];
            const givenHandle = username.split(/[._]/)[0];
            const familyHandle = surname
              .toLowerCase()
              .normalize("NFD")
              .replace(/\p{M}/gu, "");
            const baseHandle = `${givenHandle}.${familyHandle}`;
            let participantHandle = baseHandle;
            for (
              let variant = 2;
              usedHandles.has(participantHandle);
              variant++
            ) {
              participantHandle = `${baseHandle}_${variant}`;
            }
            usedHandles.add(participantHandle);
            const participantName = `${displayName.split(" ")[0]} ${surname}`;
            const topic = themes[index % themes.length];
            const prompt = prompts[index % prompts.length];
            const punctuation =
              prompt === "I loved your post about" ? "!" : "?";

            return {
              ...thread,
              participant_handle: participantHandle,
              participant_name: participantName,
              messages: thread.messages.map((message, turn) => ({
                ...message,
                body:
                  turn === 0
                    ? `Hey @${handle}! ${prompt} ${topic}${punctuation}`
                    : message.direction === "outbound"
                      ? `Thanks for writing, @${participantHandle}! I'm planning to share more about ${topic} soon.`
                      : `Thanks, @${handle}! I'll keep an eye out for more about ${topic}.`,
              })),
            };
          })
          .filter((thread) => thread !== null),
      },
    ],
  };
}

export async function seedSampleInbox(
  admin: ReturnType<typeof createAdminClient>,
  ownerId: string,
  handle: string,
) {
  const previous = pendingPreviews.get(ownerId) ?? Promise.resolve();
  const seed = previous.then(async () => {
    const prefix = `demo:${ownerId}:preview:`;
    const previewId = `${prefix}${handle}`;
    const occupiedHandles = new Set<string>();
    const existingThreadKeys = new Set<string>();
    const batchSize = 500;
    for (let offset = 0; ; offset += batchSize) {
      const { data, error } = await admin
        .from("social_accounts")
        .select("handle")
        .eq("owner_id", ownerId)
        .eq("platform", "instagram")
        .order("id")
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      for (const row of data) occupiedHandles.add(row.handle.toLowerCase());
      if (data.length < batchSize) break;
    }
    for (let offset = 0; ; offset += batchSize) {
      const { data, error } = await admin
        .from("conversations")
        .select(
          "external_id, participant_handle, account:social_accounts!inner(external_id)",
        )
        .eq("account.owner_id", ownerId)
        .eq("account.platform", "instagram")
        .like("account.external_id", `${prefix}%`)
        .order("id")
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      for (const row of data) {
        occupiedHandles.add(row.participant_handle);
        if (row.account.external_id === previewId)
          existingThreadKeys.add(row.external_id);
      }
      if (data.length < batchSize) break;
    }
    const fixture = sampleInbox(handle, occupiedHandles, existingThreadKeys);
    if (fixture.accounts[0].conversations.length > 0) {
      await seedDemo(admin, ownerId, fixture);
    }
  });
  const settled = seed.catch(() => {});
  pendingPreviews.set(ownerId, settled);
  try {
    await seed;
  } finally {
    if (pendingPreviews.get(ownerId) === settled)
      pendingPreviews.delete(ownerId);
  }
}
