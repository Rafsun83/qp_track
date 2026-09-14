# API Guide

Base URL (local dev): `http://localhost:3001` (or whatever `PORT` is set to in `.env` / `process.env.PORT`, default `3000`).

Every request/response body is JSON. Send `Content-Type: application/json` on any request with a body.

## Authentication — read this first

Every endpoint in this API requires a JWT **except** the two marked "Public" below (`POST /auth/login`, `POST /api/users`). This is enforced globally by `AuthGuard` (`apps/be/src/modules/auth/guard/auth.guard.ts`) — there's no per-route opt-in needed for protection; a route is only public if it's explicitly decorated `@Public()`.

To call a protected endpoint, add the token you got from login as a header:

```
Authorization: Bearer <access_token>
```

- Missing header, malformed header (not `Bearer <token>`), or an invalid/expired token → `401 Unauthorized`.
- The token expires (`expiresIn` configured in `app.module.ts`, currently `1h`) — log in again to get a new one once it expires.

---

## `POST /auth/login`

**Public.** Exchanges a username/password for a JWT.

**Body:**

```json
{
  "username": "your_userName",
  "password": "your_password"
}
```

Both fields are required non-empty strings.

**Success — `200 OK`:**

```json
{
  "access_token": "eyJhbGciOi..."
}
```

**Failure — `401 Unauthorized`:** wrong username or wrong password (no distinction is given between the two, by design).

**Side effect:** a successful login increments that user's `loginCount` by 1.

**Example:**

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "myuser", "password": "mypassword123"}'
```

---

## `POST /api/users`

**Public.** Creates (registers) a new user.

**Body (`CreateUserDto`):**

| Field      | Type   | Rules                                  |
|------------|--------|------------------------------------------|
| `name`     | string | required, non-empty                      |
| `email`    | string | required, must be a valid email          |
| `userName` | string | required, non-empty, **must be unique**  |
| `location` | string | required                                 |
| `password` | string | required, minimum 8 characters           |

Any field not in this list is rejected outright (`400 Bad Request`) — the API does not silently ignore unknown fields.

**Success — `201 Created`:** the created user, without the password:

```json
{
  "id": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
  "name": "Jane Doe",
  "loginCount": 0,
  "email": "jane@example.com",
  "location": "Dhaka",
  "userName": "janedoe",
  "createdAt": "2026-09-10T02:07:28.920Z"
}
```

**Failure:**
- `400 Bad Request` — validation errors (missing/invalid field), e.g. `{"message": ["email must be an email"], "error": "Bad Request", "statusCode": 400}`
- `409 Conflict` — `userName` is already taken.

**Example:**

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "userName": "janedoe",
    "location": "Dhaka",
    "password": "password123"
  }'
```

---

## `POST /api-key`

**Requires auth.** Generates a new API key for the authenticated user (the user is taken from the JWT, not the request body — a key always belongs to whoever's token was used).

**Body:**

```json
{
  "label": "my first key"
}
```

`label` is optional, a free-text string to help you tell keys apart later.

**Success — `201 Created`:** the raw key, returned **once** — only its bcrypt hash is stored, so save it now:

```json
{
  "apiKey": "sk-live_6928426a03c7d4160fc41631c4674183e36152daae7b7589f8d399f99a594307"
}
```

**Failure — `401 Unauthorized`:** missing/invalid/expired bearer token (same rules as every other protected endpoint).

**Example:**

```bash
curl -X POST http://localhost:3001/api-key \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"label": "my first key"}'
```

---

## `DELETE /api-key/delete`

**Requires auth.** Revokes an API key belonging to the authenticated user (sets `revokedAt`). A revoked key is immediately rejected by `ApiKeyGuard` on any endpoint that uses it (e.g. `GET /api/users/:id`, `POST /webhook/response`).

No body or params — the key to revoke is looked up **by `userId` alone**, not by key id. If a user has more than one key, this revokes whichever one the lookup happens to return first, not a specific one you choose. There's currently no way to target one key among several by id.

**Failure — `404 Not Found`:** the user has no matching API key to revoke.

**Example:**

```bash
curl -X DELETE http://localhost:3001/api-key/delete \
  -H "Authorization: Bearer <token>"
```

---

## `GET /api/users`

**Requires auth.** Lists users, with optional search/filter via query params. No params returns every user.

| Query param  | Type   | Behavior                                                                 |
|--------------|--------|---------------------------------------------------------------------------|
| `userName`   | string | **Search** — matches if `userName` *contains* this text, case-insensitive |
| `loginCount` | number | **Filter** — matches users whose `loginCount` is *exactly* this value     |

Both are optional and combinable — passing both ANDs the conditions together (must match both).

Passing an unknown query param, or a non-numeric `loginCount`, returns `400 Bad Request`.

**Examples:**

```bash
# All users
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer <token>"

# Search: userName contains "jane" (matches "Jane", "janedoe", "JANEsmith", ...)
curl "http://localhost:3001/api/users?userName=jane" \
  -H "Authorization: Bearer <token>"

# Filter: users who have logged in exactly 3 times
curl "http://localhost:3001/api/users?loginCount=3" \
  -H "Authorization: Bearer <token>"

# Both together
curl "http://localhost:3001/api/users?userName=jane&loginCount=3" \
  -H "Authorization: Bearer <token>"
```

**Success — `200 OK`:** an array of users (password never included), e.g.:

```json
[
  {
    "id": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "name": "Jane Doe",
    "loginCount": 3,
    "email": "jane@example.com",
    "location": "Dhaka",
    "userName": "janedoe",
    "createdAt": "2026-09-10T02:07:28.920Z"
  }
]
```

An empty array `[]` (not an error) if nothing matches.

---

## `GET /api/users/:id`

**API key only** — fetches a single user by their `id` (UUID). This route does **not** accept a JWT; it's excluded from the global `AuthGuard` and protected instead by `ApiKeyGuard`, which requires an `x-api-key` header (get one from `POST /api-key`).

**Failure — `401 Unauthorized`:** missing/invalid/revoked API key. A `Bearer` token alone is not accepted here.

**Example:**

```bash
curl http://localhost:3001/api/users/df7db73d-f047-44d5-9d51-62ec043bfe0e \
  -H "x-api-key: sk-live_..."
```

**Success — `200 OK`:** the user object, or `null` if no user has that id (the endpoint doesn't 404 on a missing id — a `null` body is returned).

---

## `POST /webhook/response`

**API key only** — same auth model as `GET /api/users/:id`: excluded from the global `AuthGuard`, protected instead by `ApiKeyGuard` via an `x-api-key` header (get one from `POST /api-key`). No JWT accepted.

Intended as a webhook target (e.g. a survey platform posting responses back to you). The `userId` stored on the record is **not** taken from the body — it's resolved from whichever API key made the request.

**Body:** any JSON object — it's stored as-is, no schema validation:

```json
{
  "surveyId": "abc123",
  "answers": { "q1": "yes", "q2": 5 }
}
```

**Success — `201 Created`:**

```json
{ "status": "ok" }
```

**Failure — `401 Unauthorized`:** missing, invalid, or revoked API key.

**Example:**

```bash
curl -X POST http://localhost:3001/webhook/response \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-live_..." \
  -d '{"surveyId": "abc123", "answers": {"q1": "yes"}}'
```

---

## `POST /webhook/response/test`

**API key only** — same auth as `POST /webhook/response` (`x-api-key` header, no JWT). A dry-run version of that endpoint: it does **not** persist anything to the database. Use it to check that your API key resolves to the expected `userId` and that your payload is being received/shaped correctly before wiring up the real webhook.

**Body:** any JSON object, echoed back unchanged.

**Success — `201 Created`:**

```json
{
  "status": "ok",
  "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
  "responseData": { "surveyId": "abc123", "answers": { "q1": "yes" } }
}
```

**Failure — `401 Unauthorized`:** missing, invalid, or revoked API key.

**Example:**

```bash
curl -X POST http://localhost:3001/webhook/response/test \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-live_..." \
  -d '{"surveyId": "abc123", "answers": {"q1": "yes"}}'
```

---

## `GET /api/survey-response`

**Requires auth** (JWT, via the global `AuthGuard` — no `@Public()` on this route, unlike the webhook above). Lists stored survey responses, with an optional filter.

| Query param | Type   | Behavior                                                  |
|-------------|--------|------------------------------------------------------------|
| `userId`    | string | Filter — only responses whose `userId` matches exactly     |

Omitting `userId` returns every survey response in the table (no ownership scoping — any authenticated user can list all responses, not just their own).

**Example:**

```bash
# All survey responses
curl http://localhost:3001/api/survey-response \
  -H "Authorization: Bearer <token>"

# Only responses recorded under a specific userId (the id of whoever owned the API key that posted them)
curl "http://localhost:3001/api/survey-response?userId=df7db73d-f047-44d5-9d51-62ec043bfe0e" \
  -H "Authorization: Bearer <token>"
```

**Success — `200 OK`:** an array of survey response records, e.g.:

```json
[
  {
    "id": "3f9a2b10-...",
    "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "responseData": { "surveyId": "abc123", "answers": { "q1": "yes" } },
    "createdAt": "2026-09-14T02:07:28.920Z"
  }
]
```

An empty array `[]` (not an error) if nothing matches.

---

## Common error shapes

| Status | When | Example body |
|--------|------|---------------|
| `400`  | Validation failed, or an unknown/extra field was sent | `{"message": ["loginCount must be an integer number"], "error": "Bad Request", "statusCode": 400}` |
| `401`  | No token, bad token format, expired/invalid token, or wrong login credentials | `{"message": "Unauthorized", "statusCode": 401}` |
| `409`  | Duplicate `userName` on registration | `{"message": "userName is already taken", "statusCode": 409}` |
| `500`  | Unexpected server error | `{"statusCode": 500, "message": "Internal server error"}` |
