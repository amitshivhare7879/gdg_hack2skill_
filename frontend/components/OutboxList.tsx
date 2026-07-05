import type { OutboxMessage } from "@/lib/types";
import LanguageBadge from "./LanguageBadge";

export default function OutboxList({ messages }: { messages: OutboxMessage[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-widest text-ink-muted">
          <tr>
            <th className="px-5 py-3.5 font-bold">Phone</th>
            <th className="px-5 py-3.5 font-bold">Lang</th>
            <th className="px-5 py-3.5 font-bold">Message</th>
            <th className="px-5 py-3.5 font-bold">Channel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {messages.map((m) => (
            <tr key={m.id} className="align-top transition hover:bg-slate-50/60">
              <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-medium text-ink-soft">
                {m.phone_masked}
              </td>
              <td className="px-5 py-4">
                <LanguageBadge lang={m.language} />
              </td>
              <td className="px-5 py-4">
                <div className="mb-1 text-xs font-bold text-ink-muted">{m.cluster_label}</div>
                <p className="max-w-xl leading-relaxed text-ink">{m.body}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  {m.status}
                </span>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-ink-muted">
                  <span className="text-emerald-500">↗</span> {m.channel}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
