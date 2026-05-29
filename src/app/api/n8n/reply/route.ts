import { NextResponse, type NextRequest } from "next/server";
import { deliverN8nReply } from "@/lib/meta/handler";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { conversationId?: number; reply?: string; secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }

  // Verificar el secreto para que nadie más pueda inyectar respuestas
  const expectedSecret = process.env.N8N_CALLBACK_SECRET;
  if (expectedSecret && body.secret !== expectedSecret) {
    console.warn("[n8n/reply] secreto inválido");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { conversationId, reply } = body;

  if (!conversationId || typeof conversationId !== "number") {
    return NextResponse.json({ error: "conversationId requerido" }, { status: 400 });
  }
  if (!reply || typeof reply !== "string" || !reply.trim()) {
    return NextResponse.json({ error: "reply requerido" }, { status: 400 });
  }

  try {
    const result = await deliverN8nReply(conversationId, reply.trim());
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[n8n/reply] error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
