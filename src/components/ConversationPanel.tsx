"use client";

import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";
import ModeToggle from "./ModeToggle";

interface Message {
  id: number;
  role: "user" | "assistant" | "human";
  content: string;
  wa_message_id: string | null;
  created_at: number;
}

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
}

interface Props {
  conversation: Conversation;
  onModeChange: (mode: "AI" | "HUMAN") => void;
  onDelete: () => void;
}

const WINDOW_ERROR_CODE = "131047";

export default function ConversationPanel({ conversation, onModeChange, onDelete }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"AI" | "HUMAN">(conversation.mode);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [windowError, setWindowError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(conversation.mode);
  }, [conversation.mode]);

  async function fetchMessages() {
    const res = await fetch(`/api/messages/${conversation.id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  }

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleModeChange(newMode: "AI" | "HUMAN") {
    setMode(newMode);
    onModeChange(newMode);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setWindowError(false);
    setInput("");

    const res = await fetch(`/api/messages/${conversation.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error?.includes(WINDOW_ERROR_CODE)) {
        setWindowError(true);
      }
    }
    setSending(false);
    fetchMessages();
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header del panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <div>
          <p className="font-semibold text-gray-900">
            {conversation.name ?? `+${conversation.phone}`}
          </p>
          <p className="text-xs text-gray-500">+{conversation.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle
            conversationId={conversation.id}
            mode={mode}
            onChange={handleModeChange}
          />
          <button
            onClick={handleDelete}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              confirmDelete
                ? "bg-red-500 text-white hover:bg-red-600"
                : "text-red-500 hover:bg-red-50"
            }`}
          >
            {confirmDelete ? "¿Confirmar?" : "Borrar"}
          </button>
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">Sin mensajes todavía.</p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Alerta ventana 24h */}
      {windowError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700">
          Fuera de la ventana de 24h. No se puede enviar texto libre — usá un Template de WhatsApp.
        </div>
      )}

      {/* Compositor */}
      <form
        onSubmit={sendMessage}
        className="flex gap-2 px-4 py-3 border-t border-gray-200 bg-white shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={mode === "AI" || sending}
          placeholder={
            mode === "AI"
              ? "En modo IA, el bot responde automáticamente"
              : "Escribí tu mensaje..."
          }
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={mode === "AI" || sending || !input.trim()}
          className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
