export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas dark:bg-[#212121] px-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-muted bg-paper p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
