// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { wixAdminClient } from "@/lib/wixAdmin";

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Create the member on the server via Wix Admin Client (no 403 browser block)
    const created = await wixAdminClient.members.createMember({
      member: {
        loginEmail: email.trim().toLowerCase(),
        contact: {
          firstName: firstName?.trim() || "",
          lastName: lastName?.trim() || "",
          phones: phone?.trim() ? [phone.trim()] : [],
        },
        privacyStatus: "PUBLIC",
      },
    });

    // Note: If you also need to set password via IAM or trigger Wix's password setup,
    // check whether your SDK exposes wixAdminClient.authentication / members.
    return NextResponse.json({
      success: true,
      memberId: created?._id,
    });
  } catch (err: any) {
    console.error("Server register error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create member account." },
      { status: 500 }
    );
  }
}