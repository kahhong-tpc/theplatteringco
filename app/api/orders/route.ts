import { NextRequest, NextResponse } from "next/server";
import { wixAdminClient } from "@/lib/wixAdmin";

const COLLECTION_ID = "CateringOrders";

function normalizeMenuSelections(
  raw: any
): Array<{ category: string; items: string[] }> {
  if (!raw) return [];

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return raw.trim() ? [{ category: "", items: [raw.trim()] }] : [];
    }
  }

  // Case 1: Stored as an object map, e.g. { "Mains": ["Dish A", "Dish B"], "Sides": ["Dish C"] }
  if (!Array.isArray(parsed) && typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([category, val]) => {
        const list = Array.isArray(val) ? val : val ? [val] : [];
        const items = list
          .map((entry: any) =>
            typeof entry === "string"
              ? entry
              : entry?.title || entry?.name || entry?.item || entry?.label || ""
          )
          .filter(Boolean);
        return { category, items };
      })
      .filter((group) => group.items.length > 0);
  }

  // Case 2: Stored as an array of strings or objects
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry: any) => {
        if (typeof entry === "string") {
          return { category: "", items: [entry] };
        }
        if (entry && typeof entry === "object") {
          const category =
            entry.category ||
            entry.course ||
            entry.group ||
            entry.slotName ||
            "";
          if (Array.isArray(entry.items)) {
            const items = entry.items
              .map((i: any) =>
                typeof i === "string"
                  ? i
                  : i?.title || i?.name || i?.item || ""
              )
              .filter(Boolean);
            return { category, items };
          }
          const singleItem =
            entry.item ||
            entry.title ||
            entry.name ||
            entry.dish ||
            entry.label ||
            "";
          return { category, items: singleItem ? [singleItem] : [] };
        }
        return { category: "", items: [] };
      })
      .filter((group) => group.items.length > 0);
  }

  return [];
}

function normalizeAddOnsSummary(
  raw: any
): Array<{ name: string; quantity: number; price: number }> {
  if (!raw) return [];

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return raw.trim()
        ? [{ name: raw.trim(), quantity: 1, price: 0 }]
        : [];
    }
  }

  const extractItem = (
    entry: any,
    fallbackKey = ""
  ): { name: string; quantity: number; price: number } | null => {
    if (typeof entry === "string") {
      return entry.trim()
        ? { name: entry.trim(), quantity: 1, price: 0 }
        : null;
    }
    if (typeof entry === "number") {
      return entry > 0 && fallbackKey
        ? { name: fallbackKey, quantity: entry, price: 0 }
        : null;
    }
    if (entry && typeof entry === "object") {
      const firstStringVal = Object.entries(entry).find(
        ([k, v]) =>
          typeof v === "string" &&
          v.trim().length > 0 &&
          !["_id", "id", "addOnId", "groupTitle", "pricingType", "barStartTime"].includes(k)
      )?.[1] as string | undefined;

      const baseTitle = String(
        entry.optionTitle ??
          entry.name ??
          entry.title ??
          entry.addOnTitle ??
          entry.addOnName ??
          entry.productName ??
          entry.label ??
          entry.item ??
          firstStringVal ??
          fallbackKey ??
          ""
      ).trim();

      const groupPrefix =
        entry.groupTitle &&
        entry.groupTitle !== "Add-On" &&
        entry.groupTitle !== baseTitle
          ? `${entry.groupTitle}: `
          : "";

      const pickedSuffix =
        Array.isArray(entry.pickedDetails) && entry.pickedDetails.length > 0
          ? ` (${entry.pickedDetails.join(", ")})`
          : typeof entry.pickedDetails === "string" && entry.pickedDetails.trim()
          ? ` (${entry.pickedDetails.trim()})`
          : "";

      const name = baseTitle ? `${groupPrefix}${baseTitle}${pickedSuffix}` : "";

      const quantity = Number(
        entry.quantity ?? entry.qty ?? entry.count ?? entry.pax ?? 1
      );
      const price = Number(
        entry.lineTotal ??
          entry.price ??
          entry.total ??
          entry.totalPrice ??
          entry.subtotal ??
          entry.unitPrice ??
          entry.amount ??
          0
      );

      if (!name) return null;
      return { name, quantity: quantity > 0 ? quantity : 1, price };
    }
    return null;
  };

  if (!Array.isArray(parsed) && typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([key, val]) => extractItem(val, key))
      .filter(Boolean) as Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => extractItem(entry))
      .filter(Boolean) as Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  }

  return [];
}

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
        menuSelections: normalizeMenuSelections(data.menuSelections),
        addOnsSummary: normalizeAddOnsSummary(data.addOnsSummary),
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
      menuSelections: normalizeMenuSelections(body.menuSelections),
      presentationTitle: body.presentationTitle
        ? String(body.presentationTitle).trim()
        : "",
      addOnsSummary: normalizeAddOnsSummary(body.addOnsSummary),
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