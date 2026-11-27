"use client";

import { useActionState } from "react";

import { MAX_REPLY_LENGTH } from "@/lib/inbox/schemas";

import type { ReplyFormState } from "../actions";

type ReplyFormProps = {
  action: (prev: ReplyFormState, formData: FormData) => Promise<ReplyFormState>;
  participant: string;
};

const initialState: ReplyFormState = { error: null };

export function ReplyForm({ action, participant }: ReplyFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

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
            Saved in AInfluencer only. Not sent to Instagram yet.
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
