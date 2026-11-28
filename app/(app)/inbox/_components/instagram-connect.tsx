"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { handleSchema } from "@/lib/instagram/onboarding";

import { connectInstagram } from "../connect";

export function InstagramConnect({
  handle,
  demo,
}: {
  handle: string;
  demo: boolean;
}) {
  const [value, setValue] = useState(handle);
  const parsed = handleSchema.safeParse(value);

  return (
    <form action={connectInstagram} className="flex max-w-sm flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="instagram-handle" className="text-sm font-medium">
          Instagram handle
        </label>
        <input
          name="handle"
          id="instagram-handle"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="@yourhandle"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          required
          maxLength={31}
          aria-describedby="instagram-handle-description"
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
        />
        <p
          id="instagram-handle-description"
          className="text-sm text-neutral-500"
        >
          {parsed.success
            ? demo
              ? `Preview a sample inbox for @${parsed.data}.`
              : `We'll connect @${parsed.data} and bring its messages into your inbox.`
            : "Enter the username that appears on your Instagram profile."}
        </p>
      </div>
      <ConnectButton demo={demo} />
    </form>
  );
}

function ConnectButton({ demo }: { demo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
    >
      {pending
        ? demo
          ? "Opening sample inbox…"
          : "Connecting…"
        : demo
          ? "Open sample inbox"
          : "Connect Instagram"}
    </button>
  );
}
