"use client";

import { useActionState, useEffect, useState } from "react";

import { MAX_REPLY_LENGTH } from "@/lib/inbox/schemas";
import { closedWindowMessage } from "@/lib/instagram/replies";

import type { ReplyFormState } from "../actions";

type ReplyFormProps = {
  action: (prev: ReplyFormState, formData: FormData) => Promise<ReplyFormState>;
  participant: string;
  demo: boolean;
  replyUntil?: number;
};

const initialState: ReplyFormState = { error: null };

export function ReplyForm({
  action,
  participant,
  demo,
  replyUntil,
}: ReplyFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (replyUntil === undefined) return;
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.max(0, replyUntil - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [replyUntil]);

  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <label htmlFor="reply-body" className="sr-only">
        Reply to {participant}
      </label>
      <textarea
        id="reply-body"
        name="body"
        rows={3}
        maxLength={MAX_REPLY_LENGTH}
        required
        defaultValue={state.body ?? ""}
        placeholder={`Reply to ${participant}`}
        disabled={expired}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "reply-error" : undefined}
        className="resize-y rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
      />
      <div className="flex items-center justify-between gap-4">
        {state.error ? (
          <p id="reply-error" role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        ) : (
          <p className="text-xs text-neutral-500">
            {expired
              ? closedWindowMessage
              : demo
                ? "This is a sample conversation. Replies stay here."
                : "Your reply will be sent on Instagram."}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || expired}
          className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
