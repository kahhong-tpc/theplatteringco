// app/api/loyalty/award/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerWixClient } from "@/lib/wixClientServer";
import { wixAdminClient } from "@/lib/wixAdmin";
import { awardPointsForOrder } from "@/lib/loyalty";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      checkoutId,
      orderId,
      memberId: bodyMemberId = "",
      fallbackTotal,
      name: bodyName = "",
      email: bodyEmail = "",
    } = body;

    // 1. Try active session member first, then fall back to verified memberId from checkout draft
    let resolvedMember: any = null;
    try {
      const serverWixClient = await getServerWixClient();
      if (serverWixClient.auth.loggedIn()) {
        const res = await serverWixClient.members.getCurrentMember();
        resolvedMember = res?.member || null;
      }
    } catch (authErr) {
      console.warn("[loyalty/award] Session auth lookup failed, trying fallback memberId:", authErr);
    }

    if (!resolvedMember?._id && bodyMemberId) {
      try {
        const memberRes = await wixAdminClient.members.getMember(
          String(bodyMemberId).trim()
        );
        resolvedMember = (memberRes as any)?.member || memberRes || null;
      } catch (memberErr) {
        console.warn("[loyalty/award] Admin getMember fallback failed:", memberErr);
      }
    }

    if (!resolvedMember?._id) {
      return NextResponse.json({ error: "Unauthorized / Member not found" }, { status: 401 });
    }

    const referenceId = orderId || checkoutId;
    if (!referenceId) {
      return NextResponse.json(
        { error: "Missing checkoutId or orderId" },
        { status: 400 }
      );
    }

    let totalPaid = Number(fallbackTotal) || 0;
    let orderNumber: string | undefined;

    let email = String(bodyEmail || "").trim();
    let name = String(bodyName || "").trim();

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

    email ||= resolvedMember.loginEmail?.trim() || "";
    name ||=
      [resolvedMember.contact?.firstName, resolvedMember.contact?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      resolvedMember.profile?.nickname?.trim() ||
      "";

    const result = await awardPointsForOrder({
      memberId: resolvedMember._id,
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