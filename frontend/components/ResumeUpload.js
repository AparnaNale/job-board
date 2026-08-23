"use client";
import { useRef, useState } from "react";
import { uploadResume } from "@/lib/api";
import JobCard from "./JobCard";

const ACCEPTED_TYPES = ".pdf,.doc,.docx";
const MAX_SIZE_MB = 10;

function formatBytes(bytes) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-paper/40 border-t-paper rounded-full animate-spin" />
  );
}

export default function ResumeUpload({ onAnalyzed }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const inputRef = useRef(null);

  function pickFile(selected) {
    if (!selected) return;
    const isValidType = /\.(pdf|docx?|)$/i.test(selected.name);
    if (!isValidType) {
      setError("Unsupported file type. Please upload a PDF or DOCX resume.");
      return;
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Please keep it under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setError("");
    setResult(null);
    setFile(selected);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await uploadResume(file, apiKey.trim() || undefined);
      setResult(data);
      onAnalyzed?.(data);
    } catch (e) {
      setError(e.message || "Couldn't process your resume. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="gemini-key-resume" className="block text-sm font-medium text-ink mb-1.5">
          Gemini API key <span className="text-slate font-normal">(optional)</span>
        </label>
        <input
          id="gemini-key-resume"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your Gemini API key for AI-powered profile extraction"
          className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet/40"
          autoComplete="off"
        />
        <p className="text-xs text-slate mt-1">
          With a key, your resume is analyzed by Gemini for a richer profile. Without one, we
          fall back to local keyword-based skill matching — never stored on our server either way.
        </p>
      </div>

      {!file ? (
        <label
          htmlFor="resume-input"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-violet bg-violetSoft/60"
              : "border-line bg-surface/40 hover:border-violet/50 hover:bg-surface"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-violetSoft text-violet flex items-center justify-center">
            <UploadIcon />
          </div>
          <div>
            <p className="font-display font-semibold text-ink">
              Drop your resume here, or{" "}
              <span className="text-violet underline underline-offset-2">browse</span>
            </p>
            <p className="text-sm text-slate mt-1">PDF or DOCX, up to {MAX_SIZE_MB}MB</p>
          </div>
          <input
            id="resume-input"
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(e) => pickFile(e.target.files?.[0])}
            className="hidden"
          />
        </label>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white p-4 sm:p-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-violetSoft text-violet flex items-center justify-center">
              <FileIcon />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-ink truncate">{file.name}</p>
              <p className="text-xs text-slate">{formatBytes(file.size)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={clearFile}
              disabled={loading}
              aria-label="Remove file"
              className="w-8 h-8 rounded-md flex items-center justify-center text-slate hover:text-ink hover:bg-surface transition-colors disabled:opacity-40"
            >
              <CloseIcon />
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="flex items-center gap-2 bg-ink text-paper px-5 py-2.5 rounded-md font-display font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {loading && <Spinner />}
              {loading ? "Analyzing..." : "Analyze my resume"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 mt-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          <AlertIcon />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-10">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-display text-lg font-bold">Your Skill Profile</h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface text-slate">
                {result.used_ai ? "AI-analyzed" : "Keyword-matched"}
              </span>
            </div>
            {(result.profile?.skills || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(result.profile?.skills || []).map((s) => (
                  <span
                    key={s}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-violetSoft text-violet"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate">
                No known skills detected — try a resume with a clearer skills section.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Recommended for You</h2>
              <span className="text-xs text-slate">
                {(result.recommendations || []).length} matching role
                {(result.recommendations || []).length === 1 ? "" : "s"}
              </span>
            </div>

            {(result.recommendations || []).length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {(result.recommendations || []).map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate border border-dashed border-line rounded-lg p-6 text-center">
                No strong matches found yet. Browse all open roles instead.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}