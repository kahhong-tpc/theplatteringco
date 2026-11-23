// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginMember, registerMember, sendPasswordReset, loginWithGoogle } from "@/lib/wix-auth";
import { useAuth } from "@/context/AuthContext";


export default function LoginPage() {
  const router = useRouter();
  const { refreshMember } = useAuth();

  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordValid = password.length >= 8 && /\d/.test(password);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (mode === "register" && !isPasswordValid) {
        setMessage({
        type: "error",
        text: "Password must be at least 8 characters long and include at least 1 number.",
        });
        return;
    }

    setSubmitting(true);

    try {
      if (mode === "login") {
        await loginMember(email, password);
        await refreshMember();
        router.push("/account");
      } else if (mode === "register") {
        const res = await registerMember({ email, password, firstName, lastName, phone });
        if (res.status === "SUCCESS") {
          await refreshMember();
          router.push("/account");
        } else {
          setMessage({
            type: "success",
            text: "Account created! Please check your email to verify your account before logging in.",
          });
          setMode("login");
        }
      } else {
        await sendPasswordReset(email, `${window.location.origin}/login`);
        setMessage({
          type: "success",
          text: "Password reset link sent! Check your inbox.",
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Authentication failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Mode Switcher */}
        {mode !== "reset" && (
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage(null);
              }}
              className={`cursor-pointer rounded-md py-2 transition ${
                mode === "login" ? "bg-white font-semibold shadow-sm" : "text-gray-500"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setMessage(null);
              }}
              className={`cursor-pointer rounded-md py-2 transition ${
                mode === "register" ? "bg-white font-semibold shadow-sm" : "text-gray-500"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900">
          {mode === "login"
            ? "Welcome Back"
            : mode === "register"
            ? "Create Your Account"
            : "Reset Password"}
        </h1>

        {message && (
          <div
            className={`mt-4 rounded-lg p-3 text-xs font-medium ${
              message.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {mode !== "reset" && (
            <>
                <button
                type="button"
                onClick={() => loginWithGoogle()}
                className="mt-5 flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
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
                Continue with Google
                </button>

                <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
                <div className="h-px flex-1 bg-gray-200" />
                <span>OR</span>
                <div className="h-px flex-1 bg-gray-200" />
                </div>
            </>
            )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+65 9123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {mode !== "reset" && (
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-700">Password *</label>
                    {mode === "login" && (
                    <button
                        type="button"
                        onClick={() => setMode("reset")}
                        className="cursor-pointer text-xs text-gray-500 underline hover:text-black"
                    >
                        Forgot password?
                    </button>
                    )}
                </div>
                <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <p
                    className={`mt-1 text-[11px] ${
                    password.length === 0
                        ? "text-gray-400"
                        : isPasswordValid
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                >
                    {isPasswordValid
                    ? "✓ Meets password requirements"
                    : "Use at least 8 characters including 1 number"}
                </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (mode === "register" && !isPasswordValid)}
            className="w-full cursor-pointer rounded-lg bg-black py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:bg-gray-300"
          >
            {submitting
              ? "Please wait..."
              : mode === "login"
              ? "Sign In"
              : mode === "register"
              ? "Create Account"
              : "Send Reset Link"}
          </button>

          {mode === "reset" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full cursor-pointer text-center text-xs text-gray-500 underline"
            >
              ← Back to Sign In
            </button>
          )}
        </form>
      </div>
    </main>
  );
}