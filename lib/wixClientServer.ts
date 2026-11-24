// lib/wixClientServer.ts
import { createClient, OAuthStrategy } from "@wix/sdk";
import { products, collections } from "@wix/stores";
import { items } from "@wix/data";
import { cookies } from "next/headers";
import { members } from "@wix/members";

export async function getServerWixClient() {
  const cookieStore = await cookies();
  const rawTokens = cookieStore.get("wix_session_tokens")?.value;
  let parsedTokens;

  if (rawTokens) {
    try {
      parsedTokens = JSON.parse(rawTokens);
    } catch {
      parsedTokens = undefined;
    }
  }

  const client = createClient({
    modules: { products, collections, items, members },
    auth: OAuthStrategy({
      clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
      tokens: parsedTokens,
    }),
  });

  // Always generate visitor tokens if no valid cookie tokens exist on the server
  if (!parsedTokens?.accessToken?.value) {
    const visitorTokens = await client.auth.generateVisitorTokens();
    client.auth.setTokens(visitorTokens);
  }

  return client;
}