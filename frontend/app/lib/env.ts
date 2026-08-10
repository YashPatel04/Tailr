const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not set")
}

export function getApiBaseUrl(): string {
  return API_BASE_URL!
}
