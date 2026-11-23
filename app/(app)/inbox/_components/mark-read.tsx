"use client";

import { useEffect } from "react";

import { markConversationRead } from "../actions";

// Runs after the thread is actually shown, so link prefetches don't mark
// conversations read.
export function MarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    void markConversationRead(conversationId);
  }, [conversationId]);
  return null;
}
