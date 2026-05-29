import { NextResponse } from "next/server";
import { getPhoneNumberInfo } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const required = [
    "META_ACCESS_TOKEN",
    "META_PHONE_NUMBER_ID",
    "META_APP_SECRET",
    "META_VERIFY_TOKEN",
  ];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    return NextResponse.json(
      { status: "missing_config", missing },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const info = await getPhoneNumberInfo();
    return NextResponse.json(
      {
        status: "connected",
        phone: info.display_phone_number,
        verified_name: info.verified_name,
        quality: info.quality_rating,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: "error", message },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
