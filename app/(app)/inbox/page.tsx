import { Suspense } from "react";

import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Inbox · AInfluencer" };

export default function InboxPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <Suspense fallback={<p>&nbsp;</p>}>
        <Greeting />
      </Suspense>
    </div>
  );
}

async function Greeting() {
  const user = await requireUser();
  return (
    <p className="text-neutral-600 dark:text-neutral-400">
      Signed in as {user.email}. DMs and comments will show up here.
    </p>
  );
}
