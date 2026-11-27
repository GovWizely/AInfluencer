import { describe, expect, it } from "vitest";

import {
  isSocialPlatform,
  socialCallbackUrl,
  socialProviders,
} from "./providers";

describe("social provider registry", () => {
  it("lists the supported platforms in settings order", () => {
    expect(Object.entries(socialProviders)).toEqual([
      ["instagram", { name: "Instagram" }],
      ["facebook", { name: "Facebook" }],
      ["reddit", { name: "Reddit" }],
    ]);
  });

  it.each(["twitter", "Instagram", "constructor", "__proto__"])(
    "rejects unknown platform %s",
    (platform) => expect(isSocialPlatform(platform)).toBe(false),
  );

  it.each(["instagram", "facebook", "reddit"] as const)(
    "uses the registered local callback URL for %s",
    (platform) => {
      expect(isSocialPlatform(platform)).toBe(true);
      expect(socialCallbackUrl("http://127.0.0.1:3000", platform)).toBe(
        `http://127.0.0.1:3000/settings/accounts/${platform}/callback`,
      );
    },
  );
});
