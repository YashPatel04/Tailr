"use client"

import { useState, useEffect, useRef } from "react"
import { create } from "zustand"
import { X, Moon, Sun } from "lucide-react"
import { clsx } from "clsx"
import { createPortal } from "react-dom"
import { useTheme } from "@/components/theme/ThemeProvider"
import { useCurrentUser, useProviders, useMasterResume, useUserPreferences, useUpdatePreferences } from "@/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api"
import { toast } from "@/components/ui/Toaster"
import { ModelPicker } from "@/components/chat/ModelPicker"
import type { ResumeContent } from "@/app/types"

/* ── Store ── */
interface SettingsModalState {
  isOpen: boolean
  tab: "profile" | "providers" | "preferences" | "master-resume" | "account"
  open: (tab?: SettingsModalState["tab"]) => void
  close: () => void
  setTab: (tab: SettingsModalState["tab"]) => void
}

export const useSettingsStore = create<SettingsModalState>((set) => ({
  isOpen: false,
  tab: "profile",
  open: (tab = "profile") => set({ isOpen: true, tab }),
  close: () => set({ isOpen: false }),
  setTab: (tab) => set({ tab }),
}))

/* ── Tab definitions ── */
const TABS = [
  { id: "profile" as const, label: "Profile" },
  { id: "providers" as const, label: "Providers" },
  { id: "preferences" as const, label: "Preferences" },
  { id: "master-resume" as const, label: "Master Resume" },
  { id: "account" as const, label: "Account" },
]

