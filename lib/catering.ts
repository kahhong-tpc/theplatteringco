import { wixClient } from "@/lib/wixClient";
import { getServerWixClient } from "@/lib/wixClientServer";

export interface TierRule {
  limitProduct: number;
  beverages: number;
  minPax: number;
  maxPax: number;
  startTime: string;
  endTime: string;
  sortOrder: number;
}

export interface PresentationPriceTier {
  maxPax: number;
  price: number;
}

export interface PresentationOption {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  priceTiers: PresentationPriceTier[];
  productId?: string;
}

/**
 * Converts internal `wix:image://` strings to public `https://static.wixstatic.com/media/` URLs.
 */
function resolveWixImageUrl(wixImage?: string): string | undefined {
  if (!wixImage || typeof wixImage !== "string") return undefined;
  if (wixImage.startsWith("http")) return wixImage;

  const match = wixImage.match(/^wix:image:\/\/v1\/([^/]+)\//);
  return match ? `https://static.wixstatic.com/media/${match[1]}` : undefined;
}

/**
 * Parses "40:60, 60:100, 80:140, 9999:180" into sorted pax brackets.
 */
function parsePriceTiers(raw?: string): PresentationPriceTier[] {
  if (!raw) return [];

  return String(raw)
    .split(",")
    .map((pair) => {
      const [maxPaxStr, priceStr] = pair.split(":").map((s) => s.trim());
      const maxPax = Number(maxPaxStr);
      const price = Number(priceStr);
      if (!maxPaxStr || !priceStr || Number.isNaN(maxPax) || Number.isNaN(price)) {
        return null;
      }
      return { maxPax, price };
    })
    .filter((tier): tier is PresentationPriceTier => tier !== null)
    .sort((a, b) => a.maxPax - b.maxPax);
}

/**
 * Fetches all visible Wix Store Categories (Collections) for the central /catering hub.
 */
export async function getCateringCategories(client?: any) {
  const wixClient = client || (await getServerWixClient());
  const res = await wixClient.collections.queryCollections().find();
  return res.items.filter(
    (col: any) => col.slug !== "all-products" && col.visible !== false
  );
}

/**
 * Fetches a category by slug, plus its products, dishes, tier rules, and table presentations.
 */
export async function getCateringMenuBySlug(
  slug: string,
  dishCollectionId = "CanapeDishes",
  rulesCollectionId = "CateringTiers",
  presentationsCollectionId = "CateringPresentations",
  client?: any
) {
  const wixClient = client || (await getServerWixClient());
  let colRes;

  try {
    colRes = await wixClient.collections.getCollectionBySlug(slug);
  } catch (err: any) {
    // If slug doesn't exist in Wix Stores, return null so Next.js renders notFound()
    if (
      err?.details?.applicationError?.code === "IDENTITY_NOT_FOUND" ||
      err?.message?.includes("not found")
    ) {
      return null;
    }
    throw err;
  }

  const category = colRes?.collection;
  if (!category) {
    return null;
  }

  // Fetch products, dishes, tier rules, and presentations in parallel
  // .catch() on presentations ensures the page still loads even if the collection isn't created yet
  const [productsRes, dishesRes, rulesRes, presentationsRes] = await Promise.all([
    wixClient.products
      .queryProducts()
      .hasSome("collectionIds", [category._id])
      .ascending("price")
      .find(),
    wixClient.items.query(dishCollectionId).limit(100).find(),
    wixClient.items.query(rulesCollectionId).limit(100).find(),
    wixClient.items
      .query(presentationsCollectionId)
      .limit(50)
      .find()
      .catch(() => ({ items: [] })),
  ]);

  const catName = String(category.name || "").toLowerCase();
  const catSlug = String(category.slug || "").toLowerCase();

  // 1. Parse Tier Rules
  const tierRules: Record<string, TierRule> = {};
  rulesRes.items.forEach((item: any) => {
    const data = item.data || item;

    if (data.menuType) {
      const ruleType = String(data.menuType).trim().toLowerCase();
      if (!catName.includes(ruleType) && !catSlug.includes(ruleType)) {
        return;
      }
    }

    if (data.title) {
      tierRules[String(data.title).trim()] = {
        limitProduct: Number(data.limitProduct) || 3,
        beverages: Number(data.beverages) || 1,
        minPax: Number(data.minPax) || 20,
        maxPax: Number(data.maxPax) || 300,
        startTime: data.startTime ? String(data.startTime).trim() : "08:00",
        endTime: data.endTime ? String(data.endTime).trim() : "19:00",
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : 999,
      };
    }
  });

  // 2. Parse & Sort Presentations
  const presentations: PresentationOption[] = (presentationsRes.items || [])
    .map((item: any) => {
      const rawData = item.data || item;
      return {
        ...rawData,
        _id: item._id,
      };
    })
    .filter((data: any) => {
      if (!data.title) return false;
      if (!data.menuType) return true; // Blank menuType applies to all menus
      const presType = String(data.menuType).trim().toLowerCase();
      return catName.includes(presType) || catSlug.includes(presType);
    })
    .sort((a: any, b: any) => (Number(a.sortOrder) || 999) - (Number(b.sortOrder) || 999))
    .map((data: any) => ({
      _id: String(data._id),
      title: String(data.title).trim(),
      description: data.description ? String(data.description).trim() : undefined,
      imageUrl: resolveWixImageUrl(data.image),
      priceTiers: parsePriceTiers(data.priceTiers),
      productId: data.productId ? String(data.productId).trim() : undefined,
    }));

  // 3. Sort Store Products by CMS sortOrder
  const sortedRuleKeys = Object.keys(tierRules).sort((a, b) => b.length - a.length);
  const sortedTiers = [...productsRes.items].sort((a: any, b: any) => {
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();

    const keyA = sortedRuleKeys.find((k) => nameA.includes(k.toLowerCase()));
    const keyB = sortedRuleKeys.find((k) => nameB.includes(k.toLowerCase()));

    const orderA = keyA ? tierRules[keyA].sortOrder : 999;
    const orderB = keyB ? tierRules[keyB].sortOrder : 999;

    return orderA - orderB;
  });

  return {
    category,
    tiers: sortedTiers,
    dishes: dishesRes.items,
    tierRules,
    presentations,
  };
}