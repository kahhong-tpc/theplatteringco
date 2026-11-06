"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { creations } from "@/lib/data";
import { ChevronLeft, ChevronRight, HeartIcon } from "@/components/ui/Icons";

const GAP = 4; // px between tiles

/** 4 tiles per view on desktop, 2 on phones. */
function usePerView() {
  const [per, setPer] = useState(4);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setPer(mq.matches ? 4 : 2);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return per;
}

export default function CentrepieceCarousel() {
  const per = usePerView();
  const [index, setIndex] = useState(0);
  const max = creations.length - per;
  const pos = Math.min(index, max);

  const tileWidth = `calc((100% - ${(per - 1) * GAP}px) / ${per})`;
  const shift = `calc(${-pos} * (${tileWidth} + ${GAP}px))`;

  return (
    <section aria-labelledby="sel-t">
      <div className="mx-auto flex max-w-site flex-col gap-10 px-gutter py-24">
        <h2 id="sel-t" className="m-0 text-center text-h2 font-normal tracking-[0.01em]">
          The Centrepiece
        </h2>
        <p className="-mt-6 text-center text-sm text-ink-soft">
          Roasts and platters for eight, served with brown butter herb-roasted vegetables.
        </p>

        <div className="relative">
          <div className="overflow-hidden">
            <div
              className="flex gap-1 transition-transform duration-[600ms] ease-lux"
              style={{ transform: `translateX(${shift})` }}
            >
              {creations.map((p) => (
                <Link
                  key={p.name}
                  href={p.href}
                  className="group flex flex-col gap-3.5 text-ink no-underline"
                  style={{ flex: `0 0 ${tileWidth}` }}
                >
                  <span className="relative block aspect-[4/5] overflow-hidden bg-gradient-to-b from-[#E2E2E1] to-[#F6F6F5]">
                    <Image
                      src={p.img}
                      alt={`${p.name} platter with herb-roasted vegetables`}
                      fill
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.03]"
                    />
                    <span aria-hidden="true" className="absolute right-3.5 top-3.5 text-ink">
                      <HeartIcon />
                    </span>
                  </span>
                  <span className="flex flex-col gap-1 px-0.5 text-left">
                    <span className="text-[13px] text-ink">{p.name}</span>
                    <span className="text-[13px] text-mute">{p.price}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-label="Previous creations"
            onClick={() => setIndex(Math.max(0, pos - 1))}
            disabled={pos === 0}
            className="absolute left-[-4px] top-[38%] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-white disabled:opacity-[0.35]"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            aria-label="Next creations"
            onClick={() => setIndex(Math.min(max, pos + 1))}
            disabled={pos >= max}
            className="absolute right-[-4px] top-[38%] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-line bg-white disabled:opacity-[0.35]"
          >
            <ChevronRight />
          </button>
        </div>

        <Link href="/centrepiece" className="link-underline self-center text-[13px] text-ink">
          Discover The Centrepiece
        </Link>
      </div>
    </section>
  );
}