/* ── Modal ── */
export function SettingsModal() {
  const { isOpen, tab, close, setTab } = useSettingsStore()
  const { theme, toggle } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <div className="relative w-full max-w-2xl min-h-[55vh] max-h-[85vh] rounded-2xl bg-paper dark:bg-[#212121] shadow-2xl border border-muted flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-muted flex-shrink-0">
          <h2 className="text-lg font-semibold text-ink dark:text-[#ececec]">Settings</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-1.5 rounded-md hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] text-slate dark:text-[#8e8e8e] transition-colors"
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={close}
              className="p-1.5 rounded-md hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] text-slate dark:text-[#8e8e8e] transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          <nav className="w-[180px] flex-shrink-0 border-r border-muted bg-[#f9fafb] dark:bg-[#2b2b2b] py-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  "block w-full text-left px-4 py-2 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "text-brass bg-brass/10 dark:bg-brass/20"
                    : "text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] hover:bg-[#f4f4f4] dark:hover:bg-[#343541]"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {tab === "profile" && <ProfileTab />}
            {tab === "providers" && <ProvidersTab />}
            {tab === "preferences" && <PreferencesTab />}
            {tab === "master-resume" && <MasterResumeTab />}
            {tab === "account" && <AccountTab />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Profile Tab ── */
function ProfileTab() {
  const { data: user } = useCurrentUser()
  const [careerContext, setCareerContext] = useState("")
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (user?.career_context !== undefined) {
      setCareerContext(user.career_context || "")
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiRequest("PATCH", "/api/users/me", { career_context: careerContext })
      queryClient.invalidateQueries({ queryKey: ["user"] })
      toast.success("Saved")
    } catch (err: any) {
      toast.error(err.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-ink dark:text-[#ececec] mb-4">Profile</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink dark:text-[#ececec] mb-1">
            Career context
          </label>
          <p className="text-xs text-slate dark:text-[#8e8e8e] mb-2">
            This is injected into every tailoring prompt.
          </p>
          <textarea
            value={careerContext}
            onChange={(e) => setCareerContext(e.target.value)}
            rows={6}
            className="w-full min-h-[140px] rounded-lg border border-muted bg-paper dark:bg-[#2b2b2b] px-3 py-2 text-sm text-ink dark:text-[#ececec] focus:border-brass focus:ring-1 focus:ring-brass/30 outline-none resize-y"
            placeholder="I'm a senior engineer with 10 years of experience in..."
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  )
}

/* ── Providers Tab ── */
function ProvidersTab() {
  const { data: providers } = useProviders()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [providerType, setProviderType] = useState("openai")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiRequest("POST", "/api/providers", {
        name,
        provider_type: providerType,
        api_key: apiKey || undefined,
        base_url: baseUrl || undefined,
      })
      toast.success("Provider added")
      queryClient.invalidateQueries({ queryKey: ["providers"] })
      setShowForm(false)
      setName("")
      setApiKey("")
      setBaseUrl("")
    } catch (err: any) {
      toast.error(err.message || "Failed to add provider")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    try {
      const result = await apiRequest<any>("POST", `/api/providers/${id}/test`)
      toast.success(`Key valid — ${result.model_count} models available`)
    } catch (err: any) {
      toast.error(err.message || "Test failed")
    } finally {
      setTesting(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider?")) return
    try {
      await apiRequest("DELETE", `/api/providers/${id}`)
      queryClient.invalidateQueries({ queryKey: ["providers"] })
      toast.success("Provider deleted")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-ink dark:text-[#ececec]">API Keys</h3>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brass px-3 py-1.5 text-sm font-medium text-white hover:bg-brass-hover transition-colors"
        >
          Add key
        </button>
      </div>

      <div className="space-y-3">
        {providers?.map((p) => (
          <div key={p.id} className="rounded-lg border border-muted p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-ink dark:text-[#ececec]">{p.name}</h4>
                <p className="text-xs text-slate dark:text-[#8e8e8e] mt-0.5">
                  {p.provider_type}
                  {p.api_key_last_four && (
                    <span className="ml-2 font-mono">...{p.api_key_last_four}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(p.id)}
                  disabled={testing === p.id}
                  className="rounded border border-muted px-2.5 py-1 text-xs text-slate dark:text-[#8e8e8e] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] disabled:opacity-50 transition-colors"
                >
                  {testing === p.id ? "Testing..." : "Test"}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded border border-danger px-2.5 py-1 text-xs text-danger hover:bg-danger/10 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {(!providers || providers.length === 0) && (
          <p className="text-sm text-slate dark:text-[#8e8e8e]">No API keys configured.</p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-paper dark:bg-[#212121] p-6 shadow-2xl border border-muted">
            <h2 className="text-lg font-semibold text-ink dark:text-[#ececec] mb-4">
              Add API Key
            </h2>
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (e.g., My OpenAI Key)"
                className="w-full rounded-lg border border-muted bg-paper dark:bg-[#2b2b2b] px-3 py-2 text-sm text-ink dark:text-[#ececec] outline-none focus:border-brass"
              />
              <select
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
                className="w-full rounded-lg border border-muted bg-paper dark:bg-[#2b2b2b] px-3 py-2 text-sm text-ink dark:text-[#ececec] outline-none focus:border-brass"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
                <option value="custom">Custom</option>
              </select>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API key"
                type="password"
                className="w-full rounded-lg border border-muted bg-paper dark:bg-[#2b2b2b] px-3 py-2 text-sm text-ink dark:text-[#ececec] outline-none focus:border-brass"
              />
              {(providerType === "ollama" || providerType === "custom") && (
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="Base URL"
                  className="w-full rounded-lg border border-muted bg-paper dark:bg-[#2b2b2b] px-3 py-2 text-sm text-ink dark:text-[#ececec] outline-none focus:border-brass"
                />
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !name}
                  className="flex-1 rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-muted px-4 py-2 text-sm text-slate dark:text-[#8e8e8e] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Preferences Tab ── */
function PreferencesTab() {
  const { data: prefs } = useUserPreferences()
  const updatePrefs = useUpdatePreferences()
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [topP, setTopP] = useState(1.0)

  useEffect(() => {
    if (prefs) {
      setTemperature(prefs.default_temperature)
      setMaxTokens(prefs.default_max_tokens)
      setTopP(prefs.default_top_p)
    }
  }, [prefs])

  const handleSave = () => {
    updatePrefs.mutate(
      { default_temperature: temperature, default_max_tokens: maxTokens, default_top_p: topP },
      {
        onSuccess: () => toast.success("Preferences saved"),
        onError: (err: any) => toast.error(err.message || "Failed to save"),
      }
    )
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-ink dark:text-[#ececec] mb-4">
        Default Parameters
      </h3>
      <p className="text-xs text-slate dark:text-[#8e8e8e] mb-4">
        These defaults apply to all LLM calls unless overridden.
      </p>
      <div className="space-y-4 max-w-sm">
        <div>
          <div className="flex items-center justify-between text-sm text-slate dark:text-[#8e8e8e] mb-1">
            <label>Temperature</label>
            <span className="font-mono text-xs">{temperature}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm text-slate dark:text-[#8e8e8e] mb-1">Max Tokens</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
            min={1}
            max={128000}
            className="w-full rounded-lg border border-muted bg-paper dark:bg-[#2b2b2b] px-3 py-2 text-sm text-ink dark:text-[#ececec] outline-none focus:border-brass"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-sm text-slate dark:text-[#8e8e8e] mb-1">
            <label>Top P</label>
            <span className="font-mono text-xs">{topP}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={topP}
            onChange={(e) => setTopP(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={updatePrefs.isPending}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
        >
          {updatePrefs.isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  )
}

/* ── Resume Preview ── */
function ResumePreview({ content }: { content: ResumeContent }) {
  return (
    <div className="space-y-6 text-sm">
      <div className="text-center">
        <h2 className="text-xl font-bold text-ink">{content.basics.name}</h2>
        <div className="text-slate mt-1 space-x-2">
          {content.basics.email && <span>{content.basics.email}</span>}
          {content.basics.phone && <span>| {content.basics.phone}</span>}
          {content.basics.location && <span>| {content.basics.location}</span>}
        </div>
        {content.basics.profiles?.map((p, i) => (
          <div key={i} className="text-slate text-xs">
            {p.network}: {p.username}
          </div>
        ))}
        {content.basics.summary && (
          <p className="mt-2 text-ink/80 max-w-xl mx-auto">{content.basics.summary}</p>
        )}
      </div>

      {content.sections.map((section) => (
        <div key={section.id}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink border-b border-muted pb-1 mb-3">
            {section.label}
          </h3>

          {section.skill_rows.map((sk) => (
            <div key={sk.id} className="text-xs mb-1">
              <span className="font-semibold">{sk.category}:</span> {sk.items}
            </div>
          ))}

          {section.entries.map((entry) => (
            <div key={entry.id} className="mb-4">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-ink">{entry.title}</span>
                <span className="text-xs text-slate">{entry.dates}</span>
              </div>
              {(entry.role || entry.location) && (
                <div className="flex justify-between text-xs text-ink/70">
                  <em>{entry.role}</em>
                  {entry.location && <em>{entry.location}</em>}
                </div>
              )}
              {entry.organization && <div className="text-xs text-slate">{entry.organization}</div>}
              {entry.bullets.length > 0 && (
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs text-ink/80">
                  {entry.bullets.map((bullet) => (
                    <li key={bullet.id}>{bullet.text}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ── Master Resume Tab ── */
function MasterResumeTab() {
  const { data: master } = useMasterResume()
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [pickedProviderId, setPickedProviderId] = useState<string | null>(null)
  const [pickedModel, setPickedModel] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (pickedProviderId) formData.append("provider_id", pickedProviderId)
      if (pickedModel) formData.append("model", pickedModel)
      await apiRequest("POST", "/api/master-resume", formData)
      queryClient.invalidateQueries({ queryKey: ["master-resume"] })
      toast.success("Master resume uploaded")
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleDelete = async () => {
    if (!confirm("Remove your master resume?")) return
    setDeleting(true)
    try {
      await apiRequest("DELETE", "/api/master-resume")
      queryClient.setQueryData(["master-resume"], null)
      queryClient.invalidateQueries({ queryKey: ["master-resume"] })
      toast.success("Master resume removed")
    } catch (err: any) {
      toast.error(err.message || "Failed to remove")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-ink dark:text-[#ececec] mb-4">Master Resume</h3>

      {master ? (
        <div className="mb-6 rounded-lg border border-muted p-4 space-y-3">
          <p className="text-sm text-ink dark:text-[#ececec] font-medium">{master.filename}</p>
          <p className="text-xs text-slate dark:text-[#8e8e8e]">
            Format: .{master.original_format} &middot; Created:{" "}
            {new Date(master.created_at).toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-muted px-3 py-1.5 text-xs font-medium text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors"
            >
              View
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate dark:text-[#8e8e8e] mb-6">
          No master resume uploaded yet.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".tex,.docx,.txt,.pdf"
        onChange={handleUpload}
        className="hidden"
      />
      <div className="mb-3">
        <div className="text-xs font-semibold text-slate dark:text-[#8e8e8e] mb-1.5">
          Model for extraction
        </div>
        <ModelPicker
          selectedProviderId={pickedProviderId}
          selectedModel={pickedModel}
          onSelect={(pid, model) => {
            setPickedProviderId(pid)
            setPickedModel(model)
          }}
        />
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
      >
        {uploading ? "Uploading..." : master ? "Replace master resume" : "Upload master resume"}
      </button>

      {viewOpen && master && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-paper dark:bg-[#212121] rounded-xl shadow-2xl border border-muted w-full max-w-2xl max-h-[70vh] flex flex-col m-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-muted">
              <h4 className="text-sm font-semibold text-ink dark:text-[#ececec]">
                {master.filename}
              </h4>
              <button
                onClick={() => setViewOpen(false)}
                className="p-1 rounded-md hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] text-slate dark:text-[#8e8e8e]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {master.content_json ? (
                <ResumePreview content={master.content_json} />
              ) : (
                <p className="text-sm text-slate">No content available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Account Tab ── */
function AccountTab() {
  const { data: user } = useCurrentUser()
  const [deleting, setDeleting] = useState(false)
  const queryClient = useQueryClient()

  const handleDelete = async () => {
    if (!confirm("This will permanently delete your account and all data. Continue?")) return
    setDeleting(true)
    try {
      await apiRequest("DELETE", "/api/users/me")
      queryClient.clear()
      window.location.href = "/login"
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-ink dark:text-[#ececec] mb-4">Account</h3>
      <div className="space-y-8">
        {user?.oauth_provider && (
          <p className="text-sm text-slate dark:text-[#8e8e8e]">
            Linked account:{" "}
            <span className="text-ink dark:text-[#ececec] font-medium capitalize">
              {user.oauth_provider}
            </span>
          </p>
        )}
        <div className="border-t border-muted pt-8">
          <h4 className="text-sm font-semibold text-danger mb-2">Danger zone</h4>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  )
}
