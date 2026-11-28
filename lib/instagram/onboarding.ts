import { z } from "zod";

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/^@/, ""))
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/)
      .refine((value) => !value.includes("..")),
  );

export const connectCookie = "instagram-connect";
export const connectCookieSchema = z.object({
  state: z.uuid(),
  ownerId: z.uuid(),
  handle: handleSchema,
});

export function inboxUrl(status: string, handle?: string) {
  return `/inbox?${new URLSearchParams({ instagram: status, ...(handle ? { handle } : {}) })}`;
}
