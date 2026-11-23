import { describe, expect, it } from "vitest";

import {
  createRandom,
  isIndividualCreator,
  looksEnglish,
  profileIdentifiers,
  scrubCaption,
  topHashtags,
} from "./anonymize.mjs";

describe("scrubCaption", () => {
  it("removes mentions, emails, URLs and phone numbers", () => {
    const caption =
      "Thanks @jane.doe_99 for the tip! Mail me at jane@example.com, see https://example.com/x or www.site.org and mysite.dev. Call +1 (555) 123-4567 🚀 #coding";
    const result = scrubCaption(caption);
    expect(result).not.toMatch(/@|example\.com|https?:|www\.|mysite|555/);
    expect(result).toContain("Thanks for the tip!");
    expect(result).toContain("🚀 #coding");
  });

  it("removes the source account's own handle and name", () => {
    const identifiers = profileIdentifiers({
      account: "jane_codes",
      profile_name: "Jane Doe",
    });
    const result = scrubCaption(
      "New video on #jane_codes! Jane explains CSS grid.",
      identifiers,
    );
    expect(result.toLowerCase()).not.toContain("jane");
    expect(result).toContain("CSS grid");
  });

  it("keeps email-free text and unicode intact", () => {
    expect(scrubCaption("  Hello 👋\n\n\n\nworld ゆき  ")).toBe(
      "Hello 👋\n\nworld ゆき",
    );
    expect(scrubCaption(undefined)).toBe("");
  });
});

describe("looksEnglish", () => {
  it("accepts English prose and rejects other languages or hashtag walls", () => {
    expect(
      looksEnglish("Here is how you can make your first app with the new API"),
    ).toBe(true);
    expect(
      looksEnglish("Bugün yeni bir proje üzerinde çalışıyorum ve çok mutluyum"),
    ).toBe(false);
    expect(
      looksEnglish("#code #python #javascript #dev #linux #ui #it #go"),
    ).toBe(false);
  });
});

describe("isIndividualCreator", () => {
  const posts = [{ caption: "I built a thing" }, { caption: "My setup" }];
  it("excludes verified and organization-looking accounts", () => {
    expect(isIndividualCreator({ biography: "Dev", posts })).toBe(true);
    expect(isIndividualCreator({ is_verified: true, posts })).toBe(false);
    expect(
      isIndividualCreator({ biography: "Startup news company", posts }),
    ).toBe(false);
    expect(
      isIndividualCreator({
        biography: "Dev",
        posts: [{ caption: "Contact us today" }, { caption: "Our team" }],
      }),
    ).toBe(false);
  });
});

describe("helpers", () => {
  it("creates a deterministic random sequence", () => {
    const a = createRandom(1);
    const b = createRandom(1);
    expect([a(), a()]).toEqual([b(), b()]);
  });

  it("ranks hashtags by frequency", () => {
    expect(topHashtags(["#css #web", "#web #js", "#WEB"], 2)).toEqual([
      "web",
      "css",
    ]);
  });
});

describe("demo fixture", async () => {
  const { readFileSync } = await import("node:fs");
  const fixture = readFileSync("supabase/fixtures/demo-instagram.json", "utf8");

  it("contains no mentions, emails or links", () => {
    expect(fixture).not.toMatch(/@[\w.]+|https?:\/\/|www\.|\.com\b/);
  });
});
