import Link from "next/link";

export const metadata = { title: "Login problem · AInfluencer" };

export default function AuthErrorPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">We couldn&apos;t log you in</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          That login link is invalid or has expired. Links work once and expire
          after 1 hour.
        </p>
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
