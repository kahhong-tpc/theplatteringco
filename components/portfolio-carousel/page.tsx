"use client";

import { useEffect, useRef, useState } from "react";
import { media } from "@wix/sdk";

interface PortfolioItem {
  _id: string;
  title?: string;
  clientName?: string;
  clientImage?: any;
}

interface PortfolioCarouselProps {
  items: PortfolioItem[];
  speed?: number;
  hoverSpeedMultiplier?: number;
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

export default function PortfolioCarousel({
  items,
  speed = 1,
  hoverSpeedMultiplier = 0.35,
}: PortfolioCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const animation = trackRef.current?.getAnimations()[0];
    animation?.updatePlaybackRate(isHovered ? speed * hoverSpeedMultiplier : speed);
  }, [hoverSpeedMultiplier, isHovered, speed]);

  const renderItems = (duplicate = false) =>
    items.map((item) => {
      const title = item.title;
      const clientName = item.clientName;
      const imageUrl = resolveWixImage(item.clientImage);

      return (
        <div
          key={duplicate ? `${item._id}-duplicate` : item._id}
          className="w-40 flex-none overflow-hidden text-center"
        >
          {/* {imageUrl ? (
            <img
              src={imageUrl}
              alt={title || clientName || "Client showcase"}
              className="h-[200px] w-full object-cover"
            />
          ) : (
            <div className="flex h-[200px] w-full items-center justify-center bg-[#f0f0f0] text-gray-400">
              <span>No image</span>
            </div>
          )} */}
          <div className="p-4">
            <h3 className="text-[13px] uppercase tracking-[0.16em] text-ink-soft">{title}</h3>
            {/* <p className="m-0 text-[0.9rem] text-[#666]">{clientName}</p> */}
          </div>
        </div>
      );
    });

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-2 flex">
      <div className="flex w-96 items-center">
        <h2 className="text-[11px] uppercase tracking-[0.08em] text-mute">In the company of</h2>
      </div>

      <div
        className="overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          ref={trackRef}
          className={`flex w-max ${items.length > 1 ? "portfolio-marquee-track" : ""}`}
        >
          <div className="flex shrink-0 gap-2 pr-6">{renderItems()}</div>
          {items.length > 1 && (
            <div className="flex shrink-0 gap-2 pr-6" aria-hidden="true">
              {renderItems(true)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}