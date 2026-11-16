import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "Check your email · AInfluencer" };

export default function CheckEmailPage({
  searchParams,
}: PageProps<"/login/check-email">) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        We sent a login link to{" "}
        <Suspense fallback="your email">
          <EmailAddress searchParams={searchParams} />
        </Suspense>
        . The link expires in 1 hour.
      </p>
      <Link href="/login" className="text-sm underline">
        Use a different email
      </Link>
    </div>
  );
}

async function EmailAddress({
  searchParams,
}: Pick<PageProps<"/login/check-email">, "searchParams">) {
  const { email } = await searchParams;
  const value = Array.isArray(email) ? email[0] : email;
  return value ? <strong>{value}</strong> : "your email";
}
