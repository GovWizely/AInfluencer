const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact relative time like "now", "5m", "3h", "2d" or "Mar 4". */
export function formatRelativeTime(iso: string, now: number = Date.now()) {
  const elapsed = now - new Date(iso).getTime();
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function isUnread(conversation: {
  last_inbound_at: string | null;
  read_at: string | null;
}) {
  if (!conversation.last_inbound_at) return false;
  if (!conversation.read_at) return true;
  return (
    new Date(conversation.last_inbound_at) > new Date(conversation.read_at)
  );
}

export function formatFollowers(count: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count);
}
