import type { ResumeContent } from "@/types"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api"

export function useCurrentUser() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: () => apiRequest<any>("GET", "/api/users/me"),
    retry: false,
  })
}

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => apiRequest<any[]>("GET", "/api/providers"),
  })
}

export function useMasterResume() {
  return useQuery({
    queryKey: ["master-resume"],
    queryFn: () => apiRequest<any>("GET", "/api/master-resume"),
    retry: false,
  })
}

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiRequest<any[]>("GET", "/api/sessions"),
  })
}

export function useGroupedSessions() {
  return useQuery({
    queryKey: ["sessions", "grouped"],
    queryFn: () => apiRequest<any>("GET", "/api/sessions/grouped"),
  })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ["sessions", id],
    queryFn: () => apiRequest<any>("GET", `/api/sessions/${id}`),
    enabled: !!id,
  })
}

export function useSessionMessages(id: string) {
  return useQuery({
    queryKey: ["sessions", id, "messages"],
    queryFn: () => apiRequest<any[]>("GET", `/api/sessions/${id}/messages`),
    enabled: !!id,
  })
}

export function useSessionDocument(sessionId: string | null, docType: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "document", docType],
    queryFn: async () => {
      const session = await apiRequest<any>("GET", `/api/sessions/${sessionId}`)
      const doc = session?.latest_document
      if (!doc || doc.document_type !== docType) return null
      const content = doc?.content as ResumeContent | undefined
      return { ...doc, content, documentModel: doc?.document_model_json }
    },
    enabled: !!sessionId,
  })
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: () => apiRequest<any[]>("GET", "/api/companies"),
  })
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => apiRequest<any[]>("GET", "/api/tags"),
  })
}
