import Link from "next/link";
import { notFound } from "next/navigation";
import { getCateringMenuBySlug } from "@/lib/catering";
import CateringBuilder from "@/components/products/CateringBuilder";
import Hero from "@/components/home/Hero";

export const revalidate = 60;

// Map each Wix Category slug to its corresponding Wix CMS Dish collection
const DISH_COLLECTION_BY_SLUG: Record<string, string> = {
  "canape-catering": "CanapeDishes",
  "christmas-buffet": "ChristmasDishes",
};

export default async function DynamicCateringMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dishCollection = DISH_COLLECTION_BY_SLUG[slug] || "CanapeDishes";

  const data = await getCateringMenuBySlug(slug, dishCollection);

  if (!data) {
    notFound();
  }

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
      />
    </main>
  );
}