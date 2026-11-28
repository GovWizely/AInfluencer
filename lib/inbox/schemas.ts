import { z } from "zod";

export const MAX_REPLY_LENGTH = 1000;

export const replySchema = z.object({
  conversationId: z.uuid("Unknown conversation."),
  body: z
    .string()
    .trim()
    .min(1, "Write a reply first.")
    .refine(
      (body) => new TextEncoder().encode(body).byteLength <= MAX_REPLY_LENGTH,
      "Your reply is too long to send. Shorten it and try again.",
    ),
});

export const accountFilterSchema = z.uuid().optional().catch(undefined);
