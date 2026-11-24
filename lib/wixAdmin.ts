// lib/wixAdmin.ts
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import { orders } from "@wix/ecom";
import { members } from "@wix/members";

if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
  console.warn("Missing WIX_API_KEY or WIX_SITE_ID in environment variables.");
}

export const wixAdminClient = createClient({
  modules: { items, orders , members},
  auth: ApiKeyStrategy({
    apiKey: process.env.WIX_API_KEY!,
    siteId: process.env.WIX_SITE_ID!,
  }),
});