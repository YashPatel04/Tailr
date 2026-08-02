"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCurrentUser, useSessions } from "@/hooks/queries"
import { Spinner } from "@/components/ui/Spinner"
import { Geist, Geist_Mono } from "next/font/google"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export default function RootPage() {
  const router = useRouter()
  const { data: user, isLoading } = useCurrentUser({ noAuthRedirect: true })
  const { data: sessions, isLoading: sessionsLoading } = useSessions({ enabled: !!user })

  useEffect(() => {
    if (!isLoading && user && !sessionsLoading && sessions && sessions.length > 0) {
      router.replace(`/session/${sessions[0].id}`)
    }
  }, [isLoading, user, sessions, sessionsLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a]">
        <Spinner size="lg" />
      </div>
    )
  }

  return <LandingPage />
}

/* ─── Colors (matching the mockup) ─── */
const c = {
  bg: "#0a0a0a",
  bgSurface: "#141414",
  ink: "#e8e8e8",
  slate: "#777",
  accent: "#10a37f",
  accentHover: "#0d8c6d",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
}

function LandingPage() {
  return (
    <div className={`${geist.variable} ${geistMono.variable}`} style={{ background: c.bg, color: c.ink }}>
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <DiffSection />
        <OpenSourceSection />
        <ExportSection />
        <CtaSection />
        <LandingFooter />
      </main>
      <ScrollEngine />
    </div>
  )
}

/* ═══════════════════════════════════════
   NAV
   ═══════════════════════════════════════ */
