// lib/wix-addon.ts
export interface AddOnOptionItem {
  _id: string;
  title: string;
  groupId: string;
  description?: string;
  imageUrl?: string;
  unitLabel?: string; // e.g., "per bottle", "per pack", "per carton", "per set"
  price: number;
  pricingType: "per_pax" | "flat" | "per_unit";
  inclusions: string[];
  exclusions: string[];
  customPickers?: Record<string, number>;
  sortOrder: number;
  paxInterval?: number;
}

export interface AddOnGroupItem {
  _id: string;
  title: string;
  sectionName: string;
  selectionMode: "single" | "multiple" | "quantity";
  applicableCategoryIds: string[];
  sortOrder: number;
  options: AddOnOptionItem[];
}

// Helper to convert Wix CMS image URI to public URL
const resolveWixImageUrl = (rawImg: any): string | undefined => {
  if (!rawImg) return undefined;
  const src = typeof rawImg === "string" ? rawImg : rawImg.url || rawImg.src;
  if (!src) return undefined;
  if (src.startsWith("http")) return src;
  const match = src.match(/^wix:image:\/\/v1\/([^/]+)\//);
  return match ? `https://static.wixstatic.com/media/${match[1]}` : undefined;
};

export async function fetchCateringAddOns(wixClient: any): Promise<AddOnGroupItem[]> {
  const [groupsRes, optionsRes] = await Promise.all([
    wixClient.items
      .query("AddOnGroups")
      .include("applicableCategories")
      .eq("isActive", true)
      .ascending("sortOrder")
      .find(),
    wixClient.items
      .query("AddOnOptions")
      .eq("isActive", true)
      .ascending("sortOrder")
      .find(),
  ]);

  // Map options by parent group ID
  const optionsByGroup = new Map<string, AddOnOptionItem[]>();
  for (const rawOpt of optionsRes.items) {
    const groupId =
      typeof rawOpt.group === "string" ? rawOpt.group : rawOpt.group?._id;
    if (!groupId) continue;

    const rawInterval = Number(rawOpt.paxInterval ?? rawOpt.data?.paxInterval);
    const paxInterval =
    Number.isFinite(rawInterval) && rawInterval > 0
        ? Math.floor(rawInterval)
        : undefined;

    const option: AddOnOptionItem = {
      _id: rawOpt._id,
      title: rawOpt.title || "",
      groupId,
      description: rawOpt.description || "",
      imageUrl: resolveWixImageUrl(rawOpt.image),
      unitLabel: rawOpt.unitLabel || "",
      price: Number(rawOpt.price || 0),
      pricingType: rawOpt.pricingType || "flat",
      inclusions: Array.isArray(rawOpt.inclusions) ? rawOpt.inclusions : [],
      exclusions: Array.isArray(rawOpt.exclusions) ? rawOpt.exclusions : [],
      paxInterval,
      customPickers:
        rawOpt.customPickers && typeof rawOpt.customPickers === "object"
          ? rawOpt.customPickers
          : undefined,
      sortOrder: Number(rawOpt.sortOrder || 0),
    };

    const existing = optionsByGroup.get(groupId) || [];
    existing.push(option);
    optionsByGroup.set(groupId, existing);
  }

  // Attach options to each group & normalize applicableCategories
  return groupsRes.items.map((rawGroup: any) => {
    const rawCats = rawGroup.applicableCategories || [];
    const applicableCategoryIds = Array.isArray(rawCats)
      ? rawCats.map((c: any) => (typeof c === "string" ? c : c._id))
      : [];

    return {
      _id: rawGroup._id,
      title: rawGroup.title || "",
      sectionName: rawGroup.sectionName || "Additional Services",
      selectionMode:
        rawGroup.selectionMode === "single"
          ? "single"
          : rawGroup.selectionMode === "quantity"
          ? "quantity"
          : "multiple",
      applicableCategoryIds,
      sortOrder: Number(rawGroup.sortOrder || 0),
      options: optionsByGroup.get(rawGroup._id) || [],
    };
  });
}

export async function fetchAddOnDrinks(
  wixClient: any
): Promise<Record<string, string[]>> {
  const drinksRes = await wixClient.items
    .query("AddOnDrinks")
    .ascending("sortOrder")
    .find();

  const drinkMenus: Record<string, string[]> = {};

  for (const rawDrink of drinksRes.items) {
    const data = rawDrink.data || rawDrink;
    if (data.isActive === false) continue;

    const categoryKey = (data.category || "").trim().toLowerCase();
    const title = (data.title || "").trim();
    if (!categoryKey || !title) continue;

    if (!drinkMenus[categoryKey]) {
      drinkMenus[categoryKey] = [];
    }
    drinkMenus[categoryKey].push(title);
  }

  return drinkMenus;
}