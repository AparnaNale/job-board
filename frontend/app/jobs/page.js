"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getJobs, getFacets } from "@/lib/api";
import JobCard from "@/components/JobCard";
import JobsSidebar from "@/components/JobsSidebar";

const PAGE_SIZE = 24;

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

function JobsPageInner() {
  // Filters can arrive pre-set via query params, e.g. from the homepage's
  // "Load more roles" link, which carries over whatever platform/role
  // filter the user had already picked there.
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    source: searchParams.get("source") || "",
    tag: searchParams.get("tag") || "",
    location: searchParams.get("location") || "",
    experienceLevel: searchParams.get("experience_level") || "",
    q: searchParams.get("q") || "",
  });

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [facets, setFacets] = useState({ sources: [], tags: [], locations: [], experience_levels: [] });

  useEffect(() => {
    getFacets()
      .then(setFacets)
      .catch((err) => console.error("Failed to load facets:", err));
  }, []);

  // Fetches the first page whenever any filter changes -- always resets
  // to offset 0 instead of appending, since the result set itself changed.
  useEffect(() => {
    setLoading(true);
    setLoadError("");
    getJobs({ ...filters, limit: PAGE_SIZE, offset: 0 })
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
  }, [filters]);

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    getJobs({ ...filters, limit: PAGE_SIZE, offset: jobs.length })
      .then((data) => {
        setJobs((prev) => [...prev, ...data.items]);
        setTotal(data.total);
      })
      .catch((err) => console.error("Failed to load more jobs:", err))
      .finally(() => setLoadingMore(false));
  }, [filters, jobs.length, loadingMore]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-[0.2em] text-violet uppercase mb-2">
          All listings
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          Browse every open role
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <JobsSidebar
          filters={filters}
          setFilters={setFilters}
          facets={facets}
          resultCount={total}
        />

        <div className="flex-1 min-w-0">
          <label className="relative block mb-5">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              placeholder="Search roles — e.g. Frontend Developer"
              className="w-full border border-line rounded-full pl-10 pr-9 py-2.5 bg-white text-sm text-ink placeholder:text-slate/70 focus:outline-none focus:border-violet transition-colors"
            />
            {filters.q && (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, q: "" }))}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate hover:text-violet transition-colors text-xs"
              >
                ✕
              </button>
            )}
          </label>

          {loadError && (
            <div className="mb-6 border border-violet/30 bg-violetSoft text-ink text-sm rounded-md px-4 py-3 font-mono">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
              {Array.from({ length: 6 }).map((_, i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          ) : jobs.length === 0 && !loadError ? (
            <p className="text-slate text-sm py-16 text-center">
              No jobs match these filters yet.
            </p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
                {loadingMore &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <JobCardSkeleton key={`more-${i}`} />
                  ))}
              </div>

              {jobs.length < total && !loadingMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMore}
                    className="border border-line px-6 py-2.5 rounded-full text-sm font-medium hover:border-violet hover:text-violet transition-colors"
                  >
                    Load more roles ({jobs.length} of {total.toLocaleString()})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsPageInner />
    </Suspense>
  );
}
