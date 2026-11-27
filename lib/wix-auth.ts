// lib/wix-auth.ts
import { wixClient, persistTokens, clearPersistedTokens, getSavedTokens } from "@/lib/wixClient";

export interface MemberProfileData {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  nickname: string;
  company?: string;
  defaultAddress?: {
    addressLine1: string;
    unitNumber: string;
    postalCode: string;
  };
}

function normalizeToE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip spaces, dashes, and parentheses
  const cleaned = trimmed.replace(/[\s\-()]/g, "");

  // Valid international E.164: '+' followed by 7 to 15 digits (country code cannot start with 0)
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return cleaned;
  }

  // Convenience fallback for bare 8-digit Singapore numbers (starting with 3, 6, 8, or 9)
  if (/^[3689]\d{7}$/.test(cleaned)) {
    return `+65${cleaned}`;
  }

  throw new Error(
    "Please include a '+' and country code for your phone number (e.g. +65 8240 9532)."
  );
}

/**
 * 1. Register a new member with custom UI (Email + Password + Profile Attributes)
 */
export async function registerMember(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const response = await wixClient.auth.register({
    email: params.email.trim(),
    password: params.password,
    profile: {
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      nickname: `${params.firstName.trim()} ${params.lastName.trim()}`.trim(),
      phones: params.phone ? [params.phone.trim()] : [],
    },
  });

  if (response.loginState === "SUCCESS" && response.data?.sessionToken) {
    const tokens = await wixClient.auth.getMemberTokensForDirectLogin(
      response.data.sessionToken
    );
    persistTokens(tokens);
    return { status: "SUCCESS" as const };
  }

  return {
    status: response.loginState as "EMAIL_VERIFICATION_REQUIRED" | "OWNER_APPROVAL_REQUIRED",
  };
}

/**
 * 2. Log in an existing member with Email + Password
 */
export async function loginMember(email: string, password: string) {
  const response = await wixClient.auth.login({
    email: email.trim(),
    password,
  });

  if (response.loginState === "SUCCESS" && response.data?.sessionToken) {
    const tokens = await wixClient.auth.getMemberTokensForDirectLogin(
      response.data.sessionToken
    );
    persistTokens(tokens);
    return { status: "SUCCESS" as const };
  }

  throw new Error(
    response.loginState === "FAILURE"
      ? "Invalid email or password."
      : `Login requires additional action: ${response.loginState}`
  );
}

/**
 * 3. Log out and replace member tokens with fresh anonymous visitor tokens
 */
export async function logoutMember() {
  clearPersistedTokens();
  const visitorTokens = await wixClient.auth.generateVisitorTokens();
  wixClient.auth.setTokens(visitorTokens);
}

/**
 * 4. Fetch the currently logged-in Member's full profile & attributes
 */
function decodeTokenFallback(accessTokenValue?: string): MemberProfileData | null {
  if (!accessTokenValue) return null;
  try {
    const payload = JSON.parse(atob(accessTokenValue.split(".")[1]));
    const data = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;
    if (!data?.siteMemberId) return null;

    return {
      _id: data.siteMemberId,
      email: "",
      firstName: data.siteMemberId === data.siteOwnerId ? "Site Owner" : "Member",
      lastName: "",
      phone: "",
      nickname: data.siteMemberId === data.siteOwnerId ? "Site Owner" : "Member",
    };
  } catch {
    return null;
  }
}

export async function fetchCurrentMemberProfile(): Promise<MemberProfileData | null> {
  const savedTokens = getSavedTokens();
  if (savedTokens) {
    wixClient.auth.setTokens(savedTokens);
  }

  if (!wixClient.auth.loggedIn()) return null;

  try {
    let res: any;
    try {
      res = await wixClient.members.getCurrentMember({ fieldsets: ["FULL"] });
    } catch {
      res = await wixClient.members.getCurrentMember();
    }

    const member = res?.member || res;
    if (member?._id) {
      const primaryAddress = member.contact?.addresses?.[0];
      return {
        _id: member._id,
        email: member.loginEmail || "",
        firstName: member.contact?.firstName || member.profile?.nickname || "",
        lastName: member.contact?.lastName || "",
        phone: member.contact?.phones?.[0] || "",
        nickname: member.profile?.nickname || "",
        company: member.contact?.company || "",
        defaultAddress: primaryAddress
          ? {
              addressLine1: primaryAddress.streetAddress?.name || "",
              unitNumber: primaryAddress.streetAddress?.number || "",
              postalCode: primaryAddress.postalCode || "",
            }
          : undefined,
      };
    }
  } catch (err) {
    console.warn("getCurrentMember failed, using token fallback:", err);
  }

  // Fallback if logged in as Site Owner (who doesn't have a Site Member CRM record)
  return decodeTokenFallback(savedTokens?.accessToken?.value);
}

