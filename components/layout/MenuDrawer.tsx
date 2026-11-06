"use client";

import { useState } from "react";
import Link from "next/link";
import { contactInfo, menu, menuSmall } from "@/lib/data";
import { ChevronLeft, ChevronRight, CloseIcon } from "@/components/ui/Icons";

const rowBase =
  "group flex w-full items-center justify-between gap-4 border-0 bg-transparent py-[11px] text-left text-ink no-underline transition-[padding] duration-300 hover:pl-1.5 cursor-pointer";

export default function MenuDrawer({ closing, onClose }: { closing: boolean; onClose: () => void }) {
  const [subKey, setSubKey] = useState<string | null>(null);
  const sub = menu.find((m) => m.key === subKey && m.kids);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 cursor-pointer border-0 bg-ink/[0.28] p-0 backdrop-blur-[6px] motion-reduce:animate-none ${
          closing ? "animate-back-out" : "animate-back-in"
        }`}
      />
      <nav
        id="drawer"
        aria-label="Menu"
        className={`absolute inset-y-0 left-0 box-border flex w-[min(480px,100%)] flex-col gap-8 overflow-y-auto bg-white px-[clamp(24px,3.4vw,56px)] pb-10 pt-4 text-ink motion-reduce:animate-none ${
          closing ? "animate-drawer-out" : "animate-drawer-in"
        }`}
      >
        <div className="flex h-10 items-center">
          <button type="button" onClick={onClose} className="link-grow flex items-center gap-2.5 border-0 bg-transparent py-2.5 text-[13px] tracking-[0.01em] cursor-pointer">
            <CloseIcon />
            Close
          </button>
        </div>

        {!sub && (
          <>
            <div className="flex flex-col">
              {menu.map((m, i) => (
                <div key={m.key} className="animate-rise motion-reduce:animate-none" style={{ animationDelay: `${0.08 + i * 0.05}s` }}>
                  {m.kids ? (
                    <button type="button" className={rowBase} onClick={() => setSubKey(m.key)}>
                      <span className="text-[18px] font-normal tracking-[0.005em]">{m.name}</span>
                      <ChevronRight className="transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  ) : (
                    <Link href={m.href ?? "/"} className={rowBase} onClick={onClose}>
                      <span className="text-[18px] font-normal tracking-[0.005em]">{m.name}</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <div
              className="flex animate-rise flex-col gap-1 border-t border-line pt-5 motion-reduce:animate-none"
              style={{ animationDelay: "0.38s" }}
            >
              {menuSmall.map((l) => (
                <Link key={l.name} href={l.href} onClick={onClose} className="link-grow self-start py-[7px] text-[13px] text-ink no-underline">
                  {l.name}
                </Link>
              ))}
            </div>
          </>
        )}

        {sub && (
          <div className="flex animate-sub-in flex-col gap-6 motion-reduce:animate-none">
            <button
              type="button"
              onClick={() => setSubKey(null)}
              className="link-grow flex items-center gap-2.5 self-start border-0 bg-transparent py-2.5 text-[13px] tracking-[0.01em] cursor-pointer"
            >
              <ChevronLeft />
              Back
            </button>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] text-mute">{sub.eyebrow}</span>
              <span className="text-[22px] font-normal">{sub.name}</span>
            </div>
            <div className="flex flex-col">
              {sub.kids!.map((k, i) => (
                <Link
                  key={k.name}
                  href={k.href}
                  onClick={onClose}
                  className={`${rowBase} animate-rise border-b border-line-faint text-[15px] motion-reduce:animate-none`}
                  style={{ animationDelay: `${0.06 + i * 0.04}s` }}
                >
                  <span className="text-[15px]">{k.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-1.5 text-[13px] text-mute">
          <span>{contactInfo.phone}</span>
          <span>{contactInfo.email}</span>
        </div>
      </nav>
    </div>
  );
}
