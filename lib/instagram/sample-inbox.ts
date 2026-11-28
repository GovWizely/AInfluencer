import "server-only";

import { createHash } from "node:crypto";

import { FAN_NAMES } from "@/scripts/demo/dm-templates.mjs";
import demo from "@/supabase/fixtures/demo-instagram.json";

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

export function sampleInbox(handle: string) {
  const layout = demo.accounts.find(
    (account) => account.conversations.length > 0,
  );
  if (!layout) throw new Error("No sample conversations available");

  const fans = shuffled(FAN_NAMES, `${handle}:fans`);
  const lastNames = shuffled(surnames, `${handle}:surnames`);
  const themes = shuffled(topics, `${handle}:topics`);
  const prompts = shuffled(openers, `${handle}:prompts`);
  const audienceTag = digest(handle).slice(0, 10);

  return {
    accounts: [
      {
        ...layout,
        key: `preview:${handle}`,
        handle,
        display_name: null,
        bio: null,
        conversations: layout.conversations.map((thread, index) => {
          const [username, displayName] = fans[index % fans.length];
          const participantHandle = `${username}.${audienceTag}`;
          const participantName = `${displayName.split(" ")[0]} ${lastNames[index % lastNames.length]}`;
          const topic = themes[index % themes.length];
          const prompt = prompts[index % prompts.length];
          const punctuation = prompt === "I loved your post about" ? "!" : "?";

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
        }),
      },
    ],
  };
}
