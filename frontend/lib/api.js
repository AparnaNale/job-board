// Centralized backend API calls, so components don't need to write
// fetch() logic individually.

import { authFetch } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getJobs({ source, tag, location, experienceLevel, q, limit = 24, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  if (tag) params.set("tag", tag);
  if (location) params.set("location", location);
  if (experienceLevel) params.set("experience_level", experienceLevel);
  if (q) params.set("q", q);
  params.set("limit", limit);
  params.set("offset", offset);
  const res = await fetch(`${API_URL}/api/jobs?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Jobs fetch failed");
  return res.json(); // { items, total, limit, offset }
}

export async function getFacets() {
  const res = await fetch(`${API_URL}/api/jobs/facets`, { cache: "no-store" });
  if (!res.ok) throw new Error("Facets fetch failed");
  return res.json(); // { sources, tags }
}

export async function getJob(id) {
  const res = await fetch(`${API_URL}/api/jobs/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Job fetch failed");
  return res.json();
}

// If an apiKey is passed, the backend runs AI (Gemini) based profile
// extraction on the resume text; otherwise (or if the AI call fails
// server-side) it automatically falls back to local rule-based skill
// extraction, so upload always works even without a key.
export async function uploadResume(file, apiKey) {
  const formData = new FormData();
  formData.append("file", file);
  if (apiKey) formData.append("gemini_api_key", apiKey);
  const res = await fetch(`${API_URL}/api/resume/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    // Surface the backend's actual error message (FastAPI sends
    // { detail: "..." }) instead of a generic "upload failed" -- much
    // more useful for debugging (DB errors, unsupported file type, etc).
    let detail = "Resume upload failed";
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // Response wasn't JSON (e.g. a raw 500 HTML page) -- keep the default.
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function sendChatMessage({ message, apiKey, jobId, resumeProfileId }) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      gemini_api_key: apiKey,
      job_id: jobId || null,
      resume_profile_id: resumeProfileId || null,
    }),
  });
  if (!res.ok) {
    // Same pattern as uploadResume -- surface the backend's actual
    // reason (invalid key, retired model, quota, etc.) instead of a
    // generic "Chat request failed", so the chat widget can show it.
    let detail = "Chat request failed";
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // Response wasn't JSON -- keep the default.
    }
    throw new Error(detail);
  }
  return res.json();
}

// Requires login -- authFetch attaches the Bearer token automatically.
// Backend returns 401 if there's no valid token, which we surface as an
// error the caller can catch and redirect to /login on.
export async function applyToJob(jobId) {
  const res = await authFetch(`/api/jobs/${jobId}/apply`, { method: "POST" });
  if (res.status === 401) throw new Error("LOGIN_REQUIRED");
  if (!res.ok) throw new Error("Apply request failed");
  return res.json(); // { already_applied, apply_link, applied_at }
}

// Used on the job detail page to show "Already applied" on load, without
// creating a new application row just from viewing the page.
export async function getApplyStatus(jobId) {
  const res = await authFetch(`/api/jobs/${jobId}/apply-status`, { method: "GET" });
  if (res.status === 401) return null; // not logged in -- just show the normal Apply button
  if (!res.ok) return null;
  return res.json();
}

// --- Save for later -------------------------------------------------
// Same auth pattern as apply: requires login, authFetch attaches the
// Bearer token, and a 401 is surfaced as a distinct error so callers can
// redirect to /login instead of showing a generic failure.

export async function saveJob(jobId) {
  const res = await authFetch(`/api/saved-jobs/${jobId}`, { method: "POST" });
  if (res.status === 401) throw new Error("LOGIN_REQUIRED");
  if (!res.ok) throw new Error("Save request failed");
  return res.json(); // { saved, saved_at }
}

export async function unsaveJob(jobId) {
  const res = await authFetch(`/api/saved-jobs/${jobId}`, { method: "DELETE" });
  if (res.status === 401) throw new Error("LOGIN_REQUIRED");
  if (!res.ok) throw new Error("Unsave request failed");
  return res.json(); // { saved, saved_at }
}

// Used on job cards / the detail page to show a filled-in bookmark on
// load, without saving anything just from viewing the page.
export async function getSaveStatus(jobId) {
  const res = await authFetch(`/api/saved-jobs/${jobId}/status`, { method: "GET" });
  if (res.status === 401) return null; // not logged in -- just show the outline bookmark
  if (!res.ok) return null;
  return res.json();
}

// Powers the /saved page -- the full list of jobs the current user has
// bookmarked, most-recently-saved first.
export async function getSavedJobs() {
  const res = await authFetch(`/api/saved-jobs`, { method: "GET" });
  if (res.status === 401) throw new Error("LOGIN_REQUIRED");
  if (!res.ok) throw new Error("Saved jobs fetch failed");
  return res.json(); // JobOut[]
}