"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, logout } from "@/lib/auth";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.6-4 5-6 7.5-6s5.9 2 7.5 6" />
    </svg>
  );
}

/**
 * Shows a single account icon in the header. Logged out, it opens a small
 * dropdown with Login/Sign up. Logged in, the dropdown shows the user's
 * name and a Logout action. Reads localStorage, so this must be a client
 * component -- listens for the "auth-changed" event (fired by lib/auth.js
 * on login/signup/logout) so it updates instantly in the same tab, not
 * just on next page load.
 */
export default function NavAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getStoredUser());
    const onChange = () => setUser(getStoredUser());
    window.addEventListener("auth-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("auth-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const initials = user
    ? (user.full_name || user.email || "?").trim().charAt(0).toUpperCase()
    : null;

  return (
    <div className="relative group">
      <button
        type="button"
        aria-label={user ? "Account menu" : "Log in or sign up"}
        className="w-10 h-10 rounded-full border border-line bg-white flex items-center justify-center text-ink hover:border-violet hover:text-violet transition-colors overflow-hidden"
      >
        {user ? (
          <span className="font-display font-bold text-sm text-violet">{initials}</span>
        ) : (
          <UserIcon />
        )}
      </button>

      <div className="absolute right-0 top-full pt-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-150 z-50">
        <div className="min-w-[180px] bg-white border border-line rounded-xl shadow-lg shadow-ink/5 p-1.5">
          {user ? (
            <>
              <p className="px-3 py-2 text-sm text-slate truncate">
                {user.full_name || user.email}
              </p>
              <a
                href="/saved"
                className="block px-3 py-2 rounded-lg text-sm text-ink hover:bg-violetSoft hover:text-violet transition-colors"
              >
                Saved jobs
              </a>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-ink hover:bg-violetSoft hover:text-violet transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="block px-3 py-2 rounded-lg text-sm text-ink hover:bg-violetSoft hover:text-violet transition-colors"
              >
                Login
              </a>
              <a
                href="/signup"
                className="block px-3 py-2 rounded-lg text-sm text-ink hover:bg-violetSoft hover:text-violet transition-colors"
              >
                Sign up
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
