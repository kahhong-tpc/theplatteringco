// lib/loyalty.ts
import { wixAdminClient } from "@/lib/wixAdmin";

const POINTS_PER_DOLLAR = 1; // $1 SGD = 1 point

export interface LoyaltyAccount {
  _id?: string;
  memberId: string;
  email: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: string;
}

export interface LoyaltyTransaction {
  _id?: string;
  _createdDate?: string;
  memberId: string;
  orderId: string;
  type: "EARN" | "REDEEM" | "ADJUST";
  points: number;
  amountSpent: number;
  description: string;
}

export function calculateLoyaltyTier(lifetimePoints: number): string {
  if (lifetimePoints >= 5000) return "Gold";
  if (lifetimePoints >= 1500) return "Silver";
  return "Bronze";
}

export async function awardPointsForOrder({
  memberId,
  email,
  orderId,
  orderNumber,
  totalPaid,
}: {
  memberId: string;
  email: string;
  orderId: string;
  orderNumber?: string;
  totalPaid: number;
}) {
  if (!memberId || !orderId || totalPaid <= 0) {
    return {
      awarded: false,
      reason: "Missing memberId, orderId, or zero order total",
    };
  }

  // 1. Idempotency check: prevent double points if Wix retries the webhook
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

  const pointsEarned = Math.floor(totalPaid * POINTS_PER_DOLLAR);
  if (pointsEarned <= 0) {
    return {
      awarded: false,
      reason: "Order total below minimum threshold for points",
    };
  }

  // 2. Fetch or initialize the member's LoyaltyAccounts row
  const accountRes = await wixAdminClient.items
    .query("LoyaltyAccounts")
    .eq("memberId", memberId)
    .find();

  const existingAccount = accountRes.items[0];
  let updatedBalance = pointsEarned;
  let updatedTier = calculateLoyaltyTier(pointsEarned);

  if (existingAccount) {
    const currentBalance = Number(existingAccount.pointsBalance) || 0;
    const currentLifetime = Number(existingAccount.lifetimePoints) || 0;

    updatedBalance = currentBalance + pointsEarned;
    const updatedLifetime = currentLifetime + pointsEarned;
    updatedTier = calculateLoyaltyTier(updatedLifetime);

    await wixAdminClient.items.update("LoyaltyAccounts", {
      ...existingAccount,
      email: email || existingAccount.email,
      pointsBalance: updatedBalance,
      lifetimePoints: updatedLifetime,
      tier: updatedTier,
    });
  } else {
    await wixAdminClient.items.insert("LoyaltyAccounts", {
      memberId,
      email,
      pointsBalance: pointsEarned,
      lifetimePoints: pointsEarned,
      tier: updatedTier,
    });
  }

  // 3. Record the transaction in LoyaltyTransactions
  const displayOrder = orderNumber ? `#${orderNumber}` : orderId.slice(0, 8);
  await wixAdminClient.items.insert("LoyaltyTransactions", {
    memberId,
    orderId,
    type: "EARN",
    points: pointsEarned,
    amountSpent: totalPaid,
    description: `Earned ${pointsEarned} pts from Catering Order ${displayOrder}`,
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
        memberId: rawAccount.memberId,
        email: rawAccount.email || "",
        pointsBalance: Number(rawAccount.pointsBalance) || 0,
        lifetimePoints: Number(rawAccount.lifetimePoints) || 0,
        tier: rawAccount.tier || "Bronze",
      }
    : {
        memberId,
        email: "",
        pointsBalance: 0,
        lifetimePoints: 0,
        tier: "Bronze",
      };

  const transactions: LoyaltyTransaction[] = txRes.items.map((item: any) => ({
    _id: item._id,
    _createdDate: item._createdDate,
    memberId: item.memberId,
    orderId: item.orderId || "",
    type: item.type || "EARN",
    points: Number(item.points) || 0,
    amountSpent: Number(item.amountSpent) || 0,
    description: item.description || "",
  }));

  return { account, transactions };
}