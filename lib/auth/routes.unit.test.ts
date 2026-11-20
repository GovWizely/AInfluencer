import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIGNED_IN_PATH,
  isProtectedPath,
  loginPathFor,
  nextPathFromRedirect,
  safeNextPath,
} from "./routes";

describe("safeNextPath", () => {
  it.each([
    ["/inbox", "/inbox"],
    ["/settings/profile?tab=1#top", "/settings/profile?tab=1#top"],
    ["/inbox/../settings", "/settings"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "inbox",
    "//evil.com",
    "/\\evil.com",
    "https://evil.com/inbox",
    "javascript:alert(1)",
    "/inbox\n",
  ])("falls back to the default for %s", (input) => {
    expect(safeNextPath(input)).toBe(DEFAULT_SIGNED_IN_PATH);
  });
});

describe("nextPathFromRedirect", () => {
  it("keeps only the path of a full RedirectTo URL", () => {
    expect(nextPathFromRedirect("https://evil.com/settings?x=1")).toBe(
      "/settings?x=1",
    );
    expect(nextPathFromRedirect("http://127.0.0.1:3000")).toBe("/");
  });

  it("accepts relative paths", () => {
    expect(nextPathFromRedirect("/settings")).toBe("/settings");
    expect(nextPathFromRedirect("//evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
  });
});

describe("isProtectedPath", () => {
  it.each(["/inbox", "/inbox/123", "/settings", "/settings/billing"])(
    "protects %s",
    (path) => expect(isProtectedPath(path)).toBe(true),
  );

  it.each(["/", "/login", "/auth/confirm", "/inboxes", "/settingsx"])(
    "does not protect %s",
    (path) => expect(isProtectedPath(path)).toBe(false),
  );
});

describe("loginPathFor", () => {
  it("omits next for the default path", () => {
    expect(loginPathFor("/inbox")).toBe("/login");
  });

  it("encodes other paths", () => {
    expect(loginPathFor("/settings?tab=1")).toBe(
      "/login?next=%2Fsettings%3Ftab%3D1",
    );
  });
});
