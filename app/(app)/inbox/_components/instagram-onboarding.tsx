import { publicEnv } from "@/lib/env";
import { instagramConfig } from "@/lib/instagram/config";
import { handleSchema } from "@/lib/instagram/onboarding";
import { isLocalSupabaseUrl } from "@/scripts/demo/seed.mjs";

import { InstagramConnect } from "./instagram-connect";

const messages = {
  failed: "We couldn't connect Instagram. Please try again.",
  expired: "That connection attempt expired. Please try again.",
  denied:
    "Instagram wasn't connected. If you're using a personal account, follow the guide below and try again.",
  personal:
    "Your Instagram is a personal account. Follow the steps below to switch to a Creator account.",
  different:
    "You signed in to a different Instagram account. Try again with the account that matches your handle.",
  invalid: "Enter a valid Instagram handle, such as @yourhandle.",
  import_failed:
    "Your Instagram is connected, but we couldn't bring in all your messages. Connect it again to try the import once more.",
  taken: "This Instagram account is already connected to another inbox.",
  connected: "Instagram is connected. Available messages are in your inbox.",
  demo: "This is a sample inbox. Your Instagram account isn't connected, and no messages will be sent.",
  unavailable: "Connecting Instagram is coming soon.",
};

export function InstagramOnboarding({
  empty,
  status,
  handle,
  hasDemo,
}: {
  empty: boolean;
  status: unknown;
  handle: unknown;
  hasDemo: boolean;
}) {
  const enabled = !!instagramConfig();
  const demo =
    !enabled &&
    process.env.NODE_ENV === "development" &&
    !!process.env.SUPABASE_SECRET_KEY &&
    isLocalSupabaseUrl(publicEnv.NEXT_PUBLIC_SUPABASE_URL);
  const pendingHandle = handleSchema.safeParse(handle);
  const notice =
    typeof status === "string" && Object.hasOwn(messages, status)
      ? messages[status as keyof typeof messages]
      : null;
  const guided = status === "personal" || status === "denied";
  const form =
    enabled || demo ? (
      <InstagramConnect
        key={pendingHandle.data}
        handle={pendingHandle.data ?? ""}
        demo={demo}
      />
    ) : (
      <p className="text-sm text-neutral-500">
        Connecting Instagram is coming soon.
      </p>
    );

  return (
    <section aria-label="Connect Instagram" className="flex flex-col gap-4">
      {notice || hasDemo ? (
        <p
          role="status"
          className="rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800"
        >
          {notice ??
            "Sample conversations aren't connected to Instagram. Replies to them stay here."}
        </p>
      ) : null}
      {empty ? (
        <div className="flex flex-col gap-4 rounded-md border border-neutral-300 p-6 dark:border-neutral-700">
          <h2 className="text-xl font-semibold">Set up your inbox</h2>
          <p className="text-sm text-neutral-500">
            Add your Instagram handle to get started. More platforms are coming
            soon.
          </p>
          {guided ? <CreatorGuide open /> : null}
          {form}
          {!guided ? <CreatorGuide /> : null}
        </div>
      ) : (
        <details open={guided || status === "import_failed" || undefined}>
          <summary className="cursor-pointer text-sm font-medium">
            {demo ? "Preview another handle" : "Connect Instagram"}
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            {guided ? <CreatorGuide open /> : null}
            {form}
            {!guided ? <CreatorGuide /> : null}
          </div>
        </details>
      )}
    </section>
  );
}

function CreatorGuide({ open }: { open?: boolean }) {
  return (
    <details open={open} className="text-sm">
      <summary className="cursor-pointer font-medium">
        Using a personal account? Switch to a Creator account
      </summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-neutral-600 dark:text-neutral-300">
        <li>
          Open the Instagram app, go to your profile, and tap the menu (☰) at
          the top right.
        </li>
        <li>
          Under For professionals, tap <strong>Account type and tools</strong>,
          then <strong>Switch to professional account</strong>.
        </li>
        <li>
          Choose a category that describes what you do. Select{" "}
          <strong>Creator</strong> and follow the prompts. Creator accounts are
          public.
        </li>
        <li>Come back here to connect Instagram when you&apos;re ready.</li>
      </ol>
    </details>
  );
}
