import type { OutboxMessage } from "@/lib/types";
import LanguageBadge from "./LanguageBadge";

export default function OutboxList({ messages }: { messages: OutboxMessage[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Lang</th>
            <th className="px-4 py-3 font-medium">Message</th>
            <th className="px-4 py-3 font-medium">Channel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {messages.map((m) => (
            <tr key={m.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                {m.phone_masked}
              </td>
              <td className="px-4 py-3">
                <LanguageBadge lang={m.language} />
              </td>
              <td className="px-4 py-3">
                <div className="mb-1 text-xs font-medium text-gray-400">{m.cluster_label}</div>
                <p className="max-w-xl text-ink">{m.body}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {m.status}
                </span>
                <div className="mt-1 text-[11px] text-gray-400">→ {m.channel}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
