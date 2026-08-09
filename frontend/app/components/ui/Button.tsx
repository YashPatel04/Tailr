"use client"

import { clsx } from "clsx"
import { ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
}

const variantClasses = {
  primary: "bg-brass text-white hover:bg-brass-hover",
  secondary:
    "border border-muted text-slate dark:text-[#8e8e8e] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f]",
  danger: "border border-danger text-danger hover:bg-danger/5",
  ghost: "text-slate dark:text-[#8e8e8e] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f]",
}

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
