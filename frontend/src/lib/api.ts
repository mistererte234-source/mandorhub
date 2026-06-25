const API_BASE_URL = "/api";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("mandorhub_token");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// Auth helpers
export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("mandorhub_token", token);
  }
}

export function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("mandorhub_token");
  }
  return null;
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("mandorhub_token");
    window.location.href = "/login";
  }
}
