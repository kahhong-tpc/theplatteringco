import { createClient, OAuthStrategy } from "@wix/sdk";
import { products, collections } from "@wix/stores";
import { items } from "@wix/data";
import { cartV2 } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import Cookies from "js-cookie";

const rawTokens =
  typeof window !== "undefined" ? Cookies.get("wixSession") : null;
const tokens = rawTokens ? JSON.parse(rawTokens) : undefined;

export const wixClient = createClient({
  modules: {
    products,
    collections,
    items,
    cartV2,
    redirects,
  },
  auth: OAuthStrategy({
    clientId: process.env.NEXT_PUBLIC_WIX_CLIENT_ID!,
    tokens,
  }),
});