"use client";

import { useActionState } from "react";

import { disconnectAccount } from "../actions";

export function DisconnectForm({
  accountId,
  accountLabel,
}: {
  accountId: string;
  accountLabel: string;
}) {
  const [state, action, pending] = useActionState(
    disconnectAccount.bind(null, accountId),
    { error: null },
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        aria-label={`Disconnect ${accountLabel}`}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {pending ? "Disconnecting…" : "Disconnect"}
      </button>
      {state.error ? (
        <p
          role="alert"
          className="text-right text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
