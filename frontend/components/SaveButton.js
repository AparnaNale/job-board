"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveJob, unsaveJob, getSaveStatus } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

function BookmarkIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

// Self-contained save/unsave toggle. Used both inside JobCard (which is
// itself a <Link>, so clicks here must not bubble into navigation) and
// standalone on the job detail page.
export default function SaveButton({ jobId, className = "" }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    let cancelled = false;
    getSaveStatus(jobId).then((status) => {
      if (!cancelled && status?.saved) setSaved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function handleClick(e) {
    // JobCard wraps this in a <Link> -- stop the click from also
    // triggering navigation to the job detail page.
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn()) {
      router.push(`/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`);
      return;
    }

    const next = !saved;
    setSaved(next); // optimistic -- feels instant, and we roll back on failure
    setLoading(true);
    try {
      if (next) {
        await saveJob(jobId);
      } else {
        await unsaveJob(jobId);
      }
    } catch (err) {
      setSaved(!next);
      if (err.message === "LOGIN_REQUIRED") {
        router.push(`/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={saved ? "Remove from saved jobs" : "Save job for later"}
      aria-pressed={saved}
      title={saved ? "Saved" : "Save for later"}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/90 border border-line transition-colors disabled:opacity-60 ${
        saved ? "text-violet border-violet" : "text-slate hover:text-violet hover:border-violet"
      } ${className}`}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}
