"use client";

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  last_message_preview: string | null;
}

interface Props {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function timeAgo(unixSec: number | null): string {
  if (!unixSec) return "";
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export default function ConversationList({ conversations, selectedId, onSelect }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm px-4 text-center">
        <p>Sin conversaciones todavía.</p>
        <p className="mt-1">Escribile a tu número de WhatsApp para empezar.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-y-auto">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
              selectedId === c.id ? "bg-emerald-50 border-l-4 border-emerald-500" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-medium text-sm text-gray-900 truncate">
                {c.name ?? `+${c.phone}`}
              </span>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    c.mode === "AI"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {c.mode === "AI" ? "IA" : "HUM"}
                </span>
                <span className="text-[10px] text-gray-400">{timeAgo(c.last_message_at)}</span>
              </div>
            </div>
            {c.last_message_preview && (
              <p className="text-xs text-gray-500 truncate">{c.last_message_preview}</p>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
