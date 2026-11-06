"use client";

import Link from "next/link";
import { contactRows } from "@/lib/data";
import { ChevronRight, CloseIcon } from "@/components/ui/Icons";

export default function ContactPanel({ closing, onClose }: { closing: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close contact"
        onClick={onClose}
        className={`absolute inset-0 cursor-pointer border-0 bg-ink/[0.28] p-0 backdrop-blur-[6px] motion-reduce:animate-none ${
          closing ? "animate-back-out" : "animate-back-in"
        }`}
      />
      <aside
        id="contact-panel"
        role="dialog"
        aria-labelledby="contact-t"
        className={`absolute inset-y-0 right-0 box-border flex w-[min(480px,100%)] flex-col gap-8 overflow-y-auto bg-white px-[clamp(24px,3.4vw,56px)] pb-10 pt-4 text-ink motion-reduce:animate-none ${
          closing ? "animate-drawer-r-out" : "animate-drawer-r-in"
        }`}
      >
        <div className="flex h-10 items-center justify-end">
          <button type="button" onClick={onClose} className="link-grow flex items-center gap-2.5 border-0 bg-transparent py-2.5 text-[13px] cursor-pointer">
            Close
            <CloseIcon />
          </button>
        </div>

        <div className="flex animate-rise flex-col gap-3 motion-reduce:animate-none" style={{ animationDelay: ".1s" }}>
          <h2 id="contact-t" className="m-0 text-[28px] font-normal">
            Speak to a Client Advisor
          </h2>
          <p className="m-0 text-sm leading-[1.7] text-ink-soft">
            Wherever you are in your planning, our Client Advisors will be delighted to help you choose your menu, shape your gathering and place your order.
          </p>
        </div>

        <div className="flex flex-col">
          {contactRows.map((c, i) => {
            const cls =
              "group flex animate-rise items-center justify-between gap-4 border-b border-line-faint py-[18px] text-ink no-underline transition-[padding] duration-300 hover:pl-1.5 motion-reduce:animate-none";
            const style = { animationDelay: `${0.16 + i * 0.05}s` };
            const inner = (
              <>
                <span className="flex flex-col gap-1">
                  <span className="text-base">{c.name}</span>
                  <span className="text-[13px] text-mute">{c.detail}</span>
                </span>
                <ChevronRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </>
            );
            return c.href.startsWith("/") ? (
              <Link key={c.name} href={c.href} onClick={onClose} className={cls} style={style}>
                {inner}
              </Link>
            ) : (
              <a key={c.name} href={c.href} target={c.external ? "_blank" : undefined} rel="noopener" className={cls} style={style}>
                {inner}
              </a>
            );
          })}
        </div>

        <div className="flex animate-rise flex-col gap-1 motion-reduce:animate-none" style={{ animationDelay: ".4s" }}>
          <span className="mb-2 text-[11px] uppercase tracking-[0.14em] text-mute">Further Assistance</span>
          <Link href="/#faq-t" onClick={onClose} className="link-grow self-start py-2 text-sm text-ink no-underline">
            Frequently Asked Questions
          </Link>
          <Link href="/#corp-t" onClick={onClose} className="link-grow self-start py-2 text-sm text-ink no-underline">
            Corporate Accounts
          </Link>
        </div>
      </aside>
    </div>
  );
}
