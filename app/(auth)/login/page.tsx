import { redirect } from "next/navigation";
import { Suspense } from "react";

import { isGoogleLoginEnabled } from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";

import { LoginForm } from "./_components/login-form";

export const metadata = { title: "Log in · AInfluencer" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Log in to AInfluencer</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          No password needed. We&apos;ll email you a link.
        </p>
      </div>
      <Suspense fallback={<div className="h-40 w-full" />}>
        <LoginFormSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginFormSection({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(nextParam);

  const [user, googleEnabled] = await Promise.all([
    getCurrentUser(),
    isGoogleLoginEnabled(),
  ]);
  if (user) redirect(next);

  return <LoginForm next={next} googleEnabled={googleEnabled} />;
}
