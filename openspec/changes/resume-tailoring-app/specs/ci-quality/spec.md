## ADDED Requirements

### Requirement: Backend tests with pytest

The system SHALL include a pytest test suite for the Python backend covering: API endpoint integration tests, document parsing unit tests, patch validation unit tests, auth flow tests, and LLM provider adapter tests. Async endpoints SHALL use pytest-asyncio or httpx AsyncClient.

#### Scenario: Run full backend test suite

- **WHEN** `pytest` is executed from the backend directory
- **THEN** all tests discover and run automatically, reporting pass/fail counts and coverage summary

#### Scenario: Test document parsing end-to-end

- **WHEN** a test submits a `.tex` file to the parsing endpoint
- **THEN** the test asserts the returned token tree has correct node types, source ranges, and round-trip byte identity

#### Scenario: Test patch validation rejects invalid IDs

- **WHEN** a test submits a patch with a nonexistent target ID
- **THEN** the test asserts the validator returns a rejection with the specific invalid ID

#### Scenario: Test auth flow

- **WHEN** a test registers a user, verifies email, logs in, and accesses a protected endpoint
- **THEN** the test asserts each step succeeds and the protected endpoint returns data

### Requirement: Frontend tests with Vitest and React Testing Library

The system SHALL include a Vitest test suite for the React frontend covering: component rendering tests, hook tests, sidebar and chat rail interaction tests, document canvas rendering tests, and diff view state tests.

#### Scenario: Run full frontend test suite

- **WHEN** `npm test` is executed from the frontend directory
- **THEN** all tests discover and run, reporting pass/fail counts

#### Scenario: Test sidebar renders session history

- **WHEN** the sidebar component is rendered with mock session data grouped by date
- **THEN** the test asserts Today/Yesterday/Previous 7 Days groups appear with correct session entries

#### Scenario: Test diff view shows proofreading marks

- **WHEN** the diff view component receives a change set with one added and one removed element
- **THEN** the test asserts Proof Green caret renders on the addition and Proof Red strikethrough on the removal

#### Scenario: Test chat rail displays progress events

- **WHEN** the chat rail receives SSE events for researching, thinking, writing, and done
- **THEN** the test asserts each event renders with the correct Lucide icon and text

### Requirement: Backend linting with ruff

The Python backend SHALL be linted with `ruff` covering formatting, import sorting, and style rules. A `pyproject.toml` SHALL configure ruff with the project's rules. Linting SHALL be enforceable via pre-commit hook.

#### Scenario: Ruff passes on clean code

- **WHEN** `ruff check .` is executed from the backend directory
- **THEN** zero errors are reported

#### Scenario: Ruff fails on violations

- **WHEN** `ruff check .` encounters unused imports or style violations
- **THEN** errors are reported with file paths and line numbers

### Requirement: Frontend linting with ESLint and Prettier

The React frontend SHALL be linted with ESLint (TypeScript rules) and formatted with Prettier. An `.eslintrc` and `.prettierrc` SHALL configure the rules consistent with Next.js defaults. Linting SHALL be enforceable via pre-commit hook.

#### Scenario: ESLint passes on clean code

- **WHEN** `npm run lint` is executed from the frontend directory
- **THEN** zero errors and zero warnings are reported

#### Scenario: Prettier check passes

- **WHEN** `npx prettier --check .` is executed from the frontend directory
- **THEN** all files are reported as formatted correctly

### Requirement: Pre-commit and CI enforcement

The system SHALL include a `.pre-commit-config.yaml` that runs ruff (backend), ESLint + Prettier (frontend), and a basic script to check both test suites pass before commits. A CI configuration file (GitHub Actions or equivalent) SHALL run the full test and lint suite on every push.

#### Scenario: Pre-commit hook blocks commit with lint errors

- **WHEN** a developer attempts to commit code with ruff violations
- **THEN** the commit is blocked and the lint errors are displayed

#### Scenario: CI runs on push

- **WHEN** code is pushed to any branch
- **THEN** the CI pipeline executes backend tests, frontend tests, ruff check, and ESLint/Prettier check, reporting results
