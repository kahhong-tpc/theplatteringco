// app/api/loyalty/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMemberLoyaltySummary } from "@/lib/loyalty";

export async function GET(req: NextRequest) {
  try {
    const memberId = req.nextUrl.searchParams.get("memberId")?.trim();
    if (!memberId) {
      return NextResponse.json(
        { error: "Missing memberId" },
        { status: 400 }
      );
    }

    const summary = await getMemberLoyaltySummary(memberId);
    return NextResponse.json(summary);
  } catch (err: any) {
    console.error("GET /api/loyalty error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load loyalty summary" },
      { status: 500 }
    );
  }
}