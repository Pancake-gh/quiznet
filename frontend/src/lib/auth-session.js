const ACCESS_TOKEN_KEY = "quiznet-access-token";
const USERNAME_KEY = "quiznet-username";
const AUTH_CHANGED_EVENT = "quiznet-auth-changed";

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getSessionUsername() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(USERNAME_KEY);
}

export function saveSession(token, username) {
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.sessionStorage.setItem(USERNAME_KEY, username);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearSession() {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(USERNAME_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function subscribeToSessionChanges(callback) {
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, callback);
}
