import { clients } from "@/lib/data";

export default function ClientsStrip() {
  return (
    <section aria-label="In the company of">
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-center gap-x-9 gap-y-3 border-b border-line-soft px-gutter py-[22px]">
        <span className="text-[11px] uppercase tracking-[0.08em] text-mute">In the company of</span>
        {clients.map((c) => (
          <span key={c} className="text-[13px] uppercase tracking-[0.16em] text-ink-soft">
            {c}
          </span>
        ))}
      </div>
    </section>
  );
}
