import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export function validSignature(
  secret: string,
  bytes: Buffer,
  signature: string | null,
) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(bytes).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}

const messaging = z.object({
  sender: z.object({ id: z.string() }),
  recipient: z.object({ id: z.string() }),
  timestamp: z.number().int().nonnegative().max(8.64e15),
  message: z
    .object({
      mid: z.string().min(1),
      text: z.string().optional(),
      is_echo: z.boolean().optional(),
      is_deleted: z.boolean().optional(),
    })
    .optional(),
});

const envelope = z.object({
  object: z.literal("instagram"),
  entry: z.array(
    z.object({ id: z.string(), messaging: z.array(z.unknown()).optional() }),
  ),
});

export function parseEvents(payload: unknown) {
  const event = envelope.safeParse(payload);
  if (!event.success) return [];
  return event.data.entry.flatMap((entry) =>
    (entry.messaging ?? []).flatMap((candidate) => {
      const parsed = messaging.safeParse(candidate);
      if (!parsed.success) return [];
      const { message, sender, recipient, timestamp } = parsed.data;
      if (!message) return [];
      const outbound = sender.id === entry.id;
      if (
        (!outbound && recipient.id !== entry.id) ||
        (message.is_echo && !outbound)
      )
        return [];
      return [
        {
          accountId: entry.id,
          participantId: outbound ? recipient.id : sender.id,
          messageId: message.mid,
          deleted: message.is_deleted === true,
          text: message.text,
          sentAt: new Date(timestamp).toISOString(),
          outbound,
        },
      ];
    }),
  );
}
