"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { getJobs, getFacets } from "@/lib/api";
import JobCard from "@/components/JobCard";
import JobFilters from "@/components/JobFilters";
import ChatAssistant from "@/components/ChatAssistant";
import HeroIllustration from "@/components/HeroIllustration";

const PAGE_SIZE = 24;
// Only the first page is ever fetched on the homepage strip now --
// "Load more roles" takes the user to the full /jobs page instead of
// fetching further pages inline here.

const PLATFORMS = ["LinkedIn", "Naukri", "Indeed", "Internshala"];

const STEPS = [
  {
    n: "01",
    title: "Browse, one feed",
    body: "Every role from four platforms, deduplicated and tagged — filter by platform, skill, or location.",
  },
  {
    n: "02",
    title: "Match your resume",
    body: "Upload once. AI scores every open role against your actual skills and surfaces the ones worth your time.",
  },
  {
    n: "03",
    title: "Apply with an edge",
    body: "Ask the AI assistant if you're a fit, what's missing, and how to prepare — before you apply.",
  },
];

const FEATURES = [
  {
    title: "Multi-Platform Aggregation",
    body: "Every role from LinkedIn, Naukri, Indeed and Internshala, deduplicated into one feed — no more checking four tabs.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    title: "AI-Based Tagging",
    body: "Each listing is read by AI and broken down into skills, role category and experience level, so filtering actually works.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
      </svg>
    ),
  },
  {
    title: "Resume Matching",
    body: "Upload your resume once. We score every open role against your actual skills and surface the ones worth your time.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    title: "AI Job Assistant",
    body: "Ask a listing directly: am I suitable, what's missing, how do I prepare. Answers grounded in that job's own description.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
      </svg>
    ),
  },
];

const FAQS = [
  {
    q: "How is ProjectBoard different from checking each job site myself?",
    a: "You'd be re-reading the same listings across four separate sites and judging fit yourself. ProjectBoard merges LinkedIn, Naukri, Indeed and Internshala into one feed, removes duplicates, tags every role by skill and experience with AI, then scores it against your resume — so the sorting is already done before you open a listing.",
  },
  {
    q: "Is there a cost to use ProjectBoard?",
    a: "Browsing, filtering and applying to jobs is free. The AI features — resume matching and the job assistant — run on your own Gemini API key, so nothing is charged or stored on our servers.",
  },
  {
    q: "How are duplicate listings handled?",
    a: "The same internship often gets posted on more than one platform. ProjectBoard hashes and compares listings during ingestion so you see each role once, tagged with where it originally appeared.",
  },
  {
    q: "How does the AI-powered matching work?",
    a: "Upload your resume once and it's scored against every open role using the skills, category and experience level AI has already tagged on each listing — the strongest matches surface first.",
  },
  {
    q: "Who can use ProjectBoard?",
    a: "Anyone job hunting across LinkedIn, Naukri, Indeed or Internshala. Browsing is open to everyone — you only need an account when you're ready to apply.",
  },
];

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function JobCardSkeleton() {
  return (
    <div className="border border-line rounded-xl p-4 sm:p-5 bg-white animate-pulse h-full">
      <div className="h-2.5 w-20 bg-surface rounded mb-3" />
      <div className="h-4 w-4/5 bg-surface rounded mb-2" />
      <div className="h-4 w-3/5 bg-surface rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-5 w-14 bg-surface rounded-full" />
        <div className="h-5 w-16 bg-surface rounded-full" />
        <div className="h-5 w-12 bg-surface rounded-full" />
      </div>
    </div>
  );
}

// Card width used by the horizontal scroller (matches the w-[...] classes
// on each slide below). Kept as a constant so the arrow-scroll distance
// and the slide width can never drift out of sync.
const CARD_WIDTH = 300;
const CARD_GAP = 16;

