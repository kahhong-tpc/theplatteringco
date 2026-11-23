// lib/wixClient.ts
import { createClient, OAuthStrategy } from "@wix/sdk";
import { products, collections } from "@wix/stores";
import { items } from "@wix/data";
import { currentCart, cartV2 } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { members } from "@wix/members";
import Cookies from "js-cookie";

const WIX_TOKENS_COOKIE = "wix_session_tokens";

export function getSavedTokens() {
  if (typeof window === "undefined") return undefined;
  try {
    const saved = Cookies.get(WIX_TOKENS_COOKIE);
    return saved ? JSON.parse(saved) : undefined;
  } catch {
    return undefined;
  }
}

export const wixClient = createClient({
  modules: {
    products,
    collections,
    items,
    currentCart,
    cartV2,
    redirects,
    members,
  },
  auth: OAuthStrategy({
    clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
    tokens: getSavedTokens(),
  }),
});

export function persistTokens(tokens: any) {
  wixClient.auth.setTokens(tokens);
  if (typeof window !== "undefined") {
    Cookies.set(WIX_TOKENS_COOKIE, JSON.stringify(tokens), {
      expires: 30,
      sameSite: "lax",
    });
  }
}

export function clearPersistedTokens() {
  if (typeof window !== "undefined") {
    Cookies.remove(WIX_TOKENS_COOKIE);
  }
}