import { create } from "zustand"

interface LayoutState {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  chatRailWidth: number
  setChatRailWidth: (width: number) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  chatRailWidth: 360,
  setChatRailWidth: (width) => set({ chatRailWidth: width }),
}))
