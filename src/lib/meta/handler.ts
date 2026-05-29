import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  updateMessageWaId,
  getRecentHistory,
  wasMessageProcessed,
  markMessageProcessed,
} from "@/lib/db";
import { generateReply, type HistoryMessage } from "@/lib/openrouter";
import { sendTextMessage } from "./client";

export async function processWebhookPayload(payload: unknown): Promise<void> {
  const p = payload as Record<string, unknown>;
  if (p?.object !== "whatsapp_business_account") return;

  for (const entry of (p.entry as unknown[]) ?? []) {
    const e = entry as Record<string, unknown>;
    for (const change of (e.changes as unknown[]) ?? []) {
      const ch = change as Record<string, unknown>;
      if (ch.field !== "messages") continue;
      const value = (ch.value ?? {}) as Record<string, unknown>;

      for (const status of (value.statuses as unknown[]) ?? []) {
        const s = status as Record<string, unknown>;
        console.log(`[wh] status ${s.status} para ${s.id}`);
      }

      const contacts = (value.contacts as unknown[]) ?? [];
      const nameByPhone = new Map<string, string | null>(
        contacts.map((c: unknown) => {
          const contact = c as Record<string, unknown>;
          const profile = contact.profile as Record<string, unknown> | undefined;
          return [contact.wa_id as string, (profile?.name as string) ?? null];
        })
      );

      for (const msg of (value.messages as unknown[]) ?? []) {
        await handleIncomingMessage(
          msg as Record<string, unknown>,
          nameByPhone.get((msg as Record<string, unknown>).from as string) ?? null
        );
      }
    }
  }
}

async function handleIncomingMessage(
  msg: Record<string, unknown>,
  pushName: string | null
): Promise<void> {
  if (msg.type !== "text") {
    console.log(`[wh] tipo ${msg.type} ignorado (fuera de scope v1)`);
    return;
  }

  const waMsgId = msg.id as string;

  if (wasMessageProcessed(waMsgId)) {
    console.log(`[wh] mensaje ${waMsgId} ya procesado, ignorando`);
    return;
  }
  markMessageProcessed(waMsgId);

  const textObj = msg.text as Record<string, unknown> | undefined;
  const text = textObj?.body as string | undefined;
  if (!text) return;

  const phone = msg.from as string;
  const convo = getOrCreateConversation(phone, pushName);

  console.log(`[wh] ← mensaje de ${phone} (${pushName ?? "sin nombre"}): "${text}"`);

  insertMessage(convo.id, "user", text, waMsgId);

  const fresh = getConversationById(convo.id);
  if (!fresh || fresh.mode !== "AI") {
    console.log(`[wh] conversación ${convo.id} en modo HUMAN, no respondiendo`);
    return;
  }

  const history = getRecentHistory(convo.id, 20);
  const llmHistory: HistoryMessage[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const t0 = Date.now();
  let reply: string;
  try {
    reply = await generateReply(llmHistory);
  } catch (err) {
    console.error("[wh] error en LLM:", err);
    return;
  }
  console.log(`[wh] LLM en ${Date.now() - t0}ms`);

  const msgId = insertMessage(convo.id, "assistant", reply, null);

  try {
    const { wa_message_id } = await sendTextMessage(phone, reply);
    updateMessageWaId(msgId, wa_message_id);
    console.log(`[wh] → enviado a ${phone} (wamid: ${wa_message_id})`);
  } catch (err) {
    console.error("[wh] error enviando a Graph:", err);
  }
}
