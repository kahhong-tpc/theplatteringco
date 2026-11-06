import { createClient, OAuthStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import PortfolioCarousel from "@/components/portfolio-carousel/page";
import Hero from "@/components/home/Hero";

const client = createClient({
  modules: { items },
  auth: OAuthStrategy({
    clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
  }),
});

export default async function PortfolioPage() {
  try {
    const response = await client.items.query("PortfolioCarousel").find();
    console.log("--- FIRST ITEM KEYS ---");
    console.log("Root keys:", Object.keys(response.items[0]));
    if (response.items[0].data) {
    console.log("Nested data keys:", Object.keys(response.items[0].data));
    }
    console.log("Full sample item:", JSON.stringify(response.items[0], null, 2));

    return (
      <main>
        <Hero />
        <PortfolioCarousel items={response.items || []} />
      </main>
    );
  } catch (error: any) {
    console.error("Wix query failed:", error);
    return (
      <main className="p-8 text-[crimson]">
        <h2>Failed to load portfolio items</h2>
        <p>{error?.message || "Check collection permissions or collection ID."}</p>
      </main>
    );
  }
}