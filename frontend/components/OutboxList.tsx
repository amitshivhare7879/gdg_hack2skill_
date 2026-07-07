import type { OutboxMessage } from "@/lib/types";
import LanguageBadge from "./LanguageBadge";

export default function OutboxList({ messages }: { messages: OutboxMessage[] }) {
  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          <tr>
            <th className="px-6 py-4">Citizen Contact</th>
            <th className="px-6 py-4">Language</th>
            <th className="px-6 py-4">Queued Alert Content</th>
            <th className="px-6 py-4">Status & Route</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {messages.map((m) => {
            const isSent = m.status === "sent";
            return (
              <tr key={m.id} className="align-top transition hover:bg-slate-50/30">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-[10px] font-bold text-ink-soft">
                  {m.phone_masked}
                </td>
                <td className="px-6 py-4">
                  <LanguageBadge lang={m.language} />
                </td>
                <td className="px-6 py-4">
                  <div className="mb-1 text-[10px] font-bold text-ink-soft font-heading">{m.cluster_label}</div>
                  <p className="max-w-xl leading-relaxed text-ink-soft text-xs">{m.body}</p>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-block border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded ${
                      isSent
                        ? "border-slate-200 bg-slate-50 text-ink-soft"
                        : "border-brand/40 bg-brand-light/30 text-brand"
                    }`}
                  >
                    {m.status}
                  </span>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-ink-muted">
                    <span>Route:</span>
                    <span className="text-ink-soft">{m.channel}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
