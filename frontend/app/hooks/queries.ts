import type { ResumeContent, UserPreferences, ModelInfo, GroupedSessions } from "@/types"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api"

export function useCurrentUser(opts?: { enabled?: boolean; noAuthRedirect?: boolean }) {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: () =>
      apiRequest<any>("GET", "/api/users/me", undefined, { noAuthRedirect: opts?.noAuthRedirect }),
    retry: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => apiRequest<any[]>("GET", "/api/providers"),
  })
}

export function useModels(providerId: string) {
  return useQuery({
    queryKey: ["providers", providerId, "models"],
    queryFn: () =>
      apiRequest<{ models: ModelInfo[]; cached: boolean }>(
        "GET",
        `/api/providers/${providerId}/models`
      ),
    enabled: !!providerId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllModels(providers: { id: string }[] | undefined) {
  return useQuery({
    queryKey: ["all-models", (providers || []).map((p) => p.id).join(",")],
    queryFn: async () => {
      if (!providers || providers.length === 0) return []
      const results = await Promise.allSettled(
        providers.map((p) =>
          apiRequest<{ models: ModelInfo[]; cached: boolean }>(
            "GET",
            `/api/providers/${p.id}/models`
          )
        )
      )
      return providers.map((p, i) => {
        const result = results[i]
        if (result.status === "fulfilled") {
          return { providerId: p.id, models: result.value.models, available: true }
        }
        return { providerId: p.id, models: [] as ModelInfo[], available: false }
      })
    },
    enabled: !!providers && providers.length > 0,
  })
}

export function useUserPreferences() {
  return useQuery<UserPreferences>({
    queryKey: ["user", "preferences"],
    queryFn: () => apiRequest<UserPreferences>("GET", "/api/users/me/preferences"),
  })
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (prefs: Partial<UserPreferences>) =>
      apiRequest<UserPreferences>("PUT", "/api/users/me/preferences", prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "preferences"] })
      queryClient.invalidateQueries({ queryKey: ["user", "me"] })
    },
  })
}

export function useMasterResume() {
  return useQuery({
    queryKey: ["master-resume"],
    queryFn: () => apiRequest<any>("GET", "/api/master-resume"),
    retry: false,
  })
}

export function useSessions(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiRequest<any[]>("GET", "/api/sessions"),
    enabled: opts?.enabled ?? true,
  })
}

export function useGroupedSessions() {
  return useQuery({
    queryKey: ["sessions", "grouped"],
    queryFn: () => apiRequest<GroupedSessions>("GET", "/api/sessions/grouped"),
  })
}

export function useArchivedSessions(enabled: boolean) {
  return useQuery({
    queryKey: ["sessions", "archived"],
    queryFn: () => apiRequest<any[]>("GET", "/api/sessions/archived"),
    enabled,
  })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ["sessions", id],
    queryFn: () => apiRequest<any>("GET", `/api/sessions/${id}`),
    enabled: !!id,
  })
}

export function useSessionMessages(id: string, docType: string = "resume") {
  return useQuery({
    queryKey: ["sessions", id, "messages", docType],
    queryFn: () => apiRequest<any[]>("GET", `/api/sessions/${id}/messages?doc_type=${docType}`),
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
      return { ...doc, content }
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
