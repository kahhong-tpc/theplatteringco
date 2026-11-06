import Link from "next/link";
import { services } from "@/lib/data";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";

export default function ServicesGrid() {
  return (
    <section id="corporate" aria-labelledby="corp-t" className="bg-sand">
      <div className="mx-auto flex max-w-site flex-col gap-10 px-gutter py-24">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 id="corp-t" className="m-0 text-center text-h2 font-normal tracking-[0.01em]">
            The Plattering Co. Services
          </h2>
          <p className="m-0 max-w-[560px] text-sm leading-[1.7] text-ink-soft">
            Our Client Advisors are at your service, from the first idea to the last guest.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          {services.map((v) => (
            <Link key={v.name} href={v.href} className="flex flex-col gap-3.5 text-ink no-underline">
              <ImagePlaceholder className="aspect-[4/5]" />
              <span className="flex flex-col gap-1.5 px-3 text-center">
                <span className="text-sm">{v.name}</span>
                <span className="text-xs leading-[1.6] text-mute">{v.line}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
