"use client"

import { Toaster as HotToaster, toast } from "react-hot-toast"

export { toast }

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#171B22",
          color: "#F1F2EE",
          borderRadius: "12px",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
        },
        success: {
          iconTheme: {
            primary: "#2E7D5B",
            secondary: "#F1F2EE",
          },
        },
        error: {
          iconTheme: {
            primary: "#B23B3B",
            secondary: "#F1F2EE",
          },
        },
      }}
    />
  )
}
