"use client";

import { useState } from "react";
import Link from "next/link";
import { contactInfo, searchIndex, trendingSearches } from "@/lib/data";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";

export default function SearchPanel({ closing, onClose }: { closing: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hits = q ? searchIndex.filter(([name, kind]) => `${name} ${kind}`.toLowerCase().includes(q)) : [];

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className={`absolute inset-0 cursor-pointer border-0 bg-ink/[0.28] p-0 backdrop-blur-[6px] motion-reduce:animate-none ${
          closing ? "animate-back-out" : "animate-back-in"
        }`}
      />
      <div
        id="search-panel"
        role="dialog"
        aria-label="Search"
        className={`absolute inset-x-0 top-0 max-h-full overflow-y-auto bg-white text-ink motion-reduce:animate-none ${
          closing ? "animate-search-out" : "animate-search-in"
        }`}
      >
        <div className="mx-auto flex max-w-[1100px] flex-col gap-9 px-[clamp(20px,3vw,40px)] pb-14 pt-6">
          <div className="flex h-10 items-center justify-between">
            <span className="pl-[0.3em] text-[13px] tracking-[0.3em] text-ink-soft">THE PLATTERING CO.</span>
            <button type="button" onClick={onClose} className="link-grow flex items-center gap-2.5 border-0 bg-transparent py-2.5 text-[13px] cursor-pointer">
              <CloseIcon />
              Close
            </button>
          </div>

          <label className="flex animate-rise items-center gap-4 motion-reduce:animate-none" style={{ animationDelay: ".12s" }}>
            <SearchIcon size={22} />
            <span className="sr-only">Search</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a collection, an occasion or a question"
              className="search-input h-16 min-w-0 flex-1 bg-transparent p-0 text-[clamp(20px,2.4vw,30px)] font-light text-ink"
            />
            {q && (
              <button type="button" onClick={() => setQuery("")} className="link-grow border-0 bg-transparent py-2.5 text-[13px] text-mute cursor-pointer">
                Clear
              </button>
            )}
          </label>

          {!q && (
            <div className="flex animate-rise flex-col gap-4 motion-reduce:animate-none" style={{ animationDelay: ".2s" }}>
              <span className="text-[11px] uppercase tracking-[0.14em] text-mute">Trending Searches</span>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuery(t)}
                    className="h-10 cursor-pointer border border-ink bg-white px-5 text-[13px] text-ink transition-colors duration-[250ms] hover:bg-ink hover:text-white"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {q && (
            <div className="flex flex-col gap-3">
              <span role="status" className="text-[11px] uppercase tracking-[0.14em] text-mute">
                {hits.length} {hits.length === 1 ? "result" : "results"}
              </span>
              <div className="flex flex-col">
                {hits.map(([name, kind, href], i) => (
                  <Link
                    key={name}
                    href={href}
                    onClick={onClose}
                    className="flex animate-rise items-baseline justify-between gap-4 border-b border-line-faint py-4 text-ink no-underline transition-[padding] duration-300 hover:pl-1.5 motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <span className="text-[18px]">{name}</span>
                    <span className="text-xs text-mute">{kind}</span>
                  </Link>
                ))}
              </div>
              {hits.length === 0 && (
                <p className="m-0 text-sm leading-[1.7] text-ink-soft">
                  Nothing found for that yet. Our team can help at {contactInfo.phone} or {contactInfo.email}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
