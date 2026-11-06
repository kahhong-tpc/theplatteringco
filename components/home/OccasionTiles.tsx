import Link from "next/link";
import { occasions } from "@/lib/data";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";

export default function OccasionTiles() {
  return (
    <section aria-labelledby="occ-t">
      <div className="mx-auto flex max-w-site flex-col gap-10 px-gutter py-24">
        <h2 id="occ-t" className="m-0 text-center text-h2 font-normal tracking-[0.01em]">
          For Every Occasion
        </h2>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          {occasions.map((o) => (
            <Link key={o} href="/" className="group flex flex-col gap-3.5 text-ink no-underline">
              <ImagePlaceholder className="aspect-square" />
              <span className="text-center text-sm">{o}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
