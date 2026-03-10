 // frontend/src/auth.js

const USER_KEY = "user";
const TOKEN_KEY = "token";

function safeParse(json) {
  try {
    if (!json) return null;
    if (json === "undefined") return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function saveAuth({ user, token }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t || t === "undefined") return null;
  return t;
}

export function getUser() {
  return safeParse(localStorage.getItem(USER_KEY));
}

export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}