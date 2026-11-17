import Link from "next/link";
import { getCateringCategories } from "@/lib/catering";

export const revalidate = 60;

export default async function CateringHubPage() {
  const categories = await getCateringCategories();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight">Catering Menus</h1>
        <p className="mt-3 text-lg text-gray-600">
          Choose a catering category below to customize your menu, guest count, and event timing.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {categories.map((cat: any) => (
          <Link
            key={cat._id}
            href={`/catering/${cat.slug}`}
            className="group flex flex-col justify-between rounded-2xl border border-gray-200 p-6 transition hover:border-black"
          >
            <div>
              {cat.media?.mainMedia?.image?.url && (
                <img
                  src={cat.media.mainMedia.image.url}
                  alt={cat.name}
                  className="mb-4 h-48 w-full rounded-xl object-cover"
                />
              )}
              <h2 className="text-2xl font-bold group-hover:underline">{cat.name}</h2>
              {cat.description && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {cat.description}
                </p>
              )}
            </div>

            <div className="mt-6">
              <span className="inline-block rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-gray-800">
                Customize Menu →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}