"use client";

import { useState } from "react";
import Image from "next/image";
import NavAuth from "@/components/NavAuth";

const NAV_GROUPS = [
  {
    label: "Explore",
    items: [
      { href: "/jobs", label: "Browse jobs" },
      { href: "/#jobs", label: "Live listings" },
      { href: "/resume", label: "Match my resume" },
      { href: "/saved", label: "Saved Jobs" },
    ],
  },
  {
    label: "About",
    items: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  );
}

// Simple hover-triggered dropdown built with pure CSS (group/group-hover),
// so it doesn't need any client-side state -- but the component itself is
// still a client component because NavAuth (rendered lower in the header)
// reads localStorage.
function NavDropdown({ label, items }) {
  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-1 font-medium text-ink hover:text-violet focus-visible:text-violet focus-visible:outline-none transition-colors py-2"
      >
        {label}
        <ChevronIcon />
      </button>
      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-150 z-50">
        <div className="min-w-[180px] bg-white border border-line rounded-xl shadow-lg shadow-ink/5 p-1.5">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-ink hover:bg-violetSoft hover:text-violet transition-colors whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-md supports-[backdrop-filter]:bg-paper/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <a href="/" className="shrink-0 flex items-center gap-2" onClick={() => setMobileOpen(false)} >
          <Image src="/logo-1.png" alt="JobBoard logo" width={40} height={40} priority  />
          <span className="text-violet text-2xl font-bold">JobBoard</span>
        </a>

        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <NavDropdown label="Explore" items={NAV_GROUPS[0].items} />
          <NavDropdown label="About" items={NAV_GROUPS[1].items} />
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="/jobs"
            aria-label="Browse all jobs"
            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full text-ink hover:text-violet hover:bg-violetSoft focus-visible:text-violet focus-visible:bg-violetSoft focus-visible:outline-none transition-colors"
          >
            <GridIcon />
          </a>
          <NavAuth />

          {/* Mobile menu toggle — the dropdown nav above is desktop-only,
              so small screens need an explicit way to reach Explore/About. */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="sm:hidden w-10 h-10 rounded-full border border-line bg-white flex items-center justify-center text-ink hover:border-violet hover:text-violet focus-visible:border-violet focus-visible:text-violet focus-visible:outline-none transition-colors"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <nav className="sm:hidden border-t border-line bg-paper px-4 pb-4 pt-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="py-2">
              <p className="font-mono text-[11px] tracking-[0.2em] text-slate uppercase mb-1.5">
                {group.label}
              </p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-2 text-sm font-medium text-ink hover:text-violet focus-visible:text-violet focus-visible:outline-none transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}