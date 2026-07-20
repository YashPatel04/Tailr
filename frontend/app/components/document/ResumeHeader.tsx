"use client"

import type { Basics } from "@/types"

export function ResumeHeader({ basics }: { basics: Basics }) {
  return (
    <header className="mb-8 text-center">
      <h1 className="text-3xl font-bold text-ink dark:text-[#ececec] mb-2">
        {basics.name}
      </h1>
      <div className="text-sm text-slate dark:text-[#8e8e8e] space-y-1">
        {basics.location && <p>{basics.location}</p>}
        <p className="space-x-2">
          {basics.phone && <span>{basics.phone}</span>}
          {basics.email && (
            <>
              {basics.phone && <span>|</span>}
              <a
                href={`mailto:${basics.email}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {basics.email}
              </a>
            </>
          )}
          {basics.profiles?.map((p) => (
            <span key={p.url}>
              <span>|</span>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {p.username || p.network}
              </a>
            </span>
          ))}
        </p>
      </div>
    </header>
  )
}
