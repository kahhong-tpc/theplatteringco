// app/auth/callback/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { completeGoogleLoginCallback } from "@/lib/wix-auth";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refreshMember } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    completeGoogleLoginCallback()
      .then(async () => {
        await refreshMember();
        router.replace("/account");
      })
      .catch((err) => {
        setError(err.message || "Google sign-in failed.");
      });
  }, [refreshMember, router]);

  if (error) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-6 py-20 text-center">
        <p className="text-sm font-medium text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="cursor-pointer rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white"
        >
          Back to Sign In
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20 text-center text-sm text-gray-500">
      Completing sign-in with Google...
    </main>
  );
}