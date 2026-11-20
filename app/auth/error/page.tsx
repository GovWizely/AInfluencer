import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "Login problem · AInfluencer" };

const MESSAGES = {
  link: "That login link is invalid or has expired. Links work once and expire after 1 hour.",
  oauth: "We couldn't complete sign-in with Google.",
} as const;

export default function AuthErrorPage({
  searchParams,
}: PageProps<"/auth/error">) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">We couldn&apos;t log you in</h1>
        <Suspense fallback={<p>&nbsp;</p>}>
          <ErrorMessage searchParams={searchParams} />
        </Suspense>
        <Link
          href="/login"
          className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}

async function ErrorMessage({
  searchParams,
}: Pick<PageProps<"/auth/error">, "searchParams">) {
  const { reason } = await searchParams;
  const message = reason === "oauth" ? MESSAGES.oauth : MESSAGES.link;
  return <p className="text-neutral-600 dark:text-neutral-400">{message}</p>;
}