function LandingNav() {
  return (
    <nav
      id="landingNav"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-10 border-b border-transparent transition-colors duration-300"
      style={{ background: "rgba(10,10,10,0.85)", backdropFilter: "blur(16px)" }}
    >
      <div className="flex items-center gap-10">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="text-lg leading-none">📄</span> Tailr
        </Link>
        <ul className="hidden md:flex items-center gap-8 list-none">
          <li><a href="#features" className="text-sm text-[#777] hover:text-[#e8e8e8] transition-colors font-normal">Features</a></li>
          <li><a href="#open-source" className="text-sm text-[#777] hover:text-[#e8e8e8] transition-colors font-normal">Open Source</a></li>
          <li><a href="#" className="text-sm text-[#777] hover:text-[#e8e8e8] transition-colors font-normal">Docs</a></li>
          <li><a href="#" className="text-sm text-[#777] hover:text-[#e8e8e8] transition-colors font-normal">GitHub</a></li>
        </ul>
      </div>
      <div className="flex items-center gap-4">
        <a href="/login" className="text-sm font-medium text-[#e8e8e8] px-4 py-2 rounded-md hover:bg-white/[0.06] transition-colors">Sign In</a>
        <a href="/register" className="text-sm font-medium px-5 py-2 rounded-md bg-white text-[#0a0a0a] hover:bg-[#e0e0e0] transition-all hover:-translate-y-px">Get Started</a>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════ */
function HeroSection() {
  return (
    <section id="hero" className="relative" style={{ height: "200vh" }}>
      <div className="sticky top-0 h-screen flex items-center justify-center gap-16 max-w-[1200px] mx-auto px-10 overflow-hidden">
        <div id="heroContent" className="flex-1 basis-1/2 min-w-0">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-[#10a37f] mb-6 font-[family-name:var(--font-geist-mono)] tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10a37f] animate-pulse" />
            open-source resume tailoring
          </div>
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.08] tracking-[-0.035em] mb-6">
            Tailor your resume<br />to <em className="not-italic text-[#10a37f]">every</em> job.
          </h1>
          <p className="text-[clamp(1.0625rem,1.5vw,1.25rem)] text-[#777] leading-relaxed max-w-[460px] mb-10">
            One master resume. One job description. AI-powered tailoring that preserves your formatting and shows every change.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <a href="/register" className="text-[0.9375rem] font-medium px-8 py-3 rounded-xl bg-[#10a37f] text-white hover:bg-[#0d8c6d] transition-all hover:-translate-y-px">Get Started Free</a>
            <a href="#open-source" className="text-[0.9375rem] font-medium px-8 py-3 rounded-xl border border-[rgba(255,255,255,0.12)] text-[#e8e8e8] hover:border-[rgba(255,255,255,0.25)] transition-all">Self-Host It</a>
          </div>
        </div>

        <div id="heroWindow" className="flex-1 basis-1/2 min-w-0">
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)]" style={{ background: c.bgSurface }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.08)]" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span className="w-[11px] h-[11px] rounded-full border border-[rgba(255,255,255,0.1)] bg-[#ff5f57]" />
              <span className="w-[11px] h-[11px] rounded-full border border-[rgba(255,255,255,0.1)] bg-[#febc2e]" />
              <span className="w-[11px] h-[11px] rounded-full border border-[rgba(255,255,255,0.1)] bg-[#28c840]" />
              <span className="flex-1 text-center text-xs text-[rgba(255,255,255,0.4)]">Tailr — Google SWE Internship</span>
            </div>
            <div className="grid grid-cols-2 min-h-[360px]">
              <div className="p-8 border-r border-[rgba(255,255,255,0.08)]" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[rgba(255,255,255,0.4)] font-[family-name:var(--font-geist-mono)] mb-5">Original</div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#777] mb-2">Led team of engineers to build and deploy services</div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#777] mb-2">Worked on improving system performance</div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#777] mb-2">Used Python and SQL for data processing</div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#777] mb-2">Helped with code reviews and mentoring</div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#777]">Participated in on-call rotation</div>
              </div>
              <div className="p-8">
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[rgba(255,255,255,0.4)] font-[family-name:var(--font-geist-mono)] mb-5">Tailored</div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#10a37f] pl-3 border-l-2 border-[#10a37f] mb-2">Led team of <strong className="font-semibold">5 engineers</strong> to design and deploy <strong className="font-semibold">12 microservices</strong> on <strong className="font-semibold">Kubernetes</strong></div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#10a37f] pl-3 border-l-2 border-[#10a37f] mb-2">Reduced P99 latency by <strong className="font-semibold">40%</strong> across 3 production services</div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#10a37f] pl-3 border-l-2 border-[#10a37f] mb-2">Built ETL pipelines processing <strong className="font-semibold">2M+ records/day</strong> using Python and PostgreSQL</div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#10a37f] pl-3 border-l-2 border-[#10a37f] mb-2">Mentored <strong className="font-semibold">4 junior engineers</strong> and led weekly architecture reviews</div>
                <div className="text-[0.8125rem] leading-[1.7] text-[#10a37f] pl-3 border-l-2 border-[#10a37f] mb-6">Maintained <strong className="font-semibold">99.9% uptime SLA</strong> across 8 production services</div>
                <div className="flex items-baseline gap-3 pt-5 border-t border-[rgba(255,255,255,0.08)]">
                  <span className="text-xs text-[rgba(255,255,255,0.5)] font-medium">ATS Match</span>
                  <span className="text-2xl font-semibold text-[#10a37f] font-[family-name:var(--font-geist-mono)] tracking-tight">94%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   PROBLEM SECTION
   ═══════════════════════════════════════ */
function ProblemSection() {
  return (
    <section id="problem" className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-8">
        <div className="w-full max-w-[800px] text-center relative" style={{ height: "10rem" }}>
          <div id="problemLine0" className="absolute top-0 left-0 right-0 text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.25] tracking-[-0.025em] opacity-0">
            Generic resumes<br />don&apos;t land <span className="text-[#10a37f] relative"><span className="absolute bottom-[-2px] left-0 h-[3px] bg-[#10a37f] rounded-sm transition-[width] duration-600 ease-out" style={{ width: "0%" }} />interviews</span>.
          </div>
          <div id="problemLine1" className="absolute top-0 left-0 right-0 text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.25] tracking-[-0.025em] opacity-0">
            Tailoring by hand<br />takes <span className="text-[#10a37f] relative"><span className="absolute bottom-[-2px] left-0 h-[3px] bg-[#10a37f] rounded-sm transition-[width] duration-600 ease-out" style={{ width: "0%" }} />hours per application</span>.
          </div>
          <div id="problemLine2" className="absolute top-0 left-0 right-0 text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.25] tracking-[-0.025em] opacity-0">
            ATS filters reject<br /><span className="text-[#10a37f] relative"><span className="absolute bottom-[-2px] left-0 h-[3px] bg-[#10a37f] rounded-sm transition-[width] duration-600 ease-out" style={{ width: "0%" }} />75% of resumes</span> before a human sees them.
          </div>
        </div>
        <div id="problemCounter" className="mt-12 flex gap-2">
          <div className="w-2 h-2 rounded-full bg-[rgba(255,255,255,0.15)] transition-all duration-300" data-idx="0" />
          <div className="w-2 h-2 rounded-full bg-[rgba(255,255,255,0.15)] transition-all duration-300" data-idx="1" />
          <div className="w-2 h-2 rounded-full bg-[rgba(255,255,255,0.15)] transition-all duration-300" data-idx="2" />
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   HOW IT WORKS SECTION
   ═══════════════════════════════════════ */
function HowItWorksSection() {
  return (
    <section id="features" className="relative" style={{ height: "350vh" }}>
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="w-full max-w-[1200px] mx-auto px-10 relative">
          <h2 id="howHeading" className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.025em] leading-[1.15] opacity-0 translate-y-5 transition-all duration-600 ease-out">
            Three steps. No forms. No fluff.
          </h2>

          <div className="relative h-[60vh] mt-12">
            {/* Panel 1: Upload */}
            <div id="howPanel0" className="absolute inset-0 grid grid-cols-2 gap-16 items-center opacity-0 translate-x-[60px] pointer-events-none">
              <div>
                <div className="text-xs font-medium text-[#10a37f] mb-4 font-[family-name:var(--font-geist-mono)] tracking-wide opacity-80">01</div>
                <div className="text-[clamp(1.5rem,3vw,2.5rem)] font-semibold tracking-[-0.025em] mb-4 leading-[1.15]">Upload your resume</div>
                <div className="text-base text-[rgba(255,255,255,0.5)] leading-[1.65] max-w-[400px]">PDF, LaTeX, DOCX, or plain text. Tailr parses it into a structured document you can edit, section by section.</div>
              </div>
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] p-8 min-h-[280px] flex flex-col justify-center" style={{ background: c.bgSurface }}>
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[rgba(255,255,255,0.4)] font-[family-name:var(--font-geist-mono)] mb-5">Upload</div>
                <div className="border-2 border-dashed border-[rgba(255,255,255,0.12)] rounded-xl p-10 text-center">
                  <div className="w-10 h-10 mx-auto mb-4 rounded-md bg-[#10a37f] flex items-center justify-center text-white text-xl">↑</div>
                  <div className="text-sm font-medium mb-1">Drop your resume here</div>
                  <div className="text-xs text-[rgba(255,255,255,0.4)]">PDF, .tex, .docx, or .txt</div>
                </div>
              </div>
            </div>

            {/* Panel 2: Paste JD */}
            <div id="howPanel1" className="absolute inset-0 grid grid-cols-2 gap-16 items-center opacity-0 translate-x-[60px] pointer-events-none">
              <div>
                <div className="text-xs font-medium text-[#10a37f] mb-4 font-[family-name:var(--font-geist-mono)] tracking-wide opacity-80">02</div>
                <div className="text-[clamp(1.5rem,3vw,2.5rem)] font-semibold tracking-[-0.025em] mb-4 leading-[1.15]">Paste a job description</div>
                <div className="text-base text-[rgba(255,255,255,0.5)] leading-[1.65] max-w-[400px]">Drop a link or paste the text. Tailr extracts keywords, requirements, and company context automatically.</div>
              </div>
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] p-8 min-h-[280px] flex flex-col justify-center" style={{ background: c.bgSurface }}>
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[rgba(255,255,255,0.4)] font-[family-name:var(--font-geist-mono)] mb-5">Job Description</div>
                <div className="flex flex-col gap-3">
                  <div className="text-[0.8125rem] font-medium pb-3 border-b border-[rgba(255,255,255,0.08)]">Google — Software Engineering Intern, Summer 2026</div>
                  <div className="h-2.5 rounded bg-[rgba(255,255,255,0.1)] w-full" />
                  <div className="h-2.5 rounded bg-[rgba(255,255,255,0.1)] w-[85%]" />
                  <div className="h-2.5 rounded bg-[rgba(255,255,255,0.1)] w-[92%]" />
                  <div className="h-2.5 rounded bg-[rgba(255,255,255,0.1)] w-[60%]" />
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {["Kubernetes", "microservices", "Python", "PostgreSQL", "mentorship", "SLA"].map((kw) => (
                      <span key={kw} className="text-[0.6875rem] font-medium px-2 py-1 rounded bg-[rgba(16,163,127,0.15)] text-[#10a37f]">{kw}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 3: Review */}
            <div id="howPanel2" className="absolute inset-0 grid grid-cols-2 gap-16 items-center opacity-0 translate-x-[60px] pointer-events-none">
              <div>
                <div className="text-xs font-medium text-[#10a37f] mb-4 font-[family-name:var(--font-geist-mono)] tracking-wide opacity-80">03</div>
                <div className="text-[clamp(1.5rem,3vw,2.5rem)] font-semibold tracking-[-0.025em] mb-4 leading-[1.15]">Review and export</div>
                <div className="text-base text-[rgba(255,255,255,0.5)] leading-[1.65] max-w-[400px]">See every change in a side-by-side diff. Accept, reject, or iterate. Export to PDF, LaTeX, DOCX, or plain text.</div>
              </div>
              <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] p-8 min-h-[280px] flex flex-col justify-center" style={{ background: c.bgSurface }}>
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[rgba(255,255,255,0.4)] font-[family-name:var(--font-geist-mono)] mb-5">Review</div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-[rgba(255,255,255,0.12)]">
                    <div className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#10a37f] text-white">Changes</div>
                    <div className="text-xs font-medium text-[#777] px-3 py-1.5 rounded-md">Final</div>
                  </div>
                  <div className="text-[0.8125rem] leading-[1.6] pl-3 border-l-2 border-[#ef4444] text-[#777] line-through opacity-35">Led team of engineers to build services</div>
                  <div className="text-[0.8125rem] leading-[1.6] pl-3 border-l-2 border-[#10a37f] text-[#10a37f]">Led team of 5 engineers to design and deploy 12 microservices on Kubernetes</div>
                  <div className="text-[0.8125rem] leading-[1.6] pl-3 border-l-2 border-[#ef4444] text-[#777] line-through opacity-35">Worked on improving system performance</div>
                  <div className="text-[0.8125rem] leading-[1.6] pl-3 border-l-2 border-[#10a37f] text-[#10a37f]">Reduced P99 latency by 40% across 3 production services</div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-10 right-10 h-0.5 bg-[rgba(255,255,255,0.08)] rounded">
            <div id="howProgressFill" className="h-full bg-[#10a37f] rounded transition-[width] duration-300 ease-out" style={{ width: "0%" }} />
          </div>
          <div className="absolute bottom-[calc(2rem+12px)] left-10 flex gap-8">
            <span className="how-progress-dot text-[0.6875rem] font-medium text-[rgba(255,255,255,0.2)] font-[family-name:var(--font-geist-mono)] transition-colors" data-idx="0">Upload</span>
            <span className="how-progress-dot text-[0.6875rem] font-medium text-[rgba(255,255,255,0.2)] font-[family-name:var(--font-geist-mono)] transition-colors" data-idx="1">Job Description</span>
            <span className="how-progress-dot text-[0.6875rem] font-medium text-[rgba(255,255,255,0.2)] font-[family-name:var(--font-geist-mono)] transition-colors" data-idx="2">Review</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   DIFF SECTION
   ═══════════════════════════════════════ */
function DiffSection() {
  return (
    <section id="diffSection" className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="max-w-[1100px] w-full px-10">
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.025em] leading-[1.15] mb-12 max-w-[600px]">
            See every change. Accept what works. Iterate on the rest.
          </h2>
          <div className="grid grid-cols-2 rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden" style={{ background: c.bgSurface }}>
            <div id="diffColOriginal" className="p-8 border-r border-[rgba(255,255,255,0.08)]">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[rgba(255,255,255,0.4)] font-[family-name:var(--font-geist-mono)] mb-6">Original</div>
              {["Led team of engineers to build and deploy services", "Worked on improving system performance", "Used Python and SQL for data processing", "Helped with code reviews and mentoring", "Participated in on-call rotation"].map((line, i) => (
                <div key={i} className="diff-orig-line text-[0.8125rem] leading-[1.7] mb-2.5 transition-all duration-500" data-idx={i}>{line}</div>
              ))}
            </div>
            <div id="diffColTailored" className="p-8">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[rgba(255,255,255,0.4)] font-[family-name:var(--font-geist-mono)] mb-6 flex items-center gap-3">
                Tailored
                <span id="diffBadge" className="text-[0.6875rem] font-medium normal-case tracking-normal font-[family-name:var(--font-geist)] text-[#10a37f] px-2 py-0.5 rounded bg-[rgba(16,163,127,0.15)] opacity-0 transition-opacity duration-600">+3 keywords</span>
              </div>
              {[
                { text: "Led team of ", kw: ["5 engineers"], mid: " to design and deploy ", kw2: ["12 microservices"], end: " on ", kw3: ["Kubernetes"] },
                { text: "Reduced P99 latency by ", kw: ["40%"], end: " across 3 production services" },
                { text: "Built ETL pipelines processing ", kw: ["2M+ records/day"], end: " using Python and PostgreSQL" },
                { text: "Mentored ", kw: ["4 junior engineers"], end: " and led weekly architecture reviews" },
                { text: "Maintained ", kw: ["99.9% uptime SLA"], end: " across 8 production services" },
              ].map((item, i) => (
                <div key={i} className="diff-tail-line text-[0.8125rem] leading-[1.7] mb-2.5 transition-all duration-500" data-idx={i}>
                  {item.text}{item.kw.map((k, j) => <strong key={j} className="font-semibold text-[#10a37f]">{k}</strong>)}{item.mid || ""}{item.kw2?.map((k, j) => <strong key={j} className="font-semibold text-[#10a37f]">{k}</strong>)}{item.end || ""}{item.kw3?.map((k, j) => <strong key={j} className="font-semibold text-[#10a37f]">{k}</strong>)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-4 mt-10">
            <span className="text-xs text-[rgba(255,255,255,0.5)] font-medium">ATS Match Rate</span>
            <span id="diffScoreVal" className="font-[family-name:var(--font-geist-mono)] text-5xl font-semibold tracking-[-0.03em] text-[rgba(255,255,255,0.15)] transition-colors duration-700">62</span>
          </div>
          <p className="mt-8 text-[0.8125rem] text-[rgba(255,255,255,0.45)] max-w-[460px] leading-relaxed">
            Your resume never leaves your workspace. No AI-generated experience — only better wording of what you already did.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   OPEN SOURCE SECTION
   ═══════════════════════════════════════ */
function OpenSourceSection() {
  return (
    <section id="open-source" className="py-[clamp(6rem,10vw,10rem)] px-10 max-w-[1200px] mx-auto">
      <div className="text-xs font-medium text-[#10a37f] mb-4 font-[family-name:var(--font-geist-mono)] tracking-wide">open source</div>
      <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-[-0.03em] mb-5 leading-[1.1]">Own your tools.</h2>
      <p className="text-[1.0625rem] text-[rgba(255,255,255,0.5)] leading-relaxed max-w-[520px] mb-14">
        Tailr is fully open-source and self-hosted. Your data stays on your infrastructure. No vendor lock-in, no usage caps, no surprises.
      </p>
      <div className="grid grid-cols-3 gap-6 mb-14">
        {[
          { icon: "⬡", title: "Self-hosted", desc: "Docker Compose up and running in minutes. PostgreSQL, Redis, and texlive — all containerized. No external services required." },
          { icon: "λ", title: "LaTeX-native", desc: "Full LaTeX parsing and compilation. Your formatting is preserved exactly — no conversions, no approximations, no broken layouts." },
          { icon: "◈", title: "Bring your own LLM", desc: "Connect any OpenAI-compatible provider. Use GPT-4, Claude, Llama, or a local model. Your API key, your choice." },
        ].map((card) => (
          <div key={card.title} className="oss-card p-8 rounded-xl border border-[rgba(255,255,255,0.12)] transition-border-color hover:border-[#10a37f]">
            <div className="w-9 h-9 rounded-lg bg-[rgba(16,163,127,0.12)] flex items-center justify-center mb-5 text-[#10a37f]">{card.icon}</div>
            <div className="text-base font-semibold mb-2 tracking-tight">{card.title}</div>
            <div className="text-[0.8125rem] text-[rgba(255,255,255,0.5)] leading-relaxed">{card.desc}</div>
          </div>
        ))}
      </div>
      <div className="oss-code rounded-xl p-7 overflow-x-auto" style={{ background: "#111" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full border border-[rgba(255,255,255,0.15)] bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full border border-[rgba(255,255,255,0.15)] bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full border border-[rgba(255,255,255,0.15)] bg-[#28c840]" />
          <span className="font-[family-name:var(--font-geist-mono)] text-[0.6875rem] text-[rgba(255,255,255,0.4)] ml-2">terminal</span>
        </div>
        <pre className="font-[family-name:var(--font-geist-mono)] text-[0.8125rem] leading-[1.7] text-[#c9d1d9]">
          <span className="text-[#555]"># Clone and start</span>{"\n"}
          <span className="text-[#10a37f]">git clone</span> <span className="text-[#8b949e]">https://github.com/tailr/tailr</span>{"\n"}
          <span className="text-[#10a37f]">cd</span> tailr && <span className="text-[#10a37f]">cp</span> backend/.env.example backend/.env{"\n"}
          <span className="text-[#10a37f]">docker compose</span> up --build{"\n"}
          {"\n"}
          <span className="text-[#555]"># Run migrations</span>{"\n"}
          <span className="text-[#10a37f]">docker compose exec</span> backend alembic upgrade head
        </pre>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   EXPORT SECTION
   ═══════════════════════════════════════ */
function ExportSection() {
  const tiles = [
    { ext: ".tex", name: "LaTeX", desc: "Raw source. Full control over every macro and package." },
    { ext: ".pdf", name: "PDF", desc: "Compiled and ready to submit. Pixel-perfect output." },
    { ext: ".docx", name: "Word", desc: "For recruiters who need an editable document." },
    { ext: ".txt", name: "Plain Text", desc: "For ATS systems that strip formatting." },
  ]

  return (
    <section id="export" className="relative" style={{ height: "250vh" }}>
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="max-w-[1000px] w-full px-10 text-center">
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-semibold tracking-[-0.03em] mb-4 leading-[1.15]">Export anywhere.</h2>
          <p className="text-base text-[rgba(255,255,255,0.5)] mb-12">Your tailored resume, in whatever format you need.</p>
          <div id="exportGrid" className="grid grid-cols-4 gap-5">
            {tiles.map((tile, i) => (
              <div key={tile.ext} className="export-tile p-10 rounded-xl border border-[rgba(255,255,255,0.12)] text-center opacity-0 translate-y-[30px]" data-idx={i}>
                <div className="w-12 h-12 mx-auto mb-5 rounded-md border border-[rgba(255,255,255,0.08)] flex items-center justify-center font-[family-name:var(--font-geist-mono)] text-[0.8125rem] font-semibold text-[#10a37f] transition-all hover:bg-[rgba(16,163,127,0.12)] hover:border-[#10a37f]" style={{ background: c.bgSurface }}>{tile.ext}</div>
                <div className="text-base font-semibold mb-1.5 tracking-tight">{tile.name}</div>
                <div className="text-xs text-[rgba(255,255,255,0.45)] leading-relaxed">{tile.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   CTA + FOOTER
   ═══════════════════════════════════════ */
function CtaSection() {
  return (
    <section className="py-[clamp(8rem,12vw,12rem)] px-8 text-center">
      <div className="text-xs font-medium text-[#10a37f] mb-6 font-[family-name:var(--font-geist-mono)] tracking-wide">Ready?</div>
      <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-[-0.03em] mb-4 leading-[1.1]">Tailor your next resume.</h2>
      <p className="text-[1.0625rem] text-[rgba(255,255,255,0.5)] mb-10">Start with your resume and a job description.</p>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <a href="/register" className="text-[0.9375rem] font-medium px-8 py-3 rounded-xl bg-[#10a37f] text-white hover:bg-[#0d8c6d] transition-all hover:-translate-y-px">Get Started Free</a>
        <a href="#" className="text-[0.9375rem] font-medium px-8 py-3 rounded-xl border border-[rgba(255,255,255,0.12)] text-[#e8e8e8] hover:border-[rgba(255,255,255,0.25)] transition-all">View on GitHub</a>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="py-8 px-10 flex items-center justify-between text-xs text-[#777] border-t border-[rgba(255,255,255,0.12)] max-w-[1200px] mx-auto">
      <span>Tailr &copy; 2026</span>
      <ul className="flex gap-6 list-none">
        <li><a href="#" className="hover:text-[#e8e8e8] transition-colors">GitHub</a></li>
        <li><a href="#" className="hover:text-[#e8e8e8] transition-colors">Docs</a></li>
        <li><a href="#" className="hover:text-[#e8e8e8] transition-colors">Privacy</a></li>
      </ul>
    </footer>
  )
}

/* ═══════════════════════════════════════
   SCROLL ENGINE (React version)
   ═══════════════════════════════════════ */
function ScrollEngine() {
  const rafRef = useRef<number | null>(null)
  const tickingRef = useRef(false)

  const clamp = useCallback((v: number, min: number, max: number) => Math.max(min, Math.min(max, v)), [])
  const lerp = useCallback((a: number, b: number, t: number) => a + (b - a) * t, [])
  const easeOut = useCallback((t: number) => 1 - Math.pow(1 - t, 3), [])

  useEffect(() => {
    const nav = document.getElementById("landingNav")
    if (!nav) return

    const heroContent = document.getElementById("heroContent")
    const heroWindow = document.getElementById("heroWindow")
    const howHeading = document.getElementById("howHeading")

    const problemLines = [
      document.getElementById("problemLine0"),
      document.getElementById("problemLine1"),
      document.getElementById("problemLine2"),
    ]
    const problemDots = document.querySelectorAll("#problemCounter > div")

    const howPanels = [
      document.getElementById("howPanel0"),
      document.getElementById("howPanel1"),
      document.getElementById("howPanel2"),
    ]
    const howProgressFill = document.getElementById("howProgressFill")
    const howDots = document.querySelectorAll(".how-progress-dot")

    const diffOrigLines = document.querySelectorAll(".diff-orig-line")
    const diffTailLines = document.querySelectorAll(".diff-tail-line")
    const diffScoreVal = document.getElementById("diffScoreVal")
    const diffBadge = document.getElementById("diffBadge")

    const exportTiles = document.querySelectorAll(".export-tile")

    // Section definitions: [elementId, onProgress]
    type SectionEntry = { el: HTMLElement; onProgress: (p: number) => void; lastP: number }
    const sections: SectionEntry[] = []

    function register(id: string, onProgress: (p: number) => void) {
      const el = document.getElementById(id)
      if (el) sections.push({ el, onProgress, lastP: -1 })
    }

    // ─── HERO ───
    register("hero", (p) => {
      p = clamp(p, 0, 1)
      const ep = easeOut(clamp(p / 0.7, 0, 1))
      if (heroContent) {
        heroContent.style.opacity = String(1 - ep)
        heroContent.style.transform = `scale(${1 - ep * 0.08}) translateY(${-ep * 30}px)`
      }
      if (heroWindow) {
        heroWindow.style.opacity = String(1 - ep)
        heroWindow.style.transform = `scale(${1 - ep * 0.05}) translateY(${ep * 20}px)`
      }
    })

    // ─── PROBLEM ───
    register("problem", (p) => {
      p = clamp(p, 0, 1)
      const count = problemLines.length
      for (let i = 0; i < count; i++) {
        const segStart = i / count
        const segEnd = (i + 1) / count
        const segP = clamp((p - segStart) / (segEnd - segStart), 0, 1)
        const line = problemLines[i]
        const dot = problemDots[i] as HTMLElement
        if (!line || !dot) continue

        if (segP < 0.2) {
          const enterP = segP / 0.2
          line.style.opacity = String(enterP)
          line.style.transform = `translateY(${(1 - enterP) * 30}px)`
          if (enterP > 0.5) line.classList.add("active")
          else line.classList.remove("active")
        } else if (segP < 0.8) {
          line.style.opacity = "1"
          line.style.transform = "translateY(0)"
          line.classList.add("active")
        } else {
          const exitP = (segP - 0.8) / 0.2
          line.style.opacity = String(1 - exitP)
          line.style.transform = `translateY(${-exitP * 30}px)`
          line.classList.remove("active")
        }

        if (segP > 0.1 && segP < 0.9) {
          dot.style.background = "#10a37f"
          dot.style.width = "24px"
          dot.style.borderRadius = "4px"
        } else {
          dot.style.background = "rgba(255,255,255,0.15)"
          dot.style.width = "8px"
          dot.style.borderRadius = "50%"
        }
      }

      // Underline animation
      for (let i = 0; i < count; i++) {
        const segStart = i / count
        const segEnd = (i + 1) / count
        const segP = clamp((p - segStart) / (segEnd - segStart), 0, 1)
        const line = problemLines[i]
        if (!line) continue
        const underline = line.querySelector("span > span") as HTMLElement | null
        if (underline) {
          underline.style.width = segP > 0.2 && segP < 0.8 ? "100%" : "0%"
        }
      }
    })

    // ─── HOW IT WORKS ───
    register("features", (p) => {
      p = clamp(p, 0, 1)
      if (howHeading) {
        howHeading.style.opacity = p > 0.02 ? "1" : "0"
        howHeading.style.transform = p > 0.02 ? "translateY(0)" : "translateY(20px)"
      }

      const count = howPanels.length
      const panelStart = 0.08
      const panelRange = 0.92

      for (let i = 0; i < count; i++) {
        const segStart = panelStart + (i / count) * panelRange
        const segEnd = panelStart + ((i + 1) / count) * panelRange
        const segP = clamp((p - segStart) / (segEnd - segStart), 0, 1)
        const isActive = segP > 0.05 && segP < 0.95
        const isPast = segP >= 0.95
        const panel = howPanels[i]
        if (!panel) continue

        if (isActive) {
          panel.style.opacity = "1"
          panel.style.transform = "translateX(0)"
          panel.style.pointerEvents = "auto"
          panel.style.transition = "all 0.7s cubic-bezier(0.16,1,0.3,1)"
        } else if (isPast) {
          panel.style.opacity = "0"
          panel.style.transform = "translateX(-60px)"
          panel.style.pointerEvents = "none"
          panel.style.transition = "all 0.5s cubic-bezier(0.16,1,0.3,1)"
        } else {
          panel.style.opacity = "0"
          panel.style.transform = "translateX(60px)"
          panel.style.pointerEvents = "none"
          panel.style.transition = "none"
        }

        const dot = howDots[i] as HTMLElement
        if (dot) {
          dot.style.color = isActive || isPast ? "#10a37f" : "rgba(255,255,255,0.2)"
        }
      }

      if (howProgressFill) howProgressFill.style.width = `${p * 100}%`
    })

    // ─── DIFF ───
    register("diffSection", (p) => {
      p = clamp(p, 0, 1)
      const lineCount = diffOrigLines.length

      for (let i = 0; i < lineCount; i++) {
        const lineStart = 0.1 + (i / lineCount) * 0.6
        const lineEnd = lineStart + 0.12
        const lineP = clamp((p - lineStart) / (lineEnd - lineStart), 0, 1)

        const origLine = diffOrigLines[i] as HTMLElement
        const tailLine = diffTailLines[i] as HTMLElement
        if (origLine) {
          origLine.style.opacity = lineP > 0 ? "0.2" : "1"
          origLine.style.borderLeft = ""
          origLine.style.paddingLeft = ""
        }
        if (tailLine) {
          if (lineP > 0) {
            tailLine.style.opacity = "1"
            tailLine.style.borderLeft = "2px solid #10a37f"
            tailLine.style.paddingLeft = "12px"
            tailLine.style.color = "#10a37f"
          } else {
            tailLine.style.opacity = "1"
            tailLine.style.borderLeft = ""
            tailLine.style.paddingLeft = ""
            tailLine.style.color = ""
          }
        }
      }

      if (diffBadge) {
        diffBadge.style.opacity = p > 0.3 ? "1" : "0"
      }

      if (diffScoreVal) {
        const scoreP = easeOut(clamp((p - 0.6) / 0.3, 0, 1))
        const score = Math.round(lerp(62, 94, scoreP))
        diffScoreVal.textContent = String(score)
        diffScoreVal.style.color = scoreP > 0.5 ? "#10a37f" : "rgba(255,255,255,0.15)"
      }
    })

    // ─── EXPORT ───
    register("export", (p) => {
      p = clamp(p, 0, 1)
      const count = exportTiles.length
      for (let i = 0; i < count; i++) {
        const tileStart = 0.1 + (i / count) * 0.6
        const tileP = clamp((p - tileStart) / 0.2, 0, 1)
        const ep = easeOut(tileP)
        const tile = exportTiles[i] as HTMLElement
        if (ep > 0) {
          tile.style.opacity = String(ep)
          tile.style.transform = `translateY(${(1 - ep) * 30}px)`
          tile.style.transition = "all 0.6s cubic-bezier(0.16,1,0.3,1)"
        } else {
          tile.style.opacity = "0"
          tile.style.transform = "translateY(30px)"
        }
      }
    })

    // ─── OSS cards (simple IntersectionObserver) ───
    const ossCards = document.querySelectorAll(".oss-card")
    const ossCode = document.querySelector(".oss-code")
    const ossObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            el.style.opacity = "1"
            el.style.transform = "translateY(0)"
          }
        })
      },
      { threshold: 0.2 }
    )
    ossCards.forEach((card, i) => {
      const el = card as HTMLElement
      el.style.opacity = "0"
      el.style.transform = "translateY(20px)"
      el.style.transition = `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s`
      ossObserver.observe(el)
    })
    if (ossCode) {
      const el = ossCode as HTMLElement
      el.style.opacity = "0"
      el.style.transform = "translateY(20px)"
      el.style.transition = "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s"
      ossObserver.observe(el)
    }

    // ─── Scroll loop ───
    function onScroll() {
      const scrollY = window.scrollY
      const vh = window.innerHeight

      // Nav border
      nav.style.borderColor = scrollY > 10 ? "rgba(255,255,255,0.08)" : "transparent"

      // Pinned sections
      for (const s of sections) {
        const rect = s.el.getBoundingClientRect()
        const sectionTop = rect.top + scrollY
        const sectionHeight = s.el.offsetHeight
        const scrollDist = sectionHeight - vh
        if (scrollDist <= 0) continue

        const rawP = (scrollY - sectionTop) / scrollDist
        const p = clamp(rawP, 0, 1)

        if (p !== s.lastP) {
          s.lastP = p
          s.onProgress(p)
        }
      }
    }

    function requestTick() {
      if (!tickingRef.current) {
        tickingRef.current = true
        rafRef.current = requestAnimationFrame(() => {
          onScroll()
          tickingRef.current = false
        })
      }
    }

    window.addEventListener("scroll", requestTick, { passive: true })
    window.addEventListener("resize", requestTick, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener("scroll", requestTick)
      window.removeEventListener("resize", requestTick)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ossObserver.disconnect()
    }
  }, [clamp, lerp, easeOut])

  return null
}
