import { requireUser } from "@/lib/auth/session";

import { signOut } from "../actions";

export async function UserMenu() {
  const user = await requireUser();

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">
        {user.email}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 font-medium dark:border-neutral-700"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
