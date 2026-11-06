import Image from "next/image";
import Link from "next/link";

export default function FestiveBanner() {
  return (
    <section id="festive" aria-labelledby="fes-t" className="relative aspect-[16/7] min-h-[420px] overflow-hidden bg-wine">
      <Image
        src="/images/festive-christmas.jpg"
        alt="A Christmas spread of roast turkey, porchetta, ribs and prime rib on deep red velvet, with evergreen, berries and red ribbons"
        fill
        sizes="100vw"
        className="object-cover object-[50%_60%]"
      />
      <div className="absolute right-[clamp(20px,5vw,80px)] top-[clamp(28px,4vw,64px)] flex max-w-[320px] flex-col items-end gap-2.5 text-right text-white">
        <span className="text-[11px] uppercase tracking-[0.08em]">The Festive Collection</span>
        <h2 id="fes-t" className="m-0 text-h1 font-normal">
          Christmas 2026
        </h2>
        <Link href="/#festive" className="link-underline mt-1 text-[13px] text-white">
          Discover the Collection
        </Link>
      </div>
    </section>
  );
}