export default function HomePage() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [facets, setFacets] = useState({ sources: [], tags: [] });

  const scrollerRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Facets (dropdown options) are fetched once from a lightweight endpoint --
  // not derived from the full job list, which would mean loading 56k+ rows
  // just to build two <select> menus.
  useEffect(() => {
    getFacets()
      .then(setFacets)
      .catch((err) => console.error("Failed to load facets:", err));
  }, []);

  // Debounce the role search so a fetch doesn't fire on every keystroke --
  // waits for a short pause in typing before it updates debouncedQ, which
  // is what the fetch effect below actually depends on.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(id);
  }, [q]);

  // Fetches just the first page whenever filters change (search/source/tag).
  // This strip is a preview only -- "Load more roles" below sends the user
  // to the full /jobs page instead of fetching further pages here.
  useEffect(() => {
    setLoading(true);
    setLoadError("");
    getJobs({ q: debouncedQ, source, tag, limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        setJobs(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        console.error("Failed to load jobs:", err);
        setLoadError(
          "Could not reach the backend. Check that the API is running and NEXT_PUBLIC_API_URL is correct."
        );
      })
      .finally(() => setLoading(false));
  }, [debouncedQ, source, tag]);

  // Reset scroll position to the start whenever the filtered job list changes.
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTo({ left: 0 });
    }
  }, [debouncedQ, source, tag]);

  // Builds the /jobs link, carrying over whatever search term/platform/role
  // filter is already active here so the user doesn't lose context when
  // they leave the homepage preview strip for the full listing page.
  const browseAllHref = (() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (source) params.set("source", source);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  })();

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [jobs, updateScrollState]);

  function handleScroll() {
    updateScrollState();
  }

  function scrollByDirection(direction) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * (CARD_WIDTH + CARD_GAP) * 2, behavior: "smooth" });
  }

  return (
    <div>
      {/* HERO — soft gray gradient panel, left-aligned copy, line-art
          illustration on the right, curved bottom edge into the page. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F4F3F6] to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-24 sm:pb-28">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-6 items-center">
            <div className="text-center lg:text-left">
              <p className="font-mono text-xs tracking-[0.2em] text-violet font-semibold mb-3 uppercase">
                AI job aggregator
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] font-medium leading-[1.15] text-ink">
                Find the right job.<br/>
                <span className="text-violet">Build the right career.</span>
              </h1>
              <p className="text-slate mt-6 max-w-md mx-auto lg:mx-0 text-base sm:text-lg leading-relaxed">
               Discover relevant opportunities from LinkedIn, Naukri, Indeed, and Internshala in one place. Upload your resume, get personalized job recommendations, and chat with AI to understand your career fit.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-stretch justify-center lg:justify-start gap-3 mt-9">
                <a
                  href="#jobs"
                  className="w-full sm:w-auto text-center bg-violet text-white px-7 py-3.5 rounded-full font-medium shadow-lg shadow-violet/20 hover:bg-violet/90 hover:shadow-violet/30 focus-visible:bg-violet/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 active:scale-[0.98] transition-all"
                >
                  Explore jobs
                </a>
                <a
                  href="/resume"
                  className="w-full sm:w-auto text-center border border-line bg-white px-7 py-3.5 rounded-full font-medium hover:border-violet hover:text-violet focus-visible:border-violet focus-visible:text-violet focus-visible:outline-none active:scale-[0.98] transition-all"
                >
                  Match my resume
                </a>
              </div>

              <p className="font-mono text-xs text-slate mt-8">
                {loading
                  ? "sifting through listings…"
                  : `${total.toLocaleString()} roles sifted from ${PLATFORMS.join(", ")}`}
              </p>
            </div>

            <div className="hidden lg:block">
              <HeroIllustration className="w-full h-auto max-w-lg mx-auto" />
            </div>
          </div>
        </div>

        {/* Curved divider into the rest of the page */}
        <svg
          aria-hidden
          className="absolute bottom-0 left-0 w-full h-10 sm:h-14 text-white"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
        >
          <path d="M0 60 C 360 0, 1080 0, 1440 60 L1440 60 L0 60 Z" fill="currentColor" />
        </svg>
      </section>

      {/* HOW IT WORKS — layered wavy gray background (two soft curved
          bands at different tints/opacity) instead of a flat slab, so the
          section reads as a distinct visual "beat" between the hero and
          the feature grid. Purely decorative (aria-hidden), sits behind
          the content via z-index. */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-[#F6F5F9] relative overflow-hidden">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full"
          viewBox="0 0 1440 560"
          preserveAspectRatio="none"
        >
          <path
            d="M0,130 C220,190 380,60 620,100 C860,140 1040,70 1440,140 L1440,560 L0,560 Z"
            fill="#ECE9F2"
          />
          <path
            d="M0,230 C260,180 460,300 720,240 C980,180 1180,270 1440,220 L1440,560 L0,560 Z"
            fill="#E2DEEC"
            opacity="0.75"
          />
        </svg>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 relative">
          <div className="text-center mb-12">
            <p className="font-mono text-xs tracking-[0.2em] text-violet font-semibold uppercase mb-3">
              How it works
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              From four job boards to one decision
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 relative">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-display font-bold text-violet text-sm bg-violetSoft w-9 h-9 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white">
                    {s.n}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="hidden sm:block flex-1 h-px bg-line" />
                  )}
                </div>
                <h3 className="font-display font-bold text-lg mb-1.5">{s.title}</h3>
                <p className="text-sm text-slate leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS — eyebrow label to match the rest of the page,
          plus per-card hover lift, a reveal accent bar, alternating
          violet/mint icon tints, and a faint numbered watermark so the
          four cards read as more than four identical white boxes. */}
      <section className="bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="font-mono text-xs tracking-[0.2em] text-violet font-semibold uppercase mb-3">
              Why ProjectBoard
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
              Built to cut through the noise
            </h2>
            <p className="text-slate max-w-lg mx-auto text-sm sm:text-base">
              Every feature exists to remove a manual step you'd otherwise repeat
              across four tabs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => {
              const isViolet = i % 2 === 0;
              return (
                <div
                  key={f.title}
                  className={`group relative bg-white border rounded-2xl p-6 overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5 transition-all duration-300 ${
                    isViolet
                      ? "border-line hover:border-violet/40"
                      : "border-line hover:border-mint/40"
                  }`}
                >
                  {/* accent bar, sweeps in on hover */}
                  <span
                    aria-hidden
                    className={`absolute top-0 left-0 right-0 h-1 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ${
                      isViolet ? "bg-violet" : "bg-mint"
                    }`}
                  />

                  {/* faint oversized index number, purely decorative */}
                  <span
                    aria-hidden
                    className="absolute -top-3 right-3 font-display font-bold text-6xl text-ink/[0.045] select-none"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div
                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 ${
                      isViolet ? "bg-violetSoft text-violet" : "bg-mint/10 text-mint"
                    }`}
                  >
                    <span className="w-5 h-5">{f.icon}</span>
                  </div>
                  <h3 className="relative font-display font-bold mb-2">{f.title}</h3>
                  <p className="relative text-sm text-slate leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* JOB BOARD — horizontally scrollable strip with prev/next arrows,
          showing a preview of the first page. "Load more roles" links to
          the full /jobs page (with sidebar filters) instead of fetching
          further pages inline here. */}
      <section id="jobs" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-violet font-semibold uppercase mb-3">
              Live listings
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              Browse open roles
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {!loading && (
              <p className="text-sm text-slate font-mono">
                {total.toLocaleString()} roles matched
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByDirection(-1)}
                disabled={!canScrollPrev}
                aria-label="Scroll to previous jobs"
                className="w-10 h-10 rounded-full border border-line bg-white flex items-center justify-center text-ink hover:border-violet hover:text-violet focus-visible:border-violet focus-visible:text-violet focus-visible:outline-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:text-ink"
              >
                <span className="w-4 h-4"><ArrowLeftIcon /></span>
              </button>
              <button
                type="button"
                onClick={() => scrollByDirection(1)}
                disabled={!canScrollNext}
                aria-label="Scroll to next jobs"
                className="w-10 h-10 rounded-full border border-line bg-white flex items-center justify-center text-ink hover:border-violet hover:text-violet focus-visible:border-violet focus-visible:text-violet focus-visible:outline-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:text-ink"
              >
                <span className="w-4 h-4"><ArrowRightIcon /></span>
              </button>
            </div>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 border border-violet/30 bg-violetSoft text-ink text-sm rounded-md px-4 py-3 font-mono">
            {loadError}
          </div>
        )}

        <div className="bg-white p-4 sm:p-6">
          <JobFilters
            q={q}
            setQ={setQ}
            source={source}
            setSource={setSource}
            tag={tag}
            setTag={setTag}
            availableSources={facets.sources}
            availableTags={facets.tags}
          />

          {loading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[260px] sm:w-[300px] shrink-0">
                  <JobCardSkeleton />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 && !loadError ? (
            <p className="text-slate text-sm py-8 text-center">
              No jobs match these filters yet.
            </p>
          ) : (
            <>
              <div
                ref={scrollerRef}
                onScroll={handleScroll}
                className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-1 px-1 items-stretch"
                style={{ scrollbarWidth: "none" }}
              >
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="w-[260px] sm:w-[300px] shrink-0 snap-start"
                  >
                    <JobCard job={job} />
                  </div>
                ))}
              </div>

              <div className="text-center mt-6">
                <Link
                  href={browseAllHref}
                  className="text-sm text-violet font-medium hover:underline"
                >
                  Load more roles ({total.toLocaleString()} total) →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* FAQ + Final CTA — side by side on larger screens so the page
          closes with two focal points at once instead of one long
          scroll; stacks to a single column on mobile where two-up
          would feel cramped. */}
      <section className="border-t border-line bg-gradient-to-b from-surface to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid gap-12 lg:grid-cols-2 lg:items-stretch">
          <div id="faq" className="scroll-mt-20">
            <div className="text-center lg:text-left mb-12">
              <p className="font-mono text-xs tracking-[0.2em] text-violet font-semibold uppercase mb-3">
                You want to know
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-4">
              {FAQS.map((item, i) => (
                <details
                  key={item.q}
                  open={i === 0}
                  className="group relative rounded-2xl bg-white shadow-sm shadow-ink/[0.03] overflow-hidden"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 bottom-0 w-1 bg-line group-open:bg-violet transition-colors"
                  />
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-ink pl-6 pr-5 sm:pr-6 py-5">
                    {item.q}
                    <span className="text-ink shrink-0 w-5 h-5 group-open:rotate-180 transition-transform">
                      <ChevronDownIcon />
                    </span>
                  </summary>
                  <p className="text-sm sm:text-base text-slate leading-relaxed pl-6 pr-6 sm:pr-10 pb-6">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <div className="lg:h-full">
            <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-violetSoft via-white to-surface px-6 sm:px-10 py-14 sm:py-16 text-center h-full flex flex-col justify-center">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(#D6CBF2 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                  WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 50% 30%, black, transparent)",
                  maskImage: "radial-gradient(ellipse 75% 70% at 50% 30%, black, transparent)",
                }}
              />
              <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-violet/20 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-mint/15 blur-3xl" />

              <div className="relative">
                <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                  Ready to find a role that actually fits?
                </h2>
                <p className="text-slate mb-8 max-w-lg mx-auto">
                  Upload your resume once and let the AI do the matching across every
                  platform we track.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="/resume"
                    className="w-full sm:w-auto text-center bg-violet text-white px-7 py-3.5 rounded-full font-medium shadow-lg shadow-violet/20 hover:bg-violet/90 focus-visible:bg-violet/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 active:scale-[0.98] transition-all"
                  >
                    Match my resume
                  </a>
                  <a
                    href="#jobs"
                    className="w-full sm:w-auto text-center border border-line bg-white px-7 py-3.5 rounded-full font-medium hover:border-violet hover:text-violet focus-visible:border-violet focus-visible:text-violet focus-visible:outline-none active:scale-[0.98] transition-all"
                  >
                    Browse jobs first
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ChatAssistant />
    </div>
  );
}