import Link from "next/link";
import ImagePlaceholder from "@/components/ui/ImagePlaceholder";

export default function HouseSection() {
  return (
    <section aria-labelledby="house-t">
      <div className="mx-auto flex max-w-site flex-col items-center gap-8 px-gutter py-24">
        <h2 id="house-t" className="m-0 text-center text-h2 font-normal tracking-[0.01em]">
          The House
        </h2>
        <Link href="/" className="block w-full">
          <ImagePlaceholder className="aspect-[16/7] w-full" />
        </Link>
        <p className="m-0 max-w-[620px] text-center text-sm leading-[1.75] text-ink-soft">
          Since 2018, The Plattering Co. has prepared food for gatherings with the same care in the kitchen and at the table: taste first, then presentation, then the quiet details that make guests feel looked after.
        </p>
        <Link href="/" className="link-underline text-[13px] text-ink">
          Discover the House
        </Link>
      </div>
    </section>
  );
}
