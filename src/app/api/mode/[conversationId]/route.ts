import { NextResponse, type NextRequest } from "next/server";
import { getConversationById, setMode } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ conversationId: string }>;
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

  let body: { mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body inválido" }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "AI" && mode !== "HUMAN") {
    return NextResponse.json(
      { error: "mode debe ser 'AI' o 'HUMAN'" },
      { status: 400 }
    );
  }

  setMode(id, mode);
  return NextResponse.json({ ok: true, mode });
}
