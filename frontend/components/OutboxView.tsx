"use client";

import { useCallback, useEffect, useState } from "react";
import type { OutboxMessage } from "@/lib/types";
import { getOutbox } from "@/lib/api";
import OutboxList from "./OutboxList";
import { EmptyState, ErrorState, Skeleton } from "./States";

export default function OutboxView() {
  const [messages, setMessages] = useState<OutboxMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setMessages(null);
    setError(null);
    getOutbox()
      .then(setMessages)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink">Citizen notification outbox</h1>
        <p className="text-sm text-gray-500">
          Status updates queued for citizens in their own language. WhatsApp
          delivery is the production channel.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : messages === null ? (
        <Skeleton className="h-64 w-full" />
      ) : messages.length === 0 ? (
        <EmptyState
          title="No messages queued yet"
          hint="Messages are generated when a citizen leaves a phone number."
        />
      ) : (
        <OutboxList messages={messages} />
      )}
    </div>
  );
}
