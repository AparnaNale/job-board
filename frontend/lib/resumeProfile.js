// Persists the most recently analyzed resume's profile_id in
// localStorage, so the chat assistant on other pages (like a job detail
// page) can automatically use it as context without asking the user to
// re-describe their background or re-upload anything.

const KEY = "resume_profile_id";

export function getStoredResumeProfileId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setStoredResumeProfileId(id) {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(KEY, id);
  } else {
    localStorage.removeItem(KEY);
  }
}
