"use client"

import { QueryClientProvider as TanStackProvider, QueryClient } from "@tanstack/react-query"
import { useState } from "react"

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: 1,
          },
        },
      })
  )

  return <TanStackProvider client={queryClient}>{children}</TanStackProvider>
}
