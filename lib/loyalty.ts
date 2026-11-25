// lib/loyalty.ts
import { wixAdminClient } from "@/lib/wixAdmin";

const POINTS_PER_DOLLAR = 1; // $1 SGD = 1 point

export interface LoyaltyAccount {
  _id?: string;
  title: string;
  memberId: string;
  email: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: string;
}

export interface LoyaltyTransaction {
  _id?: string;
  _createdDate?: string;
  title: string;
  email: string;
  memberId: string;
  orderId: string;
  type: "EARN" | "REDEEM" | "ADJUST";
  points: number;
  amountSpent: string;
  description: string;
}

export function calculateLoyaltyTier(lifetimePoints: number): string {
  if (lifetimePoints >= 5000) return "Gold";
  if (lifetimePoints >= 1500) return "Silver";
  return "Bronze";
}

export async function awardPointsForOrder({
  memberId,
  name = "",
  email = "",
  orderId,
  orderNumber,
  totalPaid,
}: {
  memberId: string;
  name?: string;
  email?: string;
  orderId: string;
  orderNumber?: string;
  totalPaid: number;
}) {
  const numericTotal = Number(totalPaid) || 0;

  if (!memberId || !orderId || numericTotal <= 0) {
    return {
      awarded: false,
      reason: "Missing memberId, orderId, or zero order total",
    };
  }

  const pointsEarned = Math.floor(numericTotal * POINTS_PER_DOLLAR);
  if (pointsEarned <= 0) {
    return {
      awarded: false,
      reason: "Order total below minimum threshold for points",
    };
  }

  let memberName = (name || "").trim();
  let memberEmail = (email || "").trim();

  // 1. Only query Wix Members API if name or email is still missing
  if (!memberName || !memberEmail) {
    try {
      const memberRes: any = await wixAdminClient.members.getMember(memberId, {
        fieldsets: ["FULL"],
      });
      const member = memberRes?.member || memberRes;

      const memberContactName = [
        member?.contact?.firstName,
        member?.contact?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      memberEmail ||=
        member?.loginEmail?.trim() ||
        member?.contact?.emails?.[0]?.trim() ||
        "";
      memberName ||=
        memberContactName || member?.profile?.nickname?.trim() || "";
    } catch (err) {
      console.warn(`[loyalty] Could not load Wix member ${memberId}:`, err);
    }
  }

  // 2. Prevent duplicate awards for the same order
  const existingTx = await wixAdminClient.items
    .query("LoyaltyTransactions")
    .eq("orderId", orderId)
    .eq("type", "EARN")
    .find();

  if (existingTx.items.length > 0) {
    return {
      awarded: false,
      reason: "Points already awarded for this order",
    };
  }

  // 3. Fetch or initialize the member's LoyaltyAccounts row
  const accountRes = await wixAdminClient.items
    .query("LoyaltyAccounts")
    .eq("memberId", memberId)
    .find();

  const existingAccount = accountRes.items[0];
  let updatedBalance = pointsEarned;
  let updatedTier = calculateLoyaltyTier(pointsEarned);

  const resolvedDisplayName =
    memberName ||
    existingAccount?.title ||
    memberEmail ||
    existingAccount?.email ||
    "Member";

  const resolvedFinalEmail = memberEmail || existingAccount?.email || "";

  if (existingAccount) {
    const currentBalance = Number(existingAccount.pointsBalance) || 0;
    const currentLifetime = Number(existingAccount.lifetimePoints) || 0;

    updatedBalance = currentBalance + pointsEarned;
    const updatedLifetime = currentLifetime + pointsEarned;
    updatedTier = calculateLoyaltyTier(updatedLifetime);

    await wixAdminClient.items.update("LoyaltyAccounts", {
      ...existingAccount,
      title: resolvedDisplayName,
      email: resolvedFinalEmail,
      pointsBalance: updatedBalance,
      lifetimePoints: updatedLifetime,
      tier: updatedTier,
    });
  } else {
    await wixAdminClient.items.insert("LoyaltyAccounts", {
      title: resolvedDisplayName,
      memberId,
      email: resolvedFinalEmail,
      pointsBalance: pointsEarned,
      lifetimePoints: pointsEarned,
      tier: updatedTier,
    });
  }

  // 4. Record the transaction in LoyaltyTransactions with exact "$XXX.XX" formatting
  const formattedAmountSpent = `$${numericTotal.toFixed(2)}`;
  const displayOrder = orderNumber ? `#${orderNumber}` : orderId.slice(0, 8);

  await wixAdminClient.items.insert("LoyaltyTransactions", {
    title: resolvedDisplayName,
    email: resolvedFinalEmail,
    memberId,
    orderId,
    type: "EARN",
    points: pointsEarned,
    amountSpent: formattedAmountSpent,
    description: `Earned ${pointsEarned} pts from Catering Order ${displayOrder} (${formattedAmountSpent})`,
  });

  return {
    awarded: true,
    pointsEarned,
    newBalance: updatedBalance,
    tier: updatedTier,
  };
}

export async function getMemberLoyaltySummary(memberId: string) {
  const [accountRes, txRes] = await Promise.all([
    wixAdminClient.items
      .query("LoyaltyAccounts")
      .eq("memberId", memberId)
      .find(),
    wixAdminClient.items
      .query("LoyaltyTransactions")
      .eq("memberId", memberId)
      .descending("_createdDate")
      .limit(50)
      .find(),
  ]);

  const rawAccount = accountRes.items[0];
  const account: LoyaltyAccount = rawAccount
    ? {
        _id: rawAccount._id,
        title: rawAccount.title || "",
        memberId: rawAccount.memberId,
        email: rawAccount.email || "",
        pointsBalance: Number(rawAccount.pointsBalance) || 0,
        lifetimePoints: Number(rawAccount.lifetimePoints) || 0,
        tier: rawAccount.tier || "Bronze",
      }
    : {
        title: "",
        memberId,
        email: "",
        pointsBalance: 0,
        lifetimePoints: 0,
        tier: "Bronze",
      };

  const transactions: LoyaltyTransaction[] = txRes.items.map((item: any) => {
    const rawAmount = item.amountSpent;
    const formattedAmount =
      typeof rawAmount === "string" && rawAmount.startsWith("$")
        ? rawAmount
        : `$${(Number(String(rawAmount ?? 0).replace(/[^0-9.-]/g, "")) || 0).toFixed(2)}`;

    return {
      _id: item._id,
      _createdDate: item._createdDate,
      title: item.title || "",
      email: item.email || "",
      memberId: item.memberId,
      orderId: item.orderId || "",
      type: item.type || "EARN",
      points: Number(item.points) || 0,
      amountSpent: formattedAmount,
      description: item.description || "",
    };
  });

  return { account, transactions };
}