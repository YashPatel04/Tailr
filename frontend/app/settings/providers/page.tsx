"use client"

import { useState } from "react"
import { apiRequest } from "@/lib/api"
import { useProviders } from "@/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/Toaster"

export default function ProvidersPage() {
  const { data: providers } = useProviders()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState("")
  const [providerType, setProviderType] = useState("openai")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [model, setModel] = useState("gpt-4o")
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiRequest("POST", "/api/providers", {
        name,
        provider_type: providerType,
        api_key: apiKey || undefined,
        base_url: baseUrl || undefined,
        model,
        temperature,
        max_tokens: maxTokens,
        is_default: isDefault,
      })
      toast.success("Provider added")
      queryClient.invalidateQueries({ queryKey: ["providers"] })
      setShowModal(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to add provider")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (id: string) => {
    try {
      await apiRequest("POST", `/api/providers/${id}/test`)
      toast.success("Provider test passed")
    } catch (err: any) {
      toast.error(err.message || "Test failed")
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-ink">LLM Providers</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover transition-colors"
        >
          Add provider
        </button>
      </div>

      <div className="space-y-3">
        {providers?.map((p) => (
          <div key={p.id} className="rounded-lg border border-muted p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-ink">{p.name}</h3>
                <p className="text-xs text-slate mt-0.5">
                  {p.provider_type} / {p.model}
                  {p.is_default && <span className="ml-2 text-brass text-xs font-medium">Default</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleTest(p.id)} className="rounded border border-muted px-3 py-1 text-xs text-slate dark:text-[#8e8e8e] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors">Test</button>
                <button onClick={() => handleDelete(p.id)} className="rounded border border-danger px-3 py-1 text-xs text-danger hover:bg-danger/5 transition-colors">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {(!providers || providers.length === 0) && (
          <p className="text-sm text-slate">No providers configured. Add one to start tailoring.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-paper p-6 shadow-2xl border border-muted">
            <h2 className="text-lg font-semibold text-ink mb-4">Add Provider</h2>
            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-muted px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
              <select value={providerType} onChange={(e) => setProviderType(e.target.value)} className="w-full rounded-lg border border-muted px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30 bg-paper">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
                <option value="custom">Custom</option>
              </select>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key" type="password" className="w-full rounded-lg border border-muted px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
              {(providerType === "ollama" || providerType === "custom") && (
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL" className="w-full rounded-lg border border-muted px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
              )}
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model" className="w-full rounded-lg border border-muted px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
              <div className="flex items-center gap-2 text-sm text-slate">
                <label className="flex-1">Temperature: {temperature}</label>
                <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="flex-1" />
              </div>
              <div>
                <label className="text-sm text-slate">Max tokens</label>
                <input type="number" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="w-full rounded-lg border border-muted px-3 py-2 text-sm outline-none focus:border-brass focus:ring-1 focus:ring-brass/30" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                Set as default
              </label>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSave} disabled={saving || !name || !model} className="flex-1 rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setShowModal(false)} className="rounded-lg border border-muted px-4 py-2 text-sm text-slate dark:text-[#8e8e8e] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
