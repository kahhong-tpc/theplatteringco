import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const postal = req.nextUrl.searchParams.get("postal")?.trim() || "";

  // Singapore postal codes are strictly 6 digits
  if (!/^\d{6}$/.test(postal)) {
    return NextResponse.json(
      { error: "Enter a valid 6-digit Singapore postal code." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postal}&returnGeom=N&getAddrDetails=Y&pageNum=1`,
      { next: { revalidate: 86400 } } // Cache postal lookups for 24 hours
    );

    if (!res.ok) {
      throw new Error("OneMap lookup failed");
    }

    const data = await res.json();
    const match = data?.results?.[0];

    if (!match) {
      return NextResponse.json(
        { error: "Postal code not found." },
        { status: 404 }
      );
    }

    // Format clean street address (e.g., "10 MARINA BOULEVARD, MARINA BAY FINANCIAL CENTRE")
    const blockAndRoad = [match.BLK_NO, match.ROAD_NAME]
      .filter((v) => v && v !== "NIL")
      .join(" ");

    const building =
      match.BUILDING && match.BUILDING !== "NIL" ? match.BUILDING : "";

    const formattedStreet = [blockAndRoad, building].filter(Boolean).join(", ");

    return NextResponse.json({
      postalCode: match.POSTAL,
      streetAddress: formattedStreet,
      building,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to look up postal code right now." },
      { status: 500 }
    );
  }
}