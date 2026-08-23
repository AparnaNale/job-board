"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJob, applyToJob, getApplyStatus } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { getStoredResumeProfileId } from "@/lib/resumeProfile";
import ChatAssistant from "@/components/ChatAssistant";
import SaveButton from "@/components/SaveButton";

export default function JobDetailPage({ params }) {
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [applyState, setApplyState] = useState({ loading: false, applied: false, error: "" });

  useEffect(() => {
    getJob(params.id).then(setJob);
  }, [params.id]);

  // If the user is already logged in and already applied earlier, show
  // that on load instead of letting them click "Apply" again from scratch.
  useEffect(() => {
    if (!isLoggedIn()) return;
    getApplyStatus(params.id).then((status) => {
      if (status?.already_applied) {
        setApplyState({ loading: false, applied: true, error: "" });
      }
    });
  }, [params.id]);

  async function handleApply() {
    if (!isLoggedIn()) {
      // Not logged in -- send to login, and bring them straight back to
      // this job afterwards via ?next=.
      router.push(`/login?next=${encodeURIComponent(`/jobs/${params.id}`)}`);
      return;
    }

    setApplyState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const result = await applyToJob(params.id);
      setApplyState({ loading: false, applied: true, error: "" });
      if (result.apply_link) {
        window.open(result.apply_link, "_blank", "noreferrer");
      }
    } catch (err) {
      if (err.message === "LOGIN_REQUIRED") {
        router.push(`/login?next=${encodeURIComponent(`/jobs/${params.id}`)}`);
        return;
      }
      setApplyState({ loading: false, applied: false, error: "Could not apply right now. Try again." });
    }
  }

  if (!job) return <p className="text-slate font-mono text-sm max-w-3xl mx-auto px-4 sm:px-6 py-14">loading…</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <p className="font-mono text-xs tracking-[0.2em] text-violet mb-2 uppercase">
        {job.source_platform?.replace(/_/g, " ")}
      </p>
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">{job.title}</h1>
        <SaveButton jobId={job.id} className="shrink-0" />
      </div>
      <p className="text-slate mt-1">
        {job.company} · {job.location}
      </p>

      <div className="flex flex-wrap gap-2 my-5">
        {(job.tags || []).map((t) => (
          <span key={t} className="text-xs px-2 py-1 rounded-full bg-surface text-ink/70">
            {t}
          </span>
        ))}
      </div>

      <div className="bg-white border border-line rounded-xl p-6 whitespace-pre-line text-sm leading-relaxed">
        {job.description}
      </div>

      {job.apply_link && (
        <div className="mt-5">
          <button
            onClick={handleApply}
            disabled={applyState.loading || applyState.applied}
            className="inline-block bg-violet text-white px-6 py-3 rounded-full font-medium hover:bg-violet/90 transition-colors disabled:opacity-70"
          >
            {applyState.applied
              ? "Applied ✓"
              : applyState.loading
              ? "Applying…"
              : `Apply on ${job.source_platform?.replace(/_/g, " ")}`}
          </button>

          {!isLoggedIn() && !applyState.applied && (
            <p className="text-xs text-slate mt-2">
              You'll need to log in first — we'll bring you right back here.
            </p>
          )}
          {applyState.error && (
            <p className="text-xs text-red-600 mt-2">{applyState.error}</p>
          )}
        </div>
      )}

      <ChatAssistant jobId={job.id} resumeProfileId={getStoredResumeProfileId()} />
    </div>
  );
}