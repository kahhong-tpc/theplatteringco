import { wixClient } from "@/lib/wixClient";
import { getServerWixClient } from "@/lib/wixClientServer";

export interface MenuDishItem {
  _id: string;
  title: string;
  description?: string;
  dietaryTags?: string[];
  sortOrder: number;
}

export interface MenuSection {
  _id: string;
  title: string;
  description?: string;
  selectionType: "fixed" | "choice";
  selectLimit: number;
  sortOrder: number;
  items: MenuDishItem[];
}

export interface TierRule {
  _id?: string;
  limitProduct: number;
  beverages: number;
  minPax: number;
  maxPax: number;
  startTime: string;
  endTime: string;
  sortOrder: number;
  paxInterval: number;
  title: string;
  description?: string;
  sections: MenuSection[];
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
 * Preserves `0` in CMS instead of overwriting it via `|| default`.
 */
function parseNumericField(raw: unknown, fallback: number): number {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Normalizes Wix reference / multi-reference fields (string IDs or `{ _id }` objects).
 */
function extractReferenceIds(rawRef: unknown): string[] {
  if (!rawRef) return [];
  const items = Array.isArray(rawRef) ? rawRef : [rawRef];
  return items
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object" && "_id" in entry) {
        return String((entry as { _id: unknown })._id).trim();
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Normalizes dietaryTags whether stored as Wix Tags (`string[]`) or comma-separated Text.
 */
function parseDietaryTags(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const tags = raw.map((t) => String(t).trim()).filter(Boolean);
    return tags.length > 0 ? tags : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    const tags = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return tags.length > 0 ? tags : undefined;
  }
  return undefined;
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
 * Builds legacy Canapés & Beverages sections when a tier has no `MenuSections` linked yet.
 */
function buildLegacyCanapeSections(
  tierId: string,
  limitProduct: number,
  beveragesLimit: number,
  legacyDishes: any[]
): MenuSection[] {
  const sections: MenuSection[] = [];

  const normalizedDishes = legacyDishes.map((raw: any, idx: number) => {
    const d = raw.data || raw;
    return {
      _id: String(raw._id || `legacy-dish-${idx}`),
      title: String(d.title || "").trim(),
      description: d.description ? String(d.description).trim() : undefined,
      dietaryTags: parseDietaryTags(d.dietaryTags),
      sortOrder: parseNumericField(d.sortOrder, idx + 1),
      type: String(d.type || d.category || "").toLowerCase(),
    };
  });

  const isBeverageDish = (d: { type: string }) =>
    d.type.includes("beverage") || d.type.includes("drink");

  if (limitProduct > 0) {
    const canapeItems = normalizedDishes
      .filter((d) => d.title && !isBeverageDish(d))
      .map(({ type: _type, ...rest }) => rest);

    sections.push({
      _id: `legacy-canapes-${tierId}`,
      title: "Canapés",
      selectionType: "choice",
      selectLimit: limitProduct,
      sortOrder: 1,
      items: canapeItems,
    });
  }

  if (beveragesLimit > 0) {
    const beverageItems = normalizedDishes
      .filter((d) => d.title && isBeverageDish(d))
      .map(({ type: _type, ...rest }) => rest);

    sections.push({
      _id: `legacy-beverages-${tierId}`,
      title: "Beverages",
      selectionType: "choice",
      selectLimit: beveragesLimit,
      sortOrder: 2,
      items: beverageItems,
    });
  }

  return sections;
}

/**
 * Fetches all visible Wix Store Categories (Collections) for the central /catering hub.
 */
export async function getCateringCategories(client?: any) {
  const activeClient = client || (await getServerWixClient());
  const res = await activeClient.collections.queryCollections().find();
  return res.items.filter(
    (col: any) => col.slug !== "all-products" && col.visible !== false
  );
}

/**
 * Fetches a category by slug, plus its products, tier rules (indexed by Product ID
 * and Title), dynamic sections/items, and table presentations.
 */
export async function getCateringMenuBySlug(
  slug: string,
  dishCollectionId = "CanapeDishes",
  rulesCollectionId = "CateringTiers",
  presentationsCollectionId = "CateringPresentations",
  client?: any,
  sectionsCollectionId = "MenuSections",
  menuItemsCollectionId = "MenuItems"
) {
  const activeClient = client || (await getServerWixClient());
  let colRes;

  try {
    colRes = await activeClient.collections.getCollectionBySlug(slug);
  } catch (err: any) {
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

  // Fetch Store products + CMS collections in parallel.
  // `.include("products")` populates the Stores/Products reference on CateringTiers.
  const [
    productsRes,
    legacyDishesRes,
    rulesRes,
    presentationsRes,
    sectionsRes,
    menuItemsRes,
  ] = await Promise.all([
    activeClient.products
      .queryProducts()
      .hasSome("collectionIds", [category._id])
      .ascending("price")
      .find(),
    activeClient.items
      .query(dishCollectionId)
      .limit(200)
      .find()
      .catch(() => ({ items: [] })),
    activeClient.items
      .query(rulesCollectionId)
      .include("products")
      .limit(100)
      .find(),
    activeClient.items
      .query(presentationsCollectionId)
      .limit(50)
      .find()
      .catch(() => ({ items: [] })),
    activeClient.items
      .query(sectionsCollectionId)
      .include("tiers")
      .limit(200)
      .find()
      .catch(() => ({ items: [] })),
    activeClient.items
      .query(menuItemsCollectionId)
      .include("sections")
      .limit(500)
      .find()
      .catch(() => ({ items: [] })),
  ]);

  const catName = String(category.name || "").toLowerCase();
  const catSlug = String(category.slug || "").toLowerCase();
  const categoryProductIds = new Set(
    (productsRes.items || []).map((p: any) => String(p._id))
  );

  // 1. Group MenuItems by referenced MenuSection ID
  const itemsBySectionId: Record<string, MenuDishItem[]> = {};
  (menuItemsRes.items || []).forEach((rawItem: any) => {
    const data = rawItem.data || rawItem;
    if (!data.title) return;

    const dish: MenuDishItem = {
      _id: String(rawItem._id),
      title: String(data.title).trim(),
      description: data.description ? String(data.description).trim() : undefined,
      dietaryTags: parseDietaryTags(data.dietaryTags),
      sortOrder: parseNumericField(data.sortOrder, 999),
    };

    const sectionIds = extractReferenceIds(data.sections ?? rawItem.sections);
    sectionIds.forEach((secId) => {
      if (!itemsBySectionId[secId]) itemsBySectionId[secId] = [];
      itemsBySectionId[secId].push(dish);
    });
  });

  Object.values(itemsBySectionId).forEach((list) =>
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
  );

  // 2. Group MenuSections by referenced CateringTier ID
  const sectionsByTierId: Record<string, MenuSection[]> = {};
  (sectionsRes.items || []).forEach((rawSection: any) => {
    const data = rawSection.data || rawSection;
    if (!data.title) return;

    const sectionId = String(rawSection._id);
    const rawSelectionType = String(data.selectionType || "choice")
      .trim()
      .toLowerCase();
    const selectionType: "fixed" | "choice" =
      rawSelectionType === "fixed" ? "fixed" : "choice";
    const selectLimit =
      selectionType === "fixed" ? 0 : parseNumericField(data.selectLimit ?? data.select_limit ?? data.limit, 0);

    const sectionObj: MenuSection = {
      _id: sectionId,
      title: String(data.title).trim(),
      description: data.description ? String(data.description).trim() : undefined,
      selectionType,
      selectLimit,
      sortOrder: parseNumericField(data.sortOrder, 999),
      items: itemsBySectionId[sectionId] || [],
    };

    const tierIds = extractReferenceIds(data.tiers ?? rawSection.tiers);
    tierIds.forEach((tierId) => {
      if (!sectionsByTierId[tierId]) sectionsByTierId[tierId] = [];
      sectionsByTierId[tierId].push(sectionObj);
    });
  });

  Object.values(sectionsByTierId).forEach((list) =>
    list.sort((a, b) => a.sortOrder - b.sortOrder)
  );

  // 3. Parse Tier Rules & Index by Product ID (primary) and Title (fallback)
  const rulesByProductId: Record<string, TierRule> = {};
  const tierRules: Record<string, TierRule> = {};

  (rulesRes.items || []).forEach((item: any) => {
    const data = item.data || item;
    if (!data.title) return;

    const linkedProductIds = extractReferenceIds(
      data.products ?? item.products
    );

    if (linkedProductIds.length > 0) {
      // Direct reference mode: keep tier only if at least one linked product is in this category
      const belongsToCategory = linkedProductIds.some((pid) =>
        categoryProductIds.has(pid)
      );
      if (!belongsToCategory) return;
    } else if (data.menuType) {
      // Legacy fallback mode when `products` reference is not yet linked
      const ruleType = String(data.menuType).trim().toLowerCase();
      if (!catName.includes(ruleType) && !catSlug.includes(ruleType)) {
        return;
      }
    }

    const tierId = String(item._id);
    const title = String(data.title).trim();
    const limitProduct = parseNumericField(
      data.limitProduct ?? data.limit_product ?? data.limit,
      0
    );
    const beverages = parseNumericField(data.beverages, 0);

    const dynamicSections = sectionsByTierId[tierId];
    const hasDynamicSections =
      Array.isArray(dynamicSections) && dynamicSections.length > 0;

    const resolvedSections = hasDynamicSections
      ? dynamicSections
      : buildLegacyCanapeSections(
          tierId,
          limitProduct,
          beverages,
          legacyDishesRes.items || []
        );

    const ruleObj: TierRule = {
      _id: tierId,
      limitProduct,
      beverages,
      minPax: parseNumericField(data.minPax, 20),
      maxPax: parseNumericField(data.maxPax, 300),
      startTime: data.startTime ? String(data.startTime).trim() : "08:00",
      endTime: data.endTime ? String(data.endTime).trim() : "19:00",
      sortOrder: parseNumericField(data.sortOrder, 999),
      title,
      description: data.description ? String(data.description).trim() : undefined,
      paxInterval: Math.max(
        1,
        parseNumericField(item.paxInterval ?? data.paxInterval, 5)
      ),
      sections: resolvedSections,
    };

    tierRules[title] = ruleObj;
    linkedProductIds.forEach((pid) => {
      rulesByProductId[pid] = ruleObj;
    });
  });

  // 4. Parse & Sort Presentations
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
      if (!data.menuType) return true;
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

  // 5. Sort Store Products by CMS sortOrder (ID match first, title match fallback)
  const sortedRuleKeys = Object.keys(tierRules).sort((a, b) => b.length - a.length);
  const getSortOrderForProduct = (product: any): number => {
    if (product?._id && rulesByProductId[product._id]) {
      return rulesByProductId[product._id].sortOrder;
    }
    const name = (product?.name || "").toLowerCase();
    const matchedKey = sortedRuleKeys.find((k) => name.includes(k.toLowerCase()));
    return matchedKey ? tierRules[matchedKey].sortOrder : 999;
  };

  const sortedTiers = [...productsRes.items].sort(
    (a: any, b: any) => getSortOrderForProduct(a) - getSortOrderForProduct(b)
  );

  return {
    category,
    tiers: sortedTiers,
    dishes: legacyDishesRes.items,
    tierRules,
    rulesByProductId,
    presentations,
  };
}