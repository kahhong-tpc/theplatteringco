// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithGoogle, loginWithWixHostedAuth } from "@/lib/wix-auth";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();

  const [redirecting, setRedirecting] = useState<"google" | "email" | null>(
    null
  );
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Redirect to /account if already signed in
  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.replace("/account");
    }
  }, [loading, isLoggedIn, router]);

  const handleGoogleLogin = async () => {
    setMessage(null);
    setRedirecting("google");
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Google sign-in failed. Please try again.",
      });
      setRedirecting(null);
    }
  };

  const handleWixEmailAuth = async () => {
    setMessage(null);
    setRedirecting("email");
    try {
      await loginWithWixHostedAuth("/account");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Unable to open Wix login page. Please try again.",
      });
      setRedirecting(null);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Member Sign In</h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in or create a free member account to earn and track loyalty
          points on every catering order.
        </p>

        {message && (
          <div
            className={`mt-4 rounded-lg border p-3 text-xs font-medium ${
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={redirecting !== null}
            onClick={handleGoogleLogin}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            {redirecting === "google"
              ? "Redirecting to Google..."
              : "Continue with Google"}
          </button>

          <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
            <div className="h-px flex-1 bg-gray-200" />
            <span>OR</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            disabled={redirecting !== null}
            onClick={handleWixEmailAuth}
            className="w-full cursor-pointer rounded-lg bg-black py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {redirecting === "email"
              ? "Redirecting to Sign In..."
              : "Sign In or Create Account with Email"}
          </button>
        </div>
      </div>
    </main>
  );
}