import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth/session";
import {
  formatFollowers,
  formatRelativeTime,
  isUnread,
} from "@/lib/inbox/format";
import { listAccounts, listConversations } from "@/lib/inbox/queries";
import { accountFilterSchema } from "@/lib/inbox/schemas";
import { isDemoAccount } from "@/lib/instagram/replies";

import { InstagramOnboarding } from "./_components/instagram-onboarding";

export const metadata = { title: "Inbox · AInfluencer" };

export default function InboxPage({ searchParams }: PageProps<"/inbox">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <Suspense
        fallback={<p className="text-neutral-500">Loading conversations...</p>}
      >
        <Inbox searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Inbox({
  searchParams,
}: Pick<PageProps<"/inbox">, "searchParams">) {
  await requireUser();
  const { account, platform, instagram, handle } = await searchParams;
  const platformFilter = platform === "instagram" ? platform : undefined;
  const accountId = accountFilterSchema.parse(
    typeof account === "string" ? account : undefined,
  );

  const accounts = await listAccounts();
  const onboarding = (
    <InstagramOnboarding
      empty={!accounts.length}
      status={instagram}
      handle={handle}
      hasDemo={accounts.some((account) => isDemoAccount(account.external_id))}
    />
  );
  if (accounts.length === 0) return onboarding;

  const selected = accounts.find((a) => a.id === accountId);
  const conversations = await listConversations(selected?.id, platformFilter);
  const platformQuery = platformFilter ? "?platform=instagram" : "";

  return (
    <div className="flex flex-col gap-4">
      {onboarding}
      <nav aria-label="Filter by platform" className="flex flex-wrap gap-2">
        <FilterChip
          href="/inbox"
          active={!platformFilter}
          label="All platforms"
        />
        <FilterChip
          href="/inbox?platform=instagram"
          active={!!platformFilter}
          label="Instagram"
        />
      </nav>
      <nav aria-label="Filter by account" className="flex flex-wrap gap-2">
        <FilterChip
          href={`/inbox${platformQuery}`}
          active={!selected}
          label="All accounts"
        />
        {accounts.map((a) => (
          <FilterChip
            key={a.id}
            href={`/inbox${platformQuery ? platformQuery + "&" : "?"}account=${a.id}`}
            active={selected?.id === a.id}
            label={`@${a.handle}`}
            detail={formatFollowers(a.followers)}
          />
        ))}
      </nav>

      {conversations.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 p-6 text-center text-neutral-500 dark:border-neutral-700">
          No conversations{selected ? ` for @${selected.handle}` : ""} yet.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {conversations.map((c) => {
            const unread = isUnread(c);
            const name = c.participant_name || `@${c.participant_handle}`;
            return (
              <li key={c.id}>
                <Link
                  href={`/inbox/${c.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <span
                    aria-hidden
                    className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium uppercase dark:bg-neutral-800"
                  >
                    {c.participant_handle.slice(0, 1)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate ${unread ? "font-semibold" : ""}`}
                      >
                        {name}{" "}
                        <span className="font-normal text-neutral-500">
                          @{c.participant_handle}
                        </span>
                      </span>
                      {c.last_message_at ? (
                        <time
                          dateTime={c.last_message_at}
                          className="shrink-0 text-xs text-neutral-500"
                        >
                          {formatRelativeTime(c.last_message_at)}
                        </time>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`truncate text-sm ${unread ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500"}`}
                      >
                        {c.last_message_preview}
                      </span>
                      {unread ? (
                        <span className="ml-auto size-2 shrink-0 rounded-full bg-blue-600">
                          <span className="sr-only">Unread</span>
                        </span>
                      ) : null}
                    </span>
                    {selected ? null : (
                      <span className="text-xs text-neutral-400">
                        to @{c.account.handle}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  detail,
}: {
  href: string;
  active: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
          : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700"
      }`}
    >
      {label}
      {detail ? <span className="ml-1 opacity-60">{detail}</span> : null}
    </Link>
  );
}
