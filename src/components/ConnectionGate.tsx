"use client";

import { useEffect, useState, useCallback } from "react";
import ConfigScreen from "./ConfigScreen";
import DashboardHeader from "./DashboardHeader";
import ConversationList from "./ConversationList";
import ConversationPanel from "./ConversationPanel";

type ConnectionStatus =
  | { status: "loading" }
  | { status: "missing_config"; missing: string[] }
  | { status: "error"; message: string }
  | { status: "connected"; phone: string; verified_name: string; quality: string };

interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  last_message_preview: string | null;
}

export default function ConnectionGate() {
  const [connStatus, setConnStatus] = useState<ConnectionStatus>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const checkConnection = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/connection/status", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setConnStatus(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ConnectionGate] error al verificar conexión:", msg);
      setConnStatus({ status: "error", message: msg });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Reintenta automáticamente si el servidor todavía estaba compilando al arrancar
  useEffect(() => {
    if (connStatus.status !== "error") return;
    const t = setTimeout(() => checkConnection(), 3000);
    return () => clearTimeout(t);
  }, [connStatus.status, checkConnection]);

  const fetchConversations = useCallback(async () => {
    if (connStatus.status !== "connected") return;
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
  }, [connStatus.status]);

  useEffect(() => {
    if (connStatus.status !== "connected") return;
    fetchConversations();
    const interval = setInterval(fetchConversations, 2000);
    return () => clearInterval(interval);
  }, [connStatus.status, fetchConversations]);

  if (connStatus.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Verificando conexión...</div>
      </div>
    );
  }

  if (connStatus.status === "missing_config" || connStatus.status === "error") {
    return (
      <ConfigScreen
        status={connStatus.status}
        missing={connStatus.status === "missing_config" ? connStatus.missing : []}
        errorMessage={connStatus.status === "error" ? connStatus.message : undefined}
        onRetry={checkConnection}
        retrying={refreshing}
      />
    );
  }

  const selectedConvo = conversations.find((c) => c.id === selectedId) ?? null;

  function handleModeChange(mode: "AI" | "HUMAN") {
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, mode } : c))
    );
  }

  function handleDelete() {
    setConversations((prev) => prev.filter((c) => c.id !== selectedId));
    setSelectedId(null);
  }

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader
        phone={connStatus.phone}
        verifiedName={connStatus.verified_name}
        quality={connStatus.quality}
        onRefresh={checkConnection}
        refreshing={refreshing}
      />
      <div className="flex flex-1 min-h-0">
        {/* Columna izquierda */}
        <aside className="w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Conversaciones
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </aside>

        {/* Columna derecha */}
        <main className="flex-1 flex flex-col min-h-0 bg-gray-50">
          {selectedConvo ? (
            <ConversationPanel
              key={selectedConvo.id}
              conversation={selectedConvo}
              onModeChange={handleModeChange}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Seleccioná una conversación
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
