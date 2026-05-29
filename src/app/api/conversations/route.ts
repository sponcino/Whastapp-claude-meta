import { NextResponse } from "next/server";
import { listConversations } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const convos = listConversations();
  return NextResponse.json(convos, {
    headers: { "Cache-Control": "no-store" },
  });
}
