import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  updateMessageWaId,
  getRecentHistory,
  wasMessageProcessed,
  markMessageProcessed,
} from "@/lib/db";
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

  // Ignorar mensajes con más de 5 minutos de antigüedad (reintentos viejos de Meta)
  const msgTimestamp = parseInt(msg.timestamp as string, 10);
  const ageSeconds = Math.floor(Date.now() / 1000) - msgTimestamp;
  if (ageSeconds > 300) {
    console.log(`[wh] mensaje ignorado (antigüedad: ${Math.floor(ageSeconds / 60)} min)`);
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
  const historyForN8n = history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  await callN8nWebhook({
    conversationId: convo.id,
    phone,
    name: pushName,
    message: text,
    history: historyForN8n,
  });
}

interface N8nPayload {
  conversationId: number;
  phone: string;
  name: string | null;
  message: string;
  history: { role: string; content: string }[];
}

async function callN8nWebhook(payload: N8nPayload): Promise<void> {
  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_CALLBACK_SECRET;

  if (!n8nUrl) {
    console.error("[wh] N8N_WEBHOOK_URL no configurado — no se puede responder");
    return;
  }

  // La URL base de la app, necesaria para que n8n sepa dónde llamar de vuelta.
  // En producción: https://nazar-chat.aisouthside.com
  // En local: http://localhost:3000
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";

  const body = {
    ...payload,
    callbackUrl: `${appUrl}/api/n8n/reply`,
    callbackSecret: secret ?? "",
  };

  try {
    const res = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`[wh] n8n respondió ${res.status}: ${txt}`);
    } else {
      console.log(`[wh] → payload enviado a n8n para conversación ${payload.conversationId}`);
    }
  } catch (err) {
    console.error("[wh] error llamando a n8n:", err);
  }
}

// Función exportada para que /api/n8n/reply pueda enviar la respuesta
// una vez que n8n terminó de procesar.
export async function deliverN8nReply(
  conversationId: number,
  reply: string
): Promise<{ messageId: number; wa_message_id: string }> {
  const convo = getConversationById(conversationId);
  if (!convo) throw new Error(`Conversación ${conversationId} no encontrada`);

  // Re-verificar que siga en modo AI (pudo haber cambiado mientras n8n procesaba)
  if (convo.mode !== "AI") {
    throw new Error(`Conversación ${conversationId} ya no está en modo AI`);
  }

  const msgId = insertMessage(conversationId, "assistant", reply, null);

  const { wa_message_id } = await sendTextMessage(convo.phone, reply);
  updateMessageWaId(msgId, wa_message_id);

  console.log(`[n8n] → respuesta enviada a ${convo.phone} (wamid: ${wa_message_id})`);
  return { messageId: msgId, wa_message_id };
}
