"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSavedJobs } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import JobCard from "@/components/JobCard";

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

export default function SavedJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    // Not logged in -- send to login and bring them straight back here,
    // same pattern as the Apply button on the job detail page.
    if (!isLoggedIn()) {
      router.push(`/login?next=${encodeURIComponent("/saved")}`);
      return;
    }
    getSavedJobs()
      .then(setJobs)
      .catch((err) => {
        if (err.message === "LOGIN_REQUIRED") {
          router.push(`/login?next=${encodeURIComponent("/saved")}`);
          return;
        }
        setError("Could not load your saved jobs right now.");
        setJobs([]);
      });
  }, [router]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <p className="font-mono text-xs tracking-[0.2em] text-violet mb-2 uppercase">Saved for later</p>
      <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">Your saved jobs</h1>
      <p className="text-slate mb-8">
        Jobs you've bookmarked to come back to. Tap the bookmark icon on any listing to save or remove it.
      </p>

      {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

      {jobs === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}

      {jobs !== null && jobs.length === 0 && !error && (
        <div className="border border-dashed border-line rounded-xl p-10 text-center">
          <p className="text-slate">You haven't saved any jobs yet.</p>
          <a href="/jobs" className="inline-block mt-3 text-violet font-medium hover:underline">
            Browse jobs →
          </a>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
