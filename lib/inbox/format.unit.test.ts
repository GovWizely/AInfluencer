import { describe, expect, it } from "vitest";

import { formatFollowers, formatRelativeTime, isUnread } from "./format";

const now = Date.parse("2026-11-23T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("formatRelativeTime", () => {
  it("formats compact relative times", () => {
    expect(formatRelativeTime(ago(30_000), now)).toBe("now");
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe("5m");
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe("3h");
    expect(formatRelativeTime(ago(2 * 86_400_000), now)).toBe("2d");
    expect(formatRelativeTime("2026-03-04T10:00:00Z", now)).toBe("Mar 4");
  });
});

describe("isUnread", () => {
  it("is unread when a fan message arrived after the last read", () => {
    expect(isUnread({ last_inbound_at: null, read_at: null })).toBe(false);
    expect(isUnread({ last_inbound_at: ago(1000), read_at: null })).toBe(true);
    expect(isUnread({ last_inbound_at: ago(1000), read_at: ago(2000) })).toBe(
      true,
    );
    expect(isUnread({ last_inbound_at: ago(2000), read_at: ago(1000) })).toBe(
      false,
    );
  });
});

describe("formatFollowers", () => {
  it("uses compact notation", () => {
    expect(formatFollowers(400)).toBe("400");
    expect(formatFollowers(38_003)).toBe("38K");
    expect(formatFollowers(1_520)).toBe("1.5K");
  });
});
