"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      router.push(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-bold text-ink mb-1">Login</h1>
      <p className="text-sm text-slate mb-8">
        Not a user?{" "}
        <Link href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-violet font-semibold">
          Sign up
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Type Password"
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
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </AuthLayout>
  );
}