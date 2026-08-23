// Auth token is kept in localStorage and sent as a Bearer header.
//
// Trade-off (documented in README): localStorage is simpler than an
// httpOnly cookie here because the frontend (Vercel) and backend (Render)
// are on different origins, which makes cross-domain cookies fiddly to
// set up correctly. The cost is that the token is readable by any JS
// running on the page (XSS risk) — acceptable for this assignment's
// scope, but call this out explicitly if asked about production hardening.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn() {
  return !!getToken();
}

function saveSession(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  // Notify other components (e.g. the navbar) in the same tab that
  // auth state changed, since the storage event only fires cross-tab.
  window.dispatchEvent(new Event("auth-changed"));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("auth-changed"));
}

export async function signup({ fullName, email, password }) {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Signup failed");
  // Intentionally NOT calling saveSession here -- signup creates the
  // account but does not log the user in. They're sent to the login
  // page next and log in explicitly from there.
  return data.user;
}

export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  saveSession(data);
  return data.user;
}

// Adds the Authorization header automatically when a token exists —
// use this instead of a bare fetch() for anything that should be
// personalized when the user is logged in.
export async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_URL}${path}`, { ...options, headers });
}