/**
 * 5. Update Member Profile Attributes (Name, Phone, Company, Default SG Address)
 */
/**
 * 5. Update Member Profile Attributes (Name, Phone, Company, Default SG Address)
 */
export async function updateMemberProfile(
  memberId: string,
  updates: {
    firstName: string;
    lastName: string;
    phone: string;
    company?: string;
    defaultAddress?: {
      addressLine1: string;
      unitNumber: string;
      postalCode: string;
    };
  }
) {
  const formattedPhone = normalizeToE164(updates.phone || "");

  const updated = await wixClient.members.updateMember(memberId, {
    contact: {
      firstName: updates.firstName.trim(),
      lastName: updates.lastName.trim(),
      phones: formattedPhone ? [formattedPhone] : [],
      company: updates.company?.trim() || "",
      addresses: updates.defaultAddress?.addressLine1
        ? [
            {
              streetAddress: {
                name: updates.defaultAddress.addressLine1.trim(),
                number: updates.defaultAddress.unitNumber.trim(),
              },
              postalCode: updates.defaultAddress.postalCode.trim(),
              country: "SG",
            },
          ]
        : [],
    },
    profile: {
      nickname: `${updates.firstName.trim()} ${updates.lastName.trim()}`.trim(),
    },
  });

  return updated;
}

/**
 * 6. Send Password Reset Email
 */
export async function sendPasswordReset(email: string, redirectUrl: string) {
  await wixClient.auth.sendPasswordResetEmail(email.trim(), redirectUrl);
}

const OAUTH_STATE_KEY = "wix_oauth_login_state";

/**
 * 7. Redirect user to Wix's hosted Google OAuth sign-in screen
 */
export async function loginWithGoogle() {
  const redirectUri = `${window.location.origin}/auth/callback`;

  const loginRequestData = wixClient.auth.generateOAuthData(redirectUri);
  sessionStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(loginRequestData));

  const { authUrl } = await wixClient.auth.getAuthUrl(loginRequestData);
  window.location.href = authUrl;
}

/**
 * 8. Exchange the returned OAuth code for member tokens on /auth/callback
 */
export async function completeGoogleLoginCallback() {
  const rawState = sessionStorage.getItem(OAUTH_STATE_KEY);
  if (!rawState) {
    throw new Error("Missing OAuth session state. Please try signing in again.");
  }

  const loginRequestData = JSON.parse(rawState);

  // Wix returns code & state in either ?query or #hash fragment
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const code = searchParams.get("code") || hashParams.get("code");
  const state = searchParams.get("state") || hashParams.get("state");

  if (!code || !state) {
    const errorDesc =
      searchParams.get("error_description") ||
      hashParams.get("error_description") ||
      searchParams.get("error") ||
      hashParams.get("error");
    throw new Error(errorDesc || "No authorization code returned from Wix.");
  }

  const tokens = await wixClient.auth.getMemberTokens(
    code,
    state,
    loginRequestData
  );

  sessionStorage.removeItem(OAUTH_STATE_KEY);
  persistTokens(tokens);
}

export async function loginWithWixHostedAuth(redirectAfter = "/account") {
  const redirectUri = `${window.location.origin}/auth/callback`;

  const loginRequestData = wixClient.auth.generateOAuthData(
    redirectUri,
    `${window.location.origin}${redirectAfter}`
  );
  sessionStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(loginRequestData));

  const { authUrl } = await wixClient.auth.getAuthUrl(loginRequestData, {
    prompt: "login",
  });
  window.location.href = authUrl;
}