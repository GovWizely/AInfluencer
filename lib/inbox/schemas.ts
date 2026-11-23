import { z } from "zod";

export const MAX_REPLY_LENGTH = 1000;

export const replySchema = z.object({
  conversationId: z.uuid("Unknown conversation."),
  body: z
    .string()
    .trim()
    .min(1, "Write a reply first.")
    .max(
      MAX_REPLY_LENGTH,
      `Replies can be at most ${MAX_REPLY_LENGTH} characters.`,
    ),
});

export const accountFilterSchema = z.uuid().optional().catch(undefined);
