## ADDED Requirements

### Requirement: Three-pane app layout
The application SHALL render a three-pane layout: a collapsible sidebar on the left (260px), a document canvas in the center (dominant width), and a chat rail on the right (320px). The sidebar SHALL be collapsible to an icon strip via a toggle button in the sidebar header.

#### Scenario: Default layout with sidebar expanded
- **WHEN** a user opens the app on desktop
- **THEN** the sidebar is visible at 260px width, the document canvas fills the remaining space minus the 320px chat rail

#### Scenario: Collapse sidebar to icon strip
- **WHEN** the user clicks the sidebar collapse icon
- **THEN** the sidebar collapses to a ~50px icon strip showing icon-only versions of New Chat, Search, and Profile

#### Scenario: Missing chat rail when no session active
- **WHEN** no tailoring session is selected (empty state)
- **THEN** the chat rail shows a placeholder: "No changes yet — paste a job description to begin"

### Requirement: Sidebar navigation structure
The sidebar SHALL contain: a header row with logo, search icon, and collapse toggle; a New Chat button; a Projects section for grouped sessions; a scrollable History section with date-grouped session entries (Today, Yesterday, Previous 7 Days, Older); and a fixed user profile section at the bottom.

#### Scenario: Sidebar header
- **WHEN** the sidebar is rendered
- **THEN** the header row displays the app logo on the left, a search icon (opens search modal), and a collapse/expand icon on the right

#### Scenario: History grouping by date
- **WHEN** the user has sessions created today, yesterday, and 5 days ago
- **THEN** the history section shows three groups: Today (1), Yesterday (1), Previous 7 Days (1) — each group collapsible

#### Scenario: Profile always visible at bottom
- **WHEN** the sidebar history section is scrolled
- **THEN** the profile section at the bottom remains fixed and visible, showing the user's avatar and email

### Requirement: Search modal overlay
Clicking the search icon in the sidebar header or pressing `Cmd/Ctrl+K` SHALL open a search modal overlay centered on screen. The modal SHALL provide a single search input that indexes chats, companies, and tags live as the user types.

#### Scenario: Open search modal via icon click
- **WHEN** the user clicks the search icon in the sidebar
- **THEN** a modal overlay appears with a search input focused, dimming the background

#### Scenario: Search across all categories
- **WHEN** the user types "security" in the search modal
- **THEN** results appear grouped by category: Chats (sessions whose title contains "security"), Companies (companies with sessions tagged security), Tags (the #security tag itself with session count)

#### Scenario: Close search modal on escape
- **WHEN** the user presses Escape while the search modal is open
- **THEN** the modal closes and focus returns to the previously focused element

### Requirement: Document canvas as primary focus
The document canvas SHALL render the resume document model as styled interactive sections using the design system's serif font (Newsreader). The canvas SHALL occupy the dominant width of the layout and SHALL be the visual center of the application.

#### Scenario: Render resume as styled sections
- **WHEN** a session's document is loaded
- **THEN** the canvas renders sections with serif headers, entries with title/dates formatting, and bullets with proper indentation — styled as a document, not as code

#### Scenario: Toggle to raw .tex view
- **WHEN** the user clicks the `[tex]` toggle in a section header
- **THEN** that section switches to a CodeMirror editor showing raw .tex source in mono font (JetBrains Mono), and switches back to rendered view on collapse

### Requirement: Chat rail interaction
The chat rail SHALL display all session messages in chronological order with role-based styling (user right-aligned in Brass accent, assistant/system left-aligned in Slate). The chat input SHALL be at the bottom of the rail, always visible. The chat rail SHALL display progress events (researching, thinking, writing) with appropriate Lucide icons.

#### Scenario: Send chat message
- **WHEN** the user types "Tailor this resume" and presses Enter
- **THEN** the message appears in the chat rail, the SSE connection opens, and progress events stream in

#### Scenario: Display progress with Lucide icons
- **WHEN** the SSE stream emits a `researching` event
- **THEN** the chat rail renders a system message with a Search icon, the text "Researching Stripe...", and a sub-list of sources being scanned

#### Scenario: Reference document elements from chat
- **WHEN** the user types "keep the original bullet 3"
- **THEN** the LLM can reference `bul-3` in its patch, and the finished result highlights that bullet in the canvas
