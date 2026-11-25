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

    const body = await req.json();
    const {
      checkoutId,
      orderId,
      fallbackTotal,
      name: bodyName = "",
      email: bodyEmail = "",
    } = body;

    const referenceId = orderId || checkoutId;

    if (!referenceId) {
      return NextResponse.json(
        { error: "Missing checkoutId or orderId" },
        { status: 400 }
      );
    }

    let totalPaid = Number(fallbackTotal) || 0;
    let orderNumber: string | undefined;

    // Priority 1: Name & Email submitted in Step 3 form (passed from CateringBuilder)
    let email = String(bodyEmail || "").trim();
    let name = String(bodyName || "").trim();

    // Priority 2: Verified details from Wix Order (if orderId is provided)
    if (orderId) {
      try {
        const order = await wixAdminClient.orders.getOrder(orderId);
        totalPaid = Number(order?.priceSummary?.total?.amount ?? totalPaid);
        orderNumber = order?.number ? String(order.number) : undefined;
        email ||= order?.buyerInfo?.email?.trim() || "";

        const orderContact =
          order?.billingInfo?.contactDetails ||
          order?.shippingInfo?.logistics?.shippingDestination?.contactDetails;
        const orderName = [orderContact?.firstName, orderContact?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        name ||= orderName;
      } catch (orderErr) {
        console.warn("[loyalty/award] Could not fetch order details:", orderErr);
      }
    }

    // Priority 3: Checkout buyer/billing details (when redirected with checkoutId)
    if (checkoutId && (!email || !name)) {
      try {
        const checkoutMod = (wixAdminClient as any).checkout;
        if (checkoutMod?.getCheckout) {
          const checkoutRes = await checkoutMod.getCheckout(checkoutId);
          const checkout = checkoutRes?.checkout || checkoutRes;

          email ||= checkout?.buyerInfo?.email?.trim() || "";
          const checkoutContact =
            checkout?.billingInfo?.contactDetails ||
            checkout?.shippingInfo?.logistics?.shippingDestination
              ?.contactDetails;
          const checkoutName = [
            checkoutContact?.firstName,
            checkoutContact?.lastName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();
          name ||= checkoutName;
        }
      } catch (checkoutErr) {
        console.warn(
          "[loyalty/award] Could not fetch checkout details:",
          checkoutErr
        );
      }
    }

    // Priority 4: Logged-in Wix Member profile fallback
    email ||= member.loginEmail?.trim() || "";
    name ||=
      [member.contact?.firstName, member.contact?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      member.profile?.nickname?.trim() ||
      "";

    console.log("[loyalty/award] Resolved member & buyer details:", {
      memberId: member._id,
      referenceId,
      fromBody: { name: bodyName, email: bodyEmail },
      finalResolved: { name, email, totalPaid },
      capturedBoth: Boolean(name && email),
    });

    const result = await awardPointsForOrder({
      memberId: member._id,
      name,
      email,
      orderId: referenceId,
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