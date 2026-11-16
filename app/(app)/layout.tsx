import Link from "next/link";
import { Suspense } from "react";

import { UserMenu } from "./_components/user-menu";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <Link href="/inbox" className="font-semibold">
          AInfluencer
        </Link>
        <Suspense fallback={<div className="h-8" />}>
          <UserMenu />
        </Suspense>
      </header>
      <main className="flex flex-1 flex-col px-6 py-10">{children}</main>
    </div>
  );
}
