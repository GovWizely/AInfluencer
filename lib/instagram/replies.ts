export const replyWindowMs = 24 * 60 * 60 * 1000;
export const closedWindowMessage =
  "Instagram lets you reply here for 24 hours after their last message. You can reply here again when they send a new message.";

export function replyWindowOpen(lastInbound: string | null, now = Date.now()) {
  if (!lastInbound) return false;
  const received = Date.parse(lastInbound);
  return received <= now && now - received < replyWindowMs;
}

export function isDemoAccount(externalId: string) {
  return externalId.startsWith("demo:");
}
