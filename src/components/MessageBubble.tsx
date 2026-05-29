interface Message {
  id: number;
  role: "user" | "assistant" | "human";
  content: string;
  wa_message_id: string | null;
  created_at: number;
}

interface Props {
  message: Message;
}

function formatTime(unixSec: number) {
  return new Date(unixSec * 1000).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message }: Props) {
  const isOutgoing = message.role === "assistant" || message.role === "human";
  const failed = isOutgoing && message.wa_message_id === null;

  const bubbleClass = {
    user: "bg-white text-gray-800 self-start rounded-br-lg",
    assistant: "bg-emerald-500 text-white self-end rounded-bl-lg",
    human: "bg-amber-400 text-gray-900 self-end rounded-bl-lg",
  }[message.role];

  return (
    <div className={`flex flex-col max-w-[75%] ${isOutgoing ? "items-end self-end" : "items-start self-start"}`}>
      <div
        className={`px-3 py-2 rounded-2xl shadow-sm text-sm leading-relaxed ${bubbleClass} ${
          failed ? "opacity-60 ring-2 ring-red-400" : ""
        }`}
      >
        {message.content}
      </div>
      <div className="flex items-center gap-1 mt-0.5 px-1">
        <span className="text-[10px] text-gray-400">{formatTime(message.created_at)}</span>
        {failed && (
          <span
            title="Error al enviar"
            className="text-[10px] text-red-500 font-semibold"
          >
            ✕ no enviado
          </span>
        )}
      </div>
    </div>
  );
}
