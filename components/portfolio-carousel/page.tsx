"use client";

import { useRef } from "react";
import { media } from "@wix/sdk";

interface PortfolioItem {
  _id: string;
  title?: string;
  clientName?: string;
  clientImage?: any;
}

function resolveWixImage(imgValue: any): string | null {
  if (!imgValue) return null;

  // Direct web URL
  if (typeof imgValue === "string" && imgValue.startsWith("http")) {
    return imgValue;
  }

  // Standard Wix URI
  if (typeof imgValue === "string" && imgValue.startsWith("wix:image://")) {
    try {
      return media.getImageUrl(imgValue).url;
    } catch {
      return null;
    }
  }

  // Nested Wix image object
  if (typeof imgValue === "object") {
    if (imgValue?.url) return imgValue.url;
    if (imgValue?.src) return resolveWixImage(imgValue.src);
  }

  return null;
}

export default function PortfolioCarousel({ items }: { items: PortfolioItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Our Portfolio</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="cursor-pointer rounded-full border border-gray-300 px-3.5 py-2 hover:bg-gray-100"
            aria-label="Previous slide"
          >
            ←
          </button>
          <button
            onClick={() => scroll("right")}
            className="cursor-pointer rounded-full border border-gray-300 px-3.5 py-2 hover:bg-gray-100"
            aria-label="Next slide"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:none]"
      >
        {items.map((item) => {
          // Check nested item.data first, fallback to root item

            const title = item.title;
            const clientName = item.clientName;
            const imageUrl = resolveWixImage(item.clientImage);

          return (
            <div
              key={item._id}
              className="flex-none basis-[320px] snap-start overflow-hidden rounded-xl border border-[#eaeaea] shadow-[0_4px_6px_rgba(0,0,0,0.05)]"
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={title || clientName || "Client showcase"}
                  className="h-[200px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[200px] w-full items-center justify-center bg-[#f0f0f0] text-gray-400">
                  <span>No image</span>
                </div>
              )}
              <div className="p-4">
                <h3 className="mb-1 text-[1.1rem] font-semibold">{title}</h3>
                <p className="m-0 text-[0.9rem] text-[#666]">{clientName}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}