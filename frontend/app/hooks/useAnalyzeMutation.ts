"use client"

import { useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api"

interface AnalyzeResult {
  extracted: boolean
  company_name?: string
  role_title?: string
  source_url?: string
  jd_text?: string
  question?: string
}

export function useAnalyzeMutation() {
  return useMutation({
    mutationFn: async (data: { job_description?: string; job_description_url?: string }) => {
      return apiRequest<AnalyzeResult>("POST", "/api/sessions/analyze", data)
    },
  })
}
