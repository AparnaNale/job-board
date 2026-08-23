"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import { signup } from "@/lib/auth";

function SignupForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup({ fullName, email, password });
      // Account created -- deliberately NOT auto-logging in. Show a
      // success state with an explicit "Login" action instead.
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="w-9 h-9 rounded-full bg-violetSoft text-violet flex items-center justify-center mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-ink mb-2">Account created</h1>
        <p className="text-sm text-slate mb-8 leading-relaxed">
          Your account is ready. Log in with your email and password to
          continue.
        </p>
        <Link
          href={loginHref}
          className="block w-full text-center bg-violet text-white font-semibold rounded-lg py-3 hover:bg-violet/90 transition-colors"
        >
          Go to Login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-bold text-ink mb-1">Sign up</h1>
      <p className="text-sm text-slate mb-8">
        Already a user?{" "}
        <Link href={loginHref} className="text-violet font-semibold">
          Login
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Full name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Type your full name"
            className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet/40 focus:border-violet"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Type your email"
            className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet/40 focus:border-violet"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full border border-line rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet/40 focus:border-violet"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate text-sm"
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet text-white font-semibold rounded-lg py-3 hover:bg-violet/90 transition-colors disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}