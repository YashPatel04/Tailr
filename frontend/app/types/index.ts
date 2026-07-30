export interface User {
  id: string
  email: string
  is_verified: boolean
  oauth_provider: string | null
  oauth_id: string | null
  career_context: string | null
  created_at: string
  updated_at: string
}

export interface LLMProvider {
  id: string
  name: string
  provider_type: "openai" | "anthropic" | "ollama" | "custom"
  api_key_last_four: string | null
  base_url: string | null
  model: string
  temperature: number
  top_p: number
  max_tokens: number
  is_default: boolean
  created_at: string
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
  llm_provider_id: string | null
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

export interface Patch {
  id: string
  session_id: string
  source_doc_id: string | null
  target_doc_id: string | null
  operations_json: PatchOperation[]
  raw_llm_response: string | null
  user_message: string | null
  applied: boolean
  user_feedback: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: "user" | "assistant" | "system"
  content: string
  metadata_json: Record<string, unknown> | null
  patch_id: string | null
  created_at: string
}

export interface ResearchSummary {
  values: string[]
  hiring_signals: string[]
  tone_guidance: string
}

export type ExportFormat = "tex" | "pdf" | "docx" | "txt"

export type DocNodeType = "section" | "entry" | "bullet" | "text" | "opaque"

export interface DocNode {
  id: string
  type: DocNodeType
  children: DocNode[]
  metadata: Record<string, unknown>
}

export interface SectionNode extends DocNode {
  type: "section"
  label: string
}

export interface EntryNode extends DocNode {
  type: "entry"
  title: string
  organization: string | null
  dates: string | null
}

export interface BulletNode extends DocNode {
  type: "bullet"
  text: string
  spans: SpanAnnotation[]
}

export interface TextNode extends DocNode {
  type: "text"
  text: string
  spans: SpanAnnotation[]
}

export interface OpaqueNode extends DocNode {
  type: "opaque"
  content: string
}

export interface SpanAnnotation {
  start: number
  end: number
  formats: string[]
}

export interface DiffChangeSet {
  changes: {
    node_id?: string
    path?: string
    type: "added" | "removed" | "modified" | "moved"
    old_text?: string
    new_text?: string
    old_parent_id?: string
    new_parent_id?: string
    reasoning?: string
  }[]
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
  profiles: Array<{network: string; username: string; url: string}>
  summary: string | null
}

export interface ResumeContent {
  basics: Basics
  sections: Section[]
  metadata: Record<string, unknown>
}

export interface PatchOperation {
  op: "modify" | "insert" | "delete" | "move" | "ask"
  reasoning: string
  target?: string
  text?: string
  spans?: SpanAnnotation[]
  parent?: string
  after?: string
  element?: DocNode
  question?: string
  context?: string
}
