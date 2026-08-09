## ADDED Requirements

### Requirement: Email-based registration and login

The system SHALL allow users to register with an email and password, verify their email via a link, log in with their credentials, and request password resets. Passwords SHALL be hashed using bcrypt. Verification and reset tokens SHALL be single-use and expire after 1 hour.

#### Scenario: Register a new account

- **WHEN** a user submits email and password at `/register`
- **THEN** the system creates an unverified user, sends a verification email, and returns a message instructing the user to check their inbox

#### Scenario: Verify email

- **WHEN** a user clicks the verification link with a valid token
- **THEN** the system marks the user as verified and allows login

#### Scenario: Login with valid credentials

- **WHEN** a verified user submits correct email and password
- **THEN** the system sets an httpOnly cookie containing an access JWT (15 min expiry) and a refresh JWT (7 day expiry), and returns the user profile

#### Scenario: Login with unverified email

- **WHEN** an unverified user attempts to log in
- **THEN** the system rejects login with a message to verify email first, and offers to resend the verification link

#### Scenario: Request password reset

- **WHEN** a user submits their email at `/forgot-password`
- **THEN** the system sends a password reset link regardless of whether the email exists (to prevent enumeration) but only generates a token for existing accounts

#### Scenario: Reset password with valid token

- **WHEN** a user submits a new password with a valid reset token
- **THEN** the system updates the password hash, invalidates all refresh tokens for that user, and confirms the reset

### Requirement: OAuth login via GitHub and Google

The system SHALL support login and registration via GitHub OAuth and Google OAuth. First-time OAuth users SHALL have an account created automatically with `is_verified: true`. Returning OAuth users SHALL be logged in without additional verification.

#### Scenario: First-time OAuth login

- **WHEN** a user clicks "Sign in with GitHub" and authorizes the app for the first time
- **THEN** the system creates a user record with `oauth_provider: "github"`, `oauth_id`, `is_verified: true`, sets JWTs in cookies, and redirects to the app

#### Scenario: Returning OAuth login

- **WHEN** an existing OAuth user clicks "Sign in with GitHub"
- **THEN** the system matches by `oauth_provider` and `oauth_id`, refreshes the user metadata if changed, sets JWTs, and redirects

#### Scenario: Email conflict between OAuth and email registration

- **WHEN** a user with an email-registered account tries to log in via Google OAuth with the same email
- **THEN** the system links the OAuth identity to the existing account instead of creating a duplicate

### Requirement: JWT-based session management

The system SHALL use short-lived access tokens (15 min) and longer-lived refresh tokens (7 days) stored as httpOnly, Secure, SameSite=Lax cookies. Access tokens SHALL be validated on every authenticated API request. Refresh tokens SHALL be rotated on each use.

#### Scenario: Use refresh token to get new access token

- **WHEN** the frontend receives a 401 due to expired access token
- **THEN** the system automatically calls `/api/auth/refresh` using the refresh token cookie, receives a new access token cookie, and retries the original request

#### Scenario: Logout invalidates refresh tokens

- **WHEN** a user clicks logout
- **THEN** the system revokes the current refresh token in the database, clears both cookies, and redirects to login

#### Scenario: Detect refresh token reuse

- **WHEN** a revoked refresh token is presented at the refresh endpoint
- **THEN** the system revokes ALL refresh tokens for that user (indicating potential token theft) and forces re-login

### Requirement: Security middleware

The system SHALL apply CSRF protection (double-submit cookie pattern), rate limiting (per-endpoint configurable), CORS restrictions (explicit frontend origin allowlist), and input validation (Pydantic schemas with size limits) on all API endpoints.

#### Scenario: CSRF token required for state-changing requests

- **WHEN** a POST/PUT/DELETE request arrives without a valid CSRF token
- **THEN** the system returns 403 Forbidden

#### Scenario: Rate limit on auth endpoints

- **WHEN** more than 20 requests are made to `/api/auth/login` from the same IP within 1 minute
- **THEN** the system returns 429 Too Many Requests with a Retry-After header

#### Scenario: Reject oversized uploads

- **WHEN** a `.tex` file upload exceeds 1MB
- **THEN** the system returns 413 Payload Too Large
