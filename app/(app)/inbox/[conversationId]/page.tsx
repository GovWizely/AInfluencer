import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { formatRelativeTime, isUnread } from "@/lib/inbox/format";
import { getConversation } from "@/lib/inbox/queries";

import { sendReply } from "../actions";
import { MarkRead } from "../_components/mark-read";
import { ReplyForm } from "../_components/reply-form";

export const metadata = { title: "Conversation · AInfluencer" };

export default function ConversationPage({
  params,
}: PageProps<"/inbox/[conversationId]">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/inbox" className="text-sm text-neutral-500 hover:underline">
        ← Inbox
      </Link>
      <Suspense
        fallback={<p className="text-neutral-500">Loading conversation...</p>}
      >
        <Conversation params={params} />
      </Suspense>
    </div>
  );
}

async function Conversation({
  params,
}: Pick<PageProps<"/inbox/[conversationId]">, "params">) {
  await requireUser();
  const { conversationId } = await params;
  if (!z.uuid().safeParse(conversationId).success) notFound();

  const conversation = await getConversation(conversationId);
  if (!conversation) notFound();

  const name =
    conversation.participant_name || `@${conversation.participant_handle}`;

  return (
    <>
      {isUnread(conversation) ? (
        <MarkRead conversationId={conversation.id} />
      ) : null}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-sm text-neutral-500">
          @{conversation.participant_handle} · to @{conversation.account.handle}
        </p>
      </header>

      <ol className="flex flex-col gap-3" aria-label="Messages">
        {conversation.messages.map((m) => {
          const outbound = m.direction === "outbound";
          return (
            <li
              key={m.id}
              className={`flex flex-col gap-1 ${outbound ? "items-end" : "items-start"}`}
            >
              <p
                className={`max-w-[80%] rounded-2xl px-4 py-2 whitespace-pre-wrap ${
                  outbound
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 dark:bg-neutral-800"
                }`}
              >
                {m.body}
              </p>
              <span className="text-xs text-neutral-500">
                {outbound ? "You" : name} ·{" "}
                <time dateTime={m.sent_at}>
                  {formatRelativeTime(m.sent_at)}
                </time>
              </span>
            </li>
          );
        })}
      </ol>

      <ReplyForm
        action={sendReply.bind(null, conversation.id)}
        participant={name}
      />
    </>
  );
}
