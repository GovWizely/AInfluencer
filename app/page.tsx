import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <h1 className="text-4xl font-semibold">AInfluencer</h1>
      <p className="max-w-md text-neutral-600 dark:text-neutral-400">
        Auto-reply to DMs and comments in your own voice.
      </p>
      <Link
        href="/inbox"
        className="rounded-md bg-neutral-900 px-5 py-2.5 font-medium text-white dark:bg-white dark:text-neutral-900"
      >
        Get started
      </Link>
    </main>
  );
}
