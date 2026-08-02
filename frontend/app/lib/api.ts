import { getApiBaseUrl } from "./env"

let csrfToken: string | null = null
let csrfTokenPromise: Promise<void> | null = null
let refreshPromise: Promise<void> | null = null

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${getApiBaseUrl()}/api/health`, { credentials: "include" })
  csrfToken = res.headers.get("X-CSRF-Token") || ""
  return csrfToken
}

async function refreshAccessToken(): Promise<void> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken || "" },
      })
      if (!res.ok) {
        window.location.href = "/login"
        throw new Error("Session expired")
      }
      if (res.headers.get("X-CSRF-Token")) {
        csrfToken = res.headers.get("X-CSRF-Token")
      }
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

export async function getCsrfToken(): Promise<string> {
  await ensureCsrfToken()
  return csrfToken || ""
}

async function ensureCsrfToken(): Promise<void> {
  if (csrfToken) return
  if (csrfTokenPromise) {
    await csrfTokenPromise
    return
  }
  csrfTokenPromise = (async () => {
    try {
      await fetchCsrfToken()
    } finally {
      csrfTokenPromise = null
    }
  })()
  await csrfTokenPromise
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestInit & { rawResponse?: boolean; noAuthRedirect?: boolean }
): Promise<T> {
  await ensureCsrfToken()

  const url = `${getApiBaseUrl()}${path}`
  const headers: Record<string, string> = {
    ...(opts?.headers as Record<string, string>),
  }

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken
  }

  const doFetch = async (): Promise<Response> =>
    fetch(url, {
      method,
      credentials: "include",
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      ...opts,
    })

  let res = await doFetch()

  if (res.status === 401) {
    if (opts?.noAuthRedirect) {
      throw new Error("Not authenticated")
    }
    await refreshAccessToken()
    res = await doFetch()
  }

  if (res.headers.get("X-CSRF-Token")) {
    csrfToken = res.headers.get("X-CSRF-Token")
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }))
    const detail = err.detail
    if (typeof detail === "string") {
      throw new Error(detail)
    }
    if (Array.isArray(detail)) {
      const messages = detail.map((d: any) => d.msg || d.message || JSON.stringify(d))
      throw new Error(messages.join("; "))
    }
    throw new Error(typeof detail === "object" ? JSON.stringify(detail) : "Request failed")
  }

  if (res.status === 204) {
    return undefined as T
  }

  if (opts?.rawResponse) {
    return res.blob() as Promise<T>
  }

  return res.json()
}
