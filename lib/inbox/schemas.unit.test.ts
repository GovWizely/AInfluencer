import { describe, expect, it } from "vitest";

import { accountFilterSchema, MAX_REPLY_LENGTH, replySchema } from "./schemas";

const conversationId = "6f1c7f0e-2f4b-4c9b-9a52-6a1d9f0b7e11";

describe("replySchema", () => {
  it("trims the body", () => {
    expect(
      replySchema.parse({ conversationId, body: "  hi there \n" }),
    ).toEqual({
      conversationId,
      body: "hi there",
    });
  });

  it("rejects blank and overlong replies", () => {
    expect(replySchema.safeParse({ conversationId, body: "   " }).success).toBe(
      false,
    );
    expect(
      replySchema.safeParse({
        conversationId,
        body: "x".repeat(MAX_REPLY_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      replySchema.safeParse({
        conversationId,
        body: "x".repeat(MAX_REPLY_LENGTH),
      }).success,
    ).toBe(true);
  });

  it("rejects invalid conversation ids", () => {
    expect(
      replySchema.safeParse({ conversationId: "1", body: "hi" }).success,
    ).toBe(false);
  });

  it("counts the UTF-8 size of replies with emoji", () => {
    expect(
      replySchema.safeParse({ conversationId, body: "🙂".repeat(250) }).success,
    ).toBe(true);
    const reply = replySchema.safeParse({
      conversationId,
      body: "🙂".repeat(250) + "a",
    });
    expect(reply.error?.issues[0]?.message).toBe(
      "Your reply is too long to send. Shorten it and try again.",
    );
  });
});

describe("accountFilterSchema", () => {
  it("ignores invalid ids", () => {
    expect(accountFilterSchema.parse(conversationId)).toBe(conversationId);
    expect(accountFilterSchema.parse("nope")).toBeUndefined();
    expect(accountFilterSchema.parse(undefined)).toBeUndefined();
  });
});
