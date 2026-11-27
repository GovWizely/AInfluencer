import { Suspense } from "react";

import { requireUser } from "@/lib/auth/session";
import { isSocialPlatform, socialProviders } from "@/lib/social/providers";
import { createClient } from "@/lib/supabase/server";

import { DisconnectForm } from "./_components/disconnect-form";

export const metadata = { title: "Social accounts · AInfluencer" };

export default function AccountsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-neutral-500">Settings</p>
        <h1 className="text-2xl font-semibold">Social accounts</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Manage the accounts connected to AInfluencer.
        </p>
      </header>
      <Suspense
        fallback={<p className="text-neutral-500">Loading accounts…</p>}
      >
        <AccountList />
      </Suspense>
    </div>
  );
}

async function AccountList() {
  await requireUser();
  const supabase = await createClient();
  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select("id, platform, handle, display_name")
    .order("handle");
  if (error) throw new Error(`Failed to load accounts: ${error.message}`);

  const byPlatform = Map.groupBy(accounts, (account) => account.platform);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        Connecting new accounts isn&apos;t available yet. Disconnecting an
        account deletes its imported data, its conversations, and any replies
        you&apos;ve saved for that account.
      </p>
      {Object.keys(socialProviders)
        .filter(isSocialPlatform)
        .map((platform) => {
          const { name } = socialProviders[platform];
          const connected = byPlatform.get(platform) ?? [];

          return (
            <section
              key={platform}
              aria-labelledby={`${platform}-heading`}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <h2 id={`${platform}-heading`} className="font-semibold">
                  {name}
                </h2>
                <button
                  type="button"
                  disabled
                  aria-label={`Connect ${name}`}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-500 dark:border-neutral-800"
                >
                  Connect
                </button>
              </div>
              {connected.length ? (
                <ul className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {connected.map((account) => {
                    const handle =
                      platform === "reddit"
                        ? `u/${account.handle}`
                        : `@${account.handle}`;

                    return (
                      <li
                        key={account.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {account.display_name || handle}
                          </p>
                          {account.display_name ? (
                            <p className="truncate text-sm text-neutral-500">
                              {handle}
                            </p>
                          ) : null}
                        </div>
                        <DisconnectForm
                          accountId={account.id}
                          accountLabel={`${name} ${handle}`}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800">
                  No accounts connected.
                </p>
              )}
            </section>
          );
        })}
    </div>
  );
}
