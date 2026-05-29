import { NextResponse, type NextRequest } from "next/server";
import {
  getConversationById,
  getMessages,
  insertMessage,
  updateMessageWaId,
} from "@/lib/db";
import { sendTextMessage } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ conversationId: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const convo = getConversationById(id);
  if (!convo) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }
  const messages = getMessages(id, 100);
  return NextResponse.json(messages, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const convo = getConversationById(id);
  if (!convo) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "content requerido" }, { status: 400 });
  }

  const messageId = insertMessage(convo.id, "human", content, null);

  try {
    const { wa_message_id } = await sendTextMessage(convo.phone, content);
    updateMessageWaId(messageId, wa_message_id);
    return NextResponse.json({ ok: true, messageId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, messageId, error: message },
      { status: 502 }
    );
  }
}
