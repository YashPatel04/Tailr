"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Sidebar } from "@/components/sidebar/Sidebar"
import { ChatRail } from "@/components/chat/ChatRail"
import { SearchModal } from "@/components/search/SearchModal"
import { ErrorBoundary } from "@/components/layout/ErrorBoundary"
import { SettingsModal } from "@/components/settings/SettingsModal"
import { useLayoutStore } from "@/stores/layout"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed, chatRailWidth, setChatRailWidth, chatRailCollapsed, setChatRailCollapsed, chatRailPeeking } =
    useLayoutStore()
  const [hydrated, setHydrated] = useState(false)
  const [resizing, setResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 0 })

  useEffect(() => {
    const storedSidebar = localStorage.getItem("rt-sidebar-collapsed")
    if (storedSidebar === "true") setSidebarCollapsed(true)
    const storedRail = localStorage.getItem("rt-chat-rail-collapsed")
    if (storedRail === "true") setChatRailCollapsed(true)
    setHydrated(true)
  }, [setSidebarCollapsed, setChatRailCollapsed])

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("rt-sidebar-collapsed", String(sidebarCollapsed))
    }
  }, [sidebarCollapsed, hydrated])

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("rt-chat-rail-collapsed", String(chatRailCollapsed))
    }
  }, [chatRailCollapsed, hydrated])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setResizing(true)
      resizeRef.current = { startX: e.clientX, startWidth: chatRailWidth }
    },
    [chatRailWidth]
  )

  useEffect(() => {
    if (!resizing) return
    const onMouseMove = (e: MouseEvent) => {
      const delta = resizeRef.current.startX - e.clientX
      const newWidth = Math.min(520, Math.max(280, resizeRef.current.startWidth + delta))
      setChatRailWidth(newWidth)
    }
    const onMouseUp = () => setResizing(false)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [resizing, setChatRailWidth])

  if (!hydrated) return null

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-canvas text-ink ">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 min-w-0">{children}</main>
        <div
          className={`resize-handle flex-shrink-0 ${resizing ? "active" : ""} ${chatRailCollapsed ? "hidden" : ""}`}
          onMouseDown={onMouseDown}
        />
        <div
          style={{ width: chatRailCollapsed ? (chatRailPeeking ? 220 : 52) : chatRailWidth }}
          className="flex-shrink-0 transition-[width] duration-200 ease-out"
        >
          <ChatRail width={chatRailCollapsed ? (chatRailPeeking ? 220 : 52) : chatRailWidth} />
        </div>
        <SearchModal />
        <SettingsModal />
      </div>
    </ErrorBoundary>
  )
}
