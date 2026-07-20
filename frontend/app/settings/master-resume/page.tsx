"use client"

import { useState, useRef } from "react"
import { Eye, Trash2, X } from "lucide-react"
import { apiRequest } from "@/lib/api"
import { useMasterResume } from "@/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/Toaster"

export default function MasterResumePage() {
  const { data: master } = useMasterResume()
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      await apiRequest("POST", "/api/master-resume", formData)
      queryClient.invalidateQueries({ queryKey: ["master-resume"] })
      toast.success("Master resume uploaded")
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Remove your master resume?")) return
    setDeleting(true)
    try {
      await apiRequest("DELETE", "/api/master-resume")
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
      <h1 className="text-2xl font-semibold text-ink mb-6">Master Resume</h1>

      {master ? (
        <div className="mb-6 rounded-lg border border-muted p-4 space-y-3">
          <p className="text-sm text-ink font-medium">{master.filename}</p>
          <p className="text-xs text-slate">
            Format: .{master.original_format} &middot; Created: {new Date(master.created_at).toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-muted px-3 py-1.5 text-xs font-medium text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] hover:bg-[#f7f7f8] dark:hover:bg-[#40414f] transition-colors"
            >
              <Eye size={14} /> View
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} /> {deleting ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate mb-6">No master resume uploaded yet.</p>
      )}

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".tex"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass-hover disabled:opacity-50 transition-colors"
        >
          {uploading ? "Uploading..." : master ? "Replace master resume" : "Upload master resume"}
        </button>
      </div>

      {viewOpen && master && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-paper rounded-xl shadow-2xl border border-muted w-full max-w-3xl max-h-[80vh] flex flex-col m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-muted">
              <h2 className="text-sm font-semibold text-ink">{master.filename}</h2>
              <button
                onClick={() => setViewOpen(false)}
                className="p-1 rounded-md hover:bg-[#f4f4f4] dark:hover:bg-[#40414f] text-slate dark:text-[#8e8e8e] hover:text-ink dark:hover:text-[#ececec] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-xs text-ink whitespace-pre-wrap break-words leading-relaxed font-mono">
                {master.tex_source || "(No text content)"}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
