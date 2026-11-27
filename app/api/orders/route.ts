import { NextRequest, NextResponse } from "next/server";
import { wixAdminClient } from "@/lib/wixAdmin";

const COLLECTION_ID = "CateringOrders";

// GET /api/orders?email=alex@company.com
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ orders: [] }, { status: 200 });
    }

    const res = await wixAdminClient.items
      .query(COLLECTION_ID)
      .eq("customerEmail", email)
      .descending("_createdDate")
      .limit(100)
      .find();

    const orders = (res.items || []).map((item: any) => {
      const data = item.data || item;
      return {
        _id: item._id,
        _createdDate: item._createdDate,
        ...data,
        orderId: data.title || data.checkoutId || item._id,
        eventDate: data.eventDate ? String(data.eventDate).slice(0, 10) : "",
        eventTime: data.eventTime ? String(data.eventTime).slice(0, 5) : "",
        menuSelections: Array.isArray(data.menuSelections)
          ? data.menuSelections
          : [],
        addOnsSummary: Array.isArray(data.addOnsSummary)
          ? data.addOnsSummary
          : [],
      };
    });

    return NextResponse.json({ orders });
  } catch (err: any) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { checkoutId, customerEmail } = body;

    if (!checkoutId || !customerEmail) {
      return NextResponse.json(
        { error: "Missing checkoutId or customerEmail" },
        { status: 400 }
      );
    }

    // Prevent duplicate records if Step 4 refreshes
    const existing = await wixAdminClient.items
      .query(COLLECTION_ID)
      .eq("checkoutId", String(checkoutId))
      .limit(1)
      .find();

    if (existing.items && existing.items.length > 0) {
      return NextResponse.json({
        saved: true,
        duplicate: true,
        order: existing.items[0],
      });
    }

    const normalizedEventDate = body.eventDate
      ? String(body.eventDate).slice(0, 10)
      : undefined;

    const normalizedEventTime = body.eventTime
      ? String(body.eventTime).trim()
      : undefined;

    const orderId = String(body.orderId || checkoutId).trim();

    const inserted = await wixAdminClient.items.insert(COLLECTION_ID, {
      title: orderId, // Links Order ID to Wix CMS's primary Title field
      checkoutId: String(checkoutId),
      memberId: body.memberId ? String(body.memberId).trim() : "",
      customerEmail: String(customerEmail).trim().toLowerCase(),
      customerName: body.customerName ? String(body.customerName).trim() : "",
      customerPhone: body.customerPhone ? String(body.customerPhone).trim() : "",
      packageTitle: body.packageTitle ? String(body.packageTitle).trim() : "",
      pax: Number(body.pax || 0),
      eventDate: normalizedEventDate,
      eventTime: normalizedEventTime,
      deliveryAddress: body.deliveryAddress
        ? String(body.deliveryAddress).trim()
        : "",
      menuSelections: Array.isArray(body.menuSelections)
        ? body.menuSelections
        : [],
      presentationTitle: body.presentationTitle
        ? String(body.presentationTitle).trim()
        : "",
      addOnsSummary: Array.isArray(body.addOnsSummary)
        ? body.addOnsSummary
        : [],
      subtotal: Number(body.subtotal || 0),
      deliveryFee: Number(body.deliveryFee || 0),
      serviceCharge: Number(body.serviceCharge || 0),
      gstAmount: Number(body.gstAmount || 0),
      grandTotal: Number(body.grandTotal || 0),
      pointsEarned: Number(body.pointsEarned || 0),
      status: body.status || "Confirmed",
    });

    return NextResponse.json({ saved: true, order: inserted });
  } catch (err: any) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to record order" },
      { status: 500 }
    );
  }
}