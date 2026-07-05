"use client";

import { useCallback, useEffect, useState } from "react";
import type { OutboxMessage } from "@/lib/types";
import { getOutbox } from "@/lib/api";
import OutboxList from "./OutboxList";
import PageHeader from "./PageHeader";
import LoadMore from "./LoadMore";
import { EmptyState, ErrorState, Skeleton } from "./States";

const PAGE_SIZE = 12;

export default function OutboxView() {
  const [items, setItems] = useState<OutboxMessage[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setItems(null);
    setError(null);
    getOutbox({ limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        setItems(page.items);
        setTotal(page.total);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const loadMore = useCallback(() => {
    if (!items) return;
    setLoadingMore(true);
    getOutbox({ limit: PAGE_SIZE, offset: items.length })
      .then((page) => {
        setItems((prev) => [...(prev ?? []), ...page.items]);
        setTotal(page.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoadingMore(false));
  }, [items]);

  return (
    <div>
      <PageHeader
        eyebrow="Closing the loop"
        title="Citizen notification outbox"
        subtitle="Status updates queued for every citizen in their own language — WhatsApp is the production delivery channel."
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items === null ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No messages queued yet"
          hint="Messages are generated when a citizen leaves a phone number."
        />
      ) : (
        <>
          <OutboxList messages={items} />
          <LoadMore
            shown={items.length}
            total={total}
            loading={loadingMore}
            onClick={loadMore}
            label="Load more messages"
          />
        </>
      )}
    </div>
  );
}
