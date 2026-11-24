// app/api/webhooks/wix-order-paid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { awardPointsForOrder } from "@/lib/loyalty";

function parseWixWebhookBody(rawBody: string): any {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    throw new Error("Empty webhook request body");
  }

  // Case 1: Standard JSON payload (e.g. Wix Automations or local test POST)
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  // Case 2: Signed JWT string sent by Wix Webhooks
  const parts = trimmed.split(".");
  if (parts.length === 3) {
    const decoded = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    return typeof decoded.data === "string"
      ? JSON.parse(decoded.data)
      : decoded;
  }

  throw new Error("Unsupported webhook payload format");
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payload = parseWixWebhookBody(rawBody);

    // Support both nested Wix eCom event shapes and direct order payloads
    const order =
      payload?.data?.order ||
      payload?.entity ||
      payload?.order ||
      payload;

    const orderId = order?._id || order?.id;
    const orderNumber = order?.number ? String(order.number) : undefined;
    const memberId = order?.buyerInfo?.memberId;
    const email = order?.buyerInfo?.email || "";

    const totalPaid = Number(
      order?.priceSummary?.total?.amount ??
        order?.balanceSummary?.paid?.amount ??
        0
    );

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId in webhook payload" },
        { status: 400 }
      );
    }

    if (!memberId) {
      // Guest checkout without a logged-in member session
      return NextResponse.json({
        received: true,
        awarded: false,
        reason: "Guest order (no buyerInfo.memberId attached)",
      });
    }

    const result = await awardPointsForOrder({
      memberId,
      email,
      orderId,
      orderNumber,
      totalPaid,
    });

    return NextResponse.json({ received: true, ...result });
  } catch (err: any) {
    console.error("Wix Order Paid webhook error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process order-paid webhook" },
      { status: 400 }
    );
  }
}