/** Grey "Image" slot used where the design has no photography yet. */
export default function ImagePlaceholder({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center bg-stone text-[11px] uppercase tracking-[0.14em] text-stone-text ${className}`}
    >
      Image
    </span>
  );
}
