import Link from "next/link";
import { notFound } from "next/navigation";
import { getCateringMenuBySlug } from "@/lib/catering";
import CateringBuilder, {
  BlackoutDateRule,
} from "@/components/products/CateringBuilder";
import Hero from "@/components/home/Hero";
import { getServerWixClient } from "@/lib/wixClientServer";
import { fetchCateringAddOns, fetchAddOnDrinks } from "@/lib/wix-addon";

// Map each Wix Category slug to its corresponding Wix CMS Dish collection
const DISH_COLLECTION_BY_SLUG: Record<string, string> = {
  "canape-catering": "CanapeDishes",
  "christmas-buffet": "ChristmasDishes",
};

function normalizeCategoryIds(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : [value];

  return entries.flatMap((entry): string[] => {
    if (typeof entry === "string") {
      return entry.split(",").map((id) => id.trim()).filter(Boolean);
    }

    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const id = record._id ?? record.id;
      return typeof id === "string" && id.trim() ? [id.trim()] : [];
    }

    return [];
  });
}

export default async function DynamicCateringMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dishCollection = DISH_COLLECTION_BY_SLUG[slug] || "CanapeDishes";
  const serverWixClient = await getServerWixClient();

  const [data, addOnGroups, drinkMenus, blackoutRes] = await Promise.all([
    getCateringMenuBySlug(
      slug,
      dishCollection,
      "CateringTiers",
      "CateringPresentations",
      serverWixClient
    ),
    fetchCateringAddOns(serverWixClient),
    fetchAddOnDrinks(serverWixClient),
    serverWixClient.items
      .query("CategoryBlackoutDates")
      .limit(100)
      .find()
      .catch(() => ({ items: [] })),
  ]);

  if (!data) {
    notFound();
  }

  const blackoutDates: BlackoutDateRule[] = (blackoutRes.items || []).map(
    (item: any) => ({
      _id: item._id,
      startDate: String(item.startDate || item.data?.startDate || "").slice(
        0,
        10
      ),
      endDate: String(
        item.endDate ||
          item.data?.endDate ||
          item.startDate ||
          item.data?.startDate ||
          ""
      ).slice(0, 10),
      categoryIds: normalizeCategoryIds(
        item.categoryIds ?? item.data?.categoryIds
      ),
      reason:
        item.reason ||
        item.data?.reason ||
        "This category is unavailable on the selected date.",
    })
  );

  return (
    <main className="py-10">
      <Hero />
      <div className="mx-auto max-w-4xl px-6">
        <Link
          href="/catering"
          className="text-sm font-medium text-gray-500 hover:text-black"
        >
          ← Back to All Catering Menus
        </Link>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          {data.category.name}
        </h1>
        {data.category.description && (
          <p className="mt-2 text-gray-600">{data.category.description}</p>
        )}
      </div>

      <CateringBuilder
        tiers={data.tiers}
        dishes={data.dishes}
        tierRules={data.tierRules}
        presentations={data.presentations}
        addOnGroups={addOnGroups}
        drinkMenus={drinkMenus}
        categorySlug={slug}
        blackoutDates={blackoutDates}
        rulesByProductId={data.rulesByProductId || {}}
      />
    </main>
  );
}