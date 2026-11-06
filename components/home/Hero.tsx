import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section id="top" aria-labelledby="hero-t" className="relative aspect-[1983/793] min-h-[460px] overflow-hidden bg-hero">
      <Image
        src="/images/hero-amuse-bouche.jpg"
        alt="Six amuse-bouche on white porcelain around a travertine plinth, in soft leaf shadow"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute left-[clamp(20px,5vw,80px)] top-1/2 flex max-w-[300px] -translate-y-1/2 flex-col items-start gap-2.5 text-ink">
        <span className="text-[11px] uppercase tracking-[0.08em]">New Collection</span>
        <h1 id="hero-t" className="m-0 text-h1 font-normal tracking-[0.01em]">
          The Amuse-Bouche
        </h1>
        <Link href="/#catering" className="link-underline mt-1 text-[13px] text-ink">
          Discover the Collection
        </Link>
      </div>
    </section>
  );
}
