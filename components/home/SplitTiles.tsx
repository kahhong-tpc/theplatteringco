import Image from "next/image";
import Link from "next/link";
import { splitTiles } from "@/lib/data";

export default function SplitTiles() {
  return (
    <section aria-label="Delivered and Hosted" className="grid grid-cols-1 gap-1 pt-1 sm:grid-cols-2">
      {splitTiles.map((t) => (
        <Link
          key={t.id}
          id={t.id}
          href={t.href}
          className="group relative block aspect-[4/5] overflow-hidden text-white no-underline"
        >
          <Image
            src={t.img}
            alt={t.alt}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover object-[50%_40%]"
          />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-b from-ink/0 to-ink/50" />
          <span className="absolute inset-x-0 bottom-[clamp(28px,4vw,56px)] flex flex-col items-center gap-2.5 text-center">
            <span className="text-[clamp(22px,2.2vw,30px)] font-normal">{t.title}</span>
            <span className="max-w-[320px] px-4 text-sm leading-normal">{t.line}</span>
            <span className="mt-2 box-border flex h-12 min-w-[150px] cursor-pointer items-center justify-center border border-current px-8 text-xs font-medium uppercase tracking-[0.12em] transition-colors duration-[350ms] ease-out group-hover:border-white group-hover:bg-white group-hover:text-ink group-focus-visible:border-white group-focus-visible:bg-white group-focus-visible:text-ink">
              {t.cta}
            </span>
          </span>
        </Link>
      ))}
    </section>
  );
}
