// app/api/loyalty/award/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerWixClient } from "@/lib/wixClientServer";
import { wixAdminClient } from "@/lib/wixAdmin";
import { awardPointsForOrder } from "@/lib/loyalty";

export async function POST(req: NextRequest) {
  try {
    const serverWixClient = await getServerWixClient();
    if (!serverWixClient.auth.loggedIn()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { member } = await serverWixClient.members.getCurrentMember();
    if (!member?._id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { checkoutId, orderId, fallbackTotal } = await req.json();
    const referenceId = orderId || checkoutId;

    if (!referenceId) {
      return NextResponse.json(
        { error: "Missing checkoutId or orderId" },
        { status: 400 }
      );
    }

    let totalPaid = Number(fallbackTotal) || 0;
    let orderNumber: string | undefined;
    let email = member.loginEmail || "";

    // If a real orderId exists, read the verified total from Wix Orders
    if (orderId) {
      try {
        const order = await wixAdminClient.orders.getOrder(orderId);
        totalPaid = Number(order?.priceSummary?.total?.amount ?? totalPaid);
        orderNumber = order?.number ? String(order.number) : undefined;
        email = order?.buyerInfo?.email || email;
      } catch {
        // Use fallbackTotal on Free plan
      }
    }

    const result = await awardPointsForOrder({
      memberId: member._id,
      email,
      orderId: referenceId, // Deduplicated by checkoutId or orderId
      orderNumber,
      totalPaid,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/loyalty/award error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to award points" },
      { status: 500 }
    );
  }
}