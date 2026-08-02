export interface User {
  id: string
  email: string
  oauth_provider: string | null
  oauth_id: string | null
  career_context: string | null
  default_temperature: number
  default_max_tokens: number
  default_top_p: number
  created_at: string
  updated_at: string
}

export interface LLMProvider {
  id: string
  name: string
  provider_type: "openai" | "anthropic" | "ollama" | "custom"
  api_key_last_four: string | null
  base_url: string | null
  created_at: string
}

export interface UserPreferences {
  default_temperature: number
  default_max_tokens: number
  default_top_p: number
}

export interface ModelInfo {
  id: string
  display_name: string
}

export interface MasterResume {
  id: string
  filename: string
  original_format: string
  content_json: ResumeContent
  page_count: number
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  master_resume_id: string | null
  company_name: string
  role_title: string
  job_description: string | null
  tailoring_mode: "polish" | "refine" | "rewrite"
  notes: string | null
  research_summary_json: ResearchSummary | null
  tags: string[]
  is_archived: boolean
  created_at: string
  updated_at: string
  latest_document?: {
    id: string | null
    version: number
    document_type: "resume" | "cover_letter"
    content: ResumeContent | null
    parent_doc_id: string | null
  } | null
  cover_letter_document?: {
    id: string | null
    version: number
    content: { text: string; type: string } | null
  } | null
  has_cover_letter?: boolean
}

export interface SessionDocument {
  id: string
  session_id: string
  doc_type: "resume" | "cover_letter"
  version: number
  content_json: ResumeContent
  parent_doc_id: string | null
  is_final: boolean
  created_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: "user" | "assistant" | "system"
  content: string
  metadata_json: Record<string, unknown> | null
  patch_id: string | null
  llm_provider_id: string | null
  model: string | null
  created_at: string
}

export interface ResearchSummary {
  values: string[]
  hiring_signals: string[]
  tone_guidance: string
}

export type ExportFormat = "tex" | "pdf" | "docx" | "txt"

export interface SpanAnnotation {
  start: number
  end: number
  formats: string[]
}

export type DiffKind = "added" | "removed" | "modified"

export interface DiffChange {
  kind: DiffKind
  old?: string
  new?: string
}

export interface Span {
  start: number
  end: number
  formats: Array<"bold" | "italic" | "underline" | "code">
  link_url: string | null
}

export interface Bullet {
  id: string
  text: string
  spans: Span[]
}

export interface Entry {
  id: string
  title: string
  role: string | null
  organization: string | null
  dates: string | null
  location: string | null
  urls: Record<string, string> | null
  bullets: Bullet[]
  metadata: Record<string, unknown>
}

export interface SkillRow {
  id: string
  category: string
  items: string
}

export interface Section {
  id: string
  label: string
  entries: Entry[]
  skill_rows: SkillRow[]
  metadata: Record<string, unknown>
}

export interface Basics {
  name: string
  email: string | null
  phone: string | null
  location: string | null
  profiles: Array<{ network: string; username: string; url: string }>
}

export interface ResumeContent {
  basics: Basics
  sections: Section[]
  metadata: Record<string, unknown>
}

export interface GroupedSessions {
  today: Session[]
  yesterday: Session[]
  previous_7_days: Session[]
  older: Session[]
  archived_count: number
}
