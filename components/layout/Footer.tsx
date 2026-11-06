import Link from "next/link";
import { contactInfo, footerColumns } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white text-ink">
      <div className="mx-auto flex max-w-site flex-col gap-14 px-gutter pb-8 pt-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.3fr)]">
          {footerColumns.map((col) => (
            <div key={col.id} id={col.id} className="flex flex-col gap-3.5">
              <span className="text-[11px] uppercase tracking-[0.08em]">{col.head}</span>
              {col.links.map((l) => (
                <Link key={l} href="/" className="link-grow self-start pb-1 text-[13px] text-ink-soft no-underline">
                  {l}
                </Link>
              ))}
            </div>
          ))}

          <div id="faq-t" className="col-span-2 flex flex-col gap-3.5 lg:col-span-1">
            <span className="text-[11px] uppercase tracking-[0.08em]">Email Sign-Up</span>
            <span className="text-[13px] leading-[1.7] text-ink-soft">
              Sign up for The Plattering Co. emails and receive news of new collections, seasonal menus and events.
            </span>
            <Link href="/" className="link-underline self-start text-[13px] text-ink">
              Subscribe
            </Link>
            <span className="mt-2 text-[13px] text-ink-soft">
              {contactInfo.phone} · {contactInfo.email}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-6 text-xs text-mute">
          <span>Singapore</span>
          <span className="flex gap-6">
            <Link href="/sitemap" className="link-grow text-mute no-underline">Sitemap</Link>
            <Link href="/" className="link-grow text-mute no-underline">Legal &amp; Privacy</Link>
            <Link href="/" className="link-grow text-mute no-underline">Cookies</Link>
          </span>
        </div>

        <div className="pl-[0.16em] text-center text-[clamp(20px,2vw,28px)] font-normal tracking-[0.16em] text-ink-soft">
          THE PLATTERING CO.
        </div>
      </div>
    </footer>
  );
}
