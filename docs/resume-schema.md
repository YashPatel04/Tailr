# Resume Schema -- Data Model Reference

The `ResumeContent` model is the single source of truth for a resume. It's a Pydantic model that lives independent of any output format (LaTeX, HTML, etc.). Every part of the app -- the chat LLM, the canvas editor, the renderer -- reads and writes this same data structure.

---

## Models

### Basics

The header of the resume.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `str` | Yes | Full name |
| `email` | `str \| None` | No | Email address |
| `phone` | `str \| None` | No | Phone number |
| `location` | `str \| None` | No | City/state (e.g. "Austin, TX") |
| `profiles` | `list[Profile]` | No | Social/professional links |
| `summary` | `str \| None` | No | A short bio or objective |

Each `Profile` has `network` (e.g. "GitHub"), `username`, and `url`.

### Section

A named group of entries or skill rows. Sections have a `label` (e.g. "EXPERIENCE", "EDUCATION", "SKILLS") and appear in order.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` (UUID4) | Stable identifier, generated automatically |
| `label` | `str` | Display name of the section |
| `entries` | `list[Entry]` | Ordered list of experience/education items |
| `skill_rows` | `list[SkillRow]` | Alternative to entries; used for skills sections |
| `metadata` | `dict` | Arbitrary key-value pairs for extensibility |

A section uses either `entries` or `skill_rows` -- typically not both at once.

### Entry

A single item inside a section: a job, a degree, a project.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `str` (UUID4) | Auto | Stable identifier |
| `title` | `str` | Yes | Main heading (e.g. "Software Engineering Intern") |
| `role` | `str \| None` | No | Subtitle / position context |
| `organization` | `str \| None` | No | Company or school name |
| `dates` | `str \| None` | No | Date range (e.g. "June 2026 - Aug 2026") |
| `location` | `str \| None` | No | Place (e.g. "Austin, TX") |
| `url` | `str \| None` | No | Clickable link displayed alongside the org |
| `bullets` | `list[Bullet]` | No | Descriptive bullet points |
| `metadata` | `dict` | No | Extensibility |

### Bullet

A single bullet point with text and optional formatting spans.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` (UUID4) | Stable identifier |
| `text` | `str` | The bullet text content |
| `spans` | `list[Span]` | Formatting annotations for ranges of the text |

### Span

Inline formatting applied to a substring. Spans are validated at creation: `start >= 0`, `end <= len(text)`, `start < end`.

| Field | Type | Description |
|-------|------|-------------|
| `start` | `int` | Byte offset where formatting begins |
| `end` | `int` | Byte offset where formatting ends |
| `formats` | `list[FormatKind]` | Any combination of `"bold"`, `"italic"`, `"underline"`, `"code"` |
| `link_url` | `str \| None` | Optional hyperlink for the span |

### SkillRow

A single row in a skills section: a category label and a comma-separated list.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` (UUID4) | Stable identifier |
| `category` | `str` | Label before the colon (e.g. "Languages") |
| `items` | `str` | Comma-separated skills (e.g. "Python, TypeScript, Rust") |

### ResumeContent

The top-level model. Everything else nests under it.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `basics` | `Basics` | Yes | Name, contact, summary |
| `sections` | `list[Section]` | No | Ordered resume sections |
| `metadata` | `dict` | No | Top-level extensibility (import source, template version, etc.) |

---

## Concrete Example

```json
{
  "basics": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "512-555-0123",
    "location": "Austin, TX",
    "profiles": [
      { "network": "GitHub", "username": "janedoe", "url": "https://github.com/janedoe" },
      { "network": "LinkedIn", "username": "jane-doe", "url": "https://linkedin.com/in/jane-doe" }
    ],
    "summary": "Full-stack engineer passionate about developer tooling."
  },
  "sections": [
    {
      "id": "a1b2c3d4-...",
      "label": "EXPERIENCE",
      "entries": [
        {
          "id": "e1f2g3h4-...",
          "title": "TrendAI",
          "role": "Software Engineering Intern",
          "organization": null,
          "dates": "June 2026 – August 2026",
          "location": "Austin, TX",
          "url": null,
          "bullets": [
            {
              "id": "b1b2b3b4-...",
              "text": "Engineered and shipped a python migration tool",
              "spans": [
                { "start": 0, "end": 13, "formats": ["bold"], "link_url": null },
                { "start": 18, "end": 24, "formats": ["italic"], "link_url": null }
              ]
            },
            {
              "id": "b5b6b7b8-...",
              "text": "Reduced API latency by 40% through caching layer",
              "spans": []
            }
          ],
          "metadata": {}
        }
      ],
      "skill_rows": [],
      "metadata": {}
    },
    {
      "id": "s1s2s3s4-...",
      "label": "TECHNICAL SKILLS",
      "entries": [],
      "skill_rows": [
        { "id": "sk1sk2sk3-...", "category": "Languages", "items": "Python, TypeScript, Go, Rust" },
        { "id": "sk4sk5sk6-...", "category": "Frameworks", "items": "React, Django, FastAPI" },
        { "id": "sk7sk8sk9-...", "category": "Tools", "items": "Docker, Kubernetes, Terraform" }
      ],
      "metadata": {}
    },
    {
      "id": "s5s6s7s8-...",
      "label": "EDUCATION",
      "entries": [
        {
          "id": "e9e0e1e2-...",
          "title": "B.S. Computer Science",
          "role": null,
          "organization": "University of Texas at Austin",
          "dates": "2024 – 2026",
          "location": "Austin, TX",
          "url": null,
          "bullets": [],
          "metadata": {}
        }
      ],
      "skill_rows": [],
      "metadata": {}
    }
  ],
  "metadata": {
    "import_source": "manual",
    "template_version": "1.0"
  }
}
```

---

## Identifiers and Validation

- Every `Section`, `Entry`, `Bullet`, and `SkillRow` gets a **UUID4 `id`** on creation. IDs persist through edits -- updating a field does not change the id.
- **Pydantic validation** runs every time content is modified. Invalid span offsets, missing required fields, or unknown format kinds all raise clear `ValidationError` messages.
- The `metadata` dicts on `ResumeContent`, `Section`, and `Entry` are free-form storage for template hints, import tracking, or future extensions.
