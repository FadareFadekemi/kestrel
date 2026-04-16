/**
 * Auth API — login, signup, logout, token storage.
 * Token stored in sessionStorage (cleared on tab close).
 * Never stored in a cookie accessible to JS, never logged.
 */

const TOKEN_KEY = "kestrel_token";
const BASE = import.meta.env.VITE_API_URL || '';

export const getToken  = ()      => sessionStorage.getItem(TOKEN_KEY);
export const setToken  = (t)     => sessionStorage.setItem(TOKEN_KEY, t);
export const clearToken = ()     => sessionStorage.removeItem(TOKEN_KEY);
export const isLoggedIn = ()     => Boolean(getToken());

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
  return data;
}

export async function signup(email, password, name = "") {
  const data = await post(`${BASE}/api/auth/signup`, { email, password, name });
  setToken(data.token);
  return data.user;
}

export async function login(email, password) {
  const data = await post(`${BASE}/api/auth/login`, { email, password });
  setToken(data.token);
  return data.user;
}

export function logout() {
  clearToken();
}

export async function fetchMe() {
  const res = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders() });
  if (!res.ok) { clearToken(); return null; }
  return res.json();
}

// Authenticated fetch wrapper — used by leadsApi
export async function authFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) { clearToken(); window.location.reload(); }
  return res;
}
