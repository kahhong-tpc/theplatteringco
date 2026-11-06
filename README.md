# The Plattering Co. — Next.js + Tailwind

Home page converted from the "Plattering Co Website Rebrand" design.

```bash
npm install
npm run dev
```

## Structure

- `app/layout.tsx` — Jost font, bag provider, header/overlays, footer (shared by every page)
- `app/page.tsx` — Home
- `components/layout/*` — Header, menu drawer, search, contact panel, footer
- `components/home/*` — one component per Home section
- `lib/data.ts` — menu, search index, products, copy (swap for Wix data later)
- `tailwind.config.ts` — colour tokens, animations, type scale
- `public/images/*` — photography pulled from the design

## Routes linked but not built yet

`/centrepiece`, `/centrepiece/braised-short-rib`, `/canapes`, `/canapes/quote`, `/sitemap`
