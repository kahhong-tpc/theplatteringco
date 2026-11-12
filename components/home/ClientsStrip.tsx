import { clients } from "@/lib/data";
import { createClient, OAuthStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import PortfolioCarousel from "@/components/portfolio-carousel/page";

const client = createClient({
  modules: { items },
  auth: OAuthStrategy({
    clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
  }),
});

export default async function ClientsStrip() {
  const response = await client.items.query("PortfolioCarousel").find();

  return (
      <PortfolioCarousel items={response.items || []} />
  );
}
