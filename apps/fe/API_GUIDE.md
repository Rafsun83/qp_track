# API Guide

Base URL (local dev): `http://localhost:3001` (or whatever `PORT` is set to in `.env` / `process.env.PORT`, default `3000`).

Every request/response body is JSON. Send `Content-Type: application/json` on any request with a body.

## Response envelope

Every **successful** response from **every** endpoint in this API — no exceptions, this covers all of them, including `/webhook/*` and `/health` — is wrapped in a shared envelope by a global `ResponseInterceptor` (`apps/be/src/common/interceptors/response.interceptor.ts`), applied per-controller via `@UseInterceptors(ResponseInterceptor)`:

```json
{
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": "<-- whatever the endpoint used to return directly is here now",
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

- `statusCode` — the actual HTTP status code Nest already decided for the response (200, 201, etc.) — the same value the response line carries, just also inlined into the body.
- `message` — a human-readable, per-route string set via `@ResponseMessage('...')` (`apps/be/src/common/decorators/response-message.decorator.ts`); every route in this guide has one, quoted in that route's own section below. A route with no `@ResponseMessage` would default to `"Request successful"`.
- `data` — **exactly** what the response body used to be before this envelope existed. If an endpoint used to return a bare array, `data` is that array. If it used to return a single object, `data` is that object. If it used to return nothing (`void`, e.g. most `DELETE`s), `data` is `null` rather than the body being empty.
- `timestamp` — ISO 8601, generated at the moment the response is built (not the request's start time).

Concretely, `GET /api/users` used to return:

```json
[{ "id": "...", "name": "Jane Doe", "...": "..." }]
```

and now returns:

```json
{
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": [{ "id": "...", "name": "Jane Doe", "...": "..." }],
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

Every "Success" example throughout this guide has been updated to show this actual shape.

**Error responses are unchanged.** Thrown exceptions (`NotFoundException`, `ForbiddenException`, validation failures, etc.) bypass interceptors entirely in NestJS — the envelope above only ever wraps the success path. Failure responses keep exactly the shapes they always had: `{"message": ..., "error": ..., "statusCode": ...}` — see [Common error shapes](#common-error-shapes) at the bottom for the full rundown.

## Authentication — read this first

Every endpoint in this API requires a JWT **except** the two marked "Public" below (`POST /auth/login`, `POST /auth/register`). This is enforced globally by `AuthGuard` (`apps/be/src/modules/auth/guard/auth.guard.ts`) — there's no per-route opt-in needed for protection; a route is only public if it's explicitly decorated `@Public()`.

To call a protected endpoint, add the token you got from login as a header:

```
Authorization: Bearer <access_token>
```

- Missing header, malformed header (not `Bearer <token>`), or an invalid/expired token → `401 Unauthorized`.
- The token expires (`expiresIn` configured in `app.module.ts`, currently `1h`) — log in again to get a new one once it expires.

### Role-based authorization (organization endpoints)

Some organization-scoped endpoints additionally require a **role**, enforced by a second global guard, `RolesGuard` (`apps/be/src/modules/auth/guard/roles.guard.ts`), applied via the `@Roles(...)` decorator (`apps/be/src/modules/auth/decorator/roles.decorator.ts`).

Important: a role is **not** part of the JWT. It's a property of the caller's `organization_members` row for the specific organization in the URL, so `RolesGuard` resolves it fresh on every request:

1. It reads the organization id from the route's **`:organizationId`** request param specifically (`request.params.organizationId`) — not just "whatever the first path param is". A route path whose organization segment is named anything else (e.g. `:id`) won't be picked up by this at all.
2. It reads the caller's user id from the JWT (`request.user.sub`).
3. It looks up that `(organizationId, userId)` pair in `organization_members` to get the caller's actual role (`OWNER` / `ADMIN` / `MEMBER`) for _that_ organization.
4. It checks that role against whatever `@Roles(...)` lists on the route.

Consequences:

- If a route has **no** `@Roles(...)` decorator, `RolesGuard` is a no-op — a valid JWT is the only requirement, even though the route is nested under `/organizations/:organizationId`. It does **not** independently verify the caller is even a member of that organization.
- If a route **does** have `@Roles(...)`, the caller must (a) be a member of that organization and (b) hold one of the listed roles, or the request fails with `403 Forbidden`.
- A route that carries `@Roles(...)` but has **no** `:organizationId` param at all (see the project-member endpoints below, which key off `:projectId` instead) would read `request.params.organizationId` as `undefined`, fail the membership lookup, and always 403. None of the project-member routes currently use `@Roles(...)`, so this hasn't bitten anyone yet — just don't copy `@Roles(...)` onto one of those routes without also exposing an `:organizationId` param.

Each endpoint below states whether it currently carries a `@Roles(...)` requirement.

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

**Success — `200 OK`:** message `"Login successful"`.

```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOi..."
  },
  "timestamp": "2026-09-22T10:28:39.297Z"
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

## `POST /auth/register`

**Public.** Creates (registers) a new user. Lives on `AuthController` (`apps/be/src/modules/auth/controller/auth.controller.ts`) now, not `UserController` — it was moved there but still calls the same `UserService.create`, so the request/response shape is unchanged, only the route moved (previously `POST /api/users`).

**Body (`CreateUserDto`):**

| Field      | Type   | Rules                                   |
| ---------- | ------ | --------------------------------------- |
| `name`     | string | required, non-empty                     |
| `email`    | string | required, must be a valid email         |
| `userName` | string | required, non-empty, **must be unique** |
| `location` | string | required                                |
| `password` | string | required, minimum 8 characters          |

Any field not in this list is rejected outright (`400 Bad Request`) — the API does not silently ignore unknown fields.

**Success — `201 Created`:** message `"User registered successfully"`. `data` is the created user, without the password:

```json
{
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "id": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "name": "Jane Doe",
    "loginCount": 0,
    "email": "jane@example.com",
    "location": "Dhaka",
    "userName": "janedoe",
    "createdAt": "2026-09-10T02:07:28.920Z"
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — validation errors (missing/invalid field), e.g. `{"message": ["email must be an email"], "error": "Bad Request", "statusCode": 400}`
- `409 Conflict` — `userName` is already taken.

**Example:**

```bash
curl -X POST http://localhost:3001/auth/register \
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

**Success — `201 Created`:** message `"API key created successfully"`. `data` is the raw key, returned **once** — only its bcrypt hash is stored, so save it now:

```json
{
  "statusCode": 201,
  "message": "API key created successfully",
  "data": {
    "apiKey": "sk-live_6928426a03c7d4160fc41631c4674183e36152daae7b7589f8d399f99a594307"
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
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

**Requires auth.** Revokes an API key belonging to the authenticated user (sets `revokedAt`). A revoked key is immediately rejected by `ApiKeyGuard` on any endpoint that uses it (e.g. `POST /webhook/response`, `POST /webhook/response/test`) — note `GET /api/users/:id` **no longer** uses `ApiKeyGuard` (see below); it now requires a JWT like everything else.

No body or params — the key to revoke is looked up **by `userId` alone**, not by key id. If a user has more than one key, this revokes whichever one the lookup happens to return first, not a specific one you choose. There's currently no way to target one key among several by id.

**Success — `200 OK`:** message `"API key revoked successfully"`, `data: null`.

```json
{
  "statusCode": 200,
  "message": "API key revoked successfully",
  "data": null,
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure — `404 Not Found`:** the user has no matching API key to revoke.

**Example:**

```bash
curl -X DELETE http://localhost:3001/api-key/delete \
  -H "Authorization: Bearer <token>"
```

---

## `GET /api-key/latest`

**Requires auth.** Returns metadata for the authenticated user's most recently created API key (by `createdAt`, regardless of whether it's since been revoked).

> ⚠️ **This does NOT return the usable key string.** Only `POST /api-key`'s response ever contains the raw `apiKey` value, and only once, at creation time. The database stores a one-way bcrypt hash of the key (`hashedKey`, never exposed by any endpoint) — there is no way to recover the original key string from it, by anyone, including this endpoint. If the raw key wasn't saved when it was generated, the only fix is to revoke it (`DELETE /api-key/delete`) and generate a new one (`POST /api-key`).

**Intended usage:** checking whether the user already has a key and its status — e.g. to render "Active key: `sk-live_6928426a...` (label: _my first key_), created Sep 14" in a UI, or to decide whether to show a "Generate key" vs. "Generate new key" button — not for retrieving a key to actually use in requests.

**Success — `200 OK`:** message `"Latest API key fetched successfully"`.

```json
{
  "statusCode": 200,
  "message": "Latest API key fetched successfully",
  "data": {
    "id": "3f9a2b10-...",
    "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "prefix": "sk-live_6928426a",
    "label": "my first key",
    "createdAt": "2026-09-14T02:07:28.920Z",
    "lastUpdatedAt": "2026-09-14T03:00:00.000Z",
    "revokedAt": null
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

`prefix` is the first 16 characters of the original key (enough to recognize it in a UI, not enough to authenticate with — `ApiKeyGuard` requires the full key). `revokedAt` is `null` while the key is active, or a timestamp once it's been revoked via `DELETE /api-key/delete`.

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `404 Not Found` — the user has never generated an API key.

**Example:**

```bash
curl http://localhost:3001/api-key/latest \
  -H "Authorization: Bearer <token>"
```

**Example:**

```bash
curl http://localhost:3001/api-key/latest \
  -H "Authorization: Bearer <token>"
```

---

## `GET /api/users`

**Requires auth.** Lists users, with optional search/filter via query params. No params returns every user.

| Query param  | Type   | Behavior                                                                  |
| ------------ | ------ | ------------------------------------------------------------------------- |
| `userName`   | string | **Search** — matches if `userName` _contains_ this text, case-insensitive |
| `loginCount` | number | **Filter** — matches users whose `loginCount` is _exactly_ this value     |

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

**Success — `200 OK`:** message `"Users fetched successfully"`. `data` is an array of users (password never included), e.g.:

```json
{
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": [
    {
      "id": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
      "name": "Jane Doe",
      "loginCount": 3,
      "email": "jane@example.com",
      "location": "Dhaka",
      "userName": "janedoe",
      "createdAt": "2026-09-10T02:07:28.920Z"
    }
  ],
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

An empty array `[]` for `data` (not an error) if nothing matches.

---

## `GET /api/users/:id`

**Requires auth (JWT).** Fetches a single user by their `id` (UUID). This used to be API-key-only (`@Public()` + `ApiKeyGuard`); both have been removed from the route, so it now falls under the global `AuthGuard` like every other non-public endpoint — send a bearer token, not an `x-api-key` header.

**Failure — `401 Unauthorized`:** missing header, malformed header, or an invalid/expired token. An `x-api-key` header alone is **no longer** accepted here.

**Example:**

```bash
curl http://localhost:3001/api/users/df7db73d-f047-44d5-9d51-62ec043bfe0e \
  -H "Authorization: Bearer <token>"
```

**Success — `200 OK`:** message `"User fetched successfully"`. `data` is the user object, or `null` if no user has that id (the endpoint doesn't 404 on a missing id):

```json
{
  "statusCode": 200,
  "message": "User fetched successfully",
  "data": {
    "id": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "name": "Jane Doe",
    "...": "..."
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

---

## `POST /api/organizations`

**Requires auth.** No `@Roles(...)` — any authenticated user may create an organization. Creates the organization and, in the same transaction, adds the caller as its first member with role `OWNER`.

**Body (`CreateOrganizationDto`):**

| Field  | Type   | Rules               |
| ------ | ------ | ------------------- |
| `name` | string | required, non-empty |

**Success — `201 Created`:** message `"Organization created successfully"`. `data` is the created organization, with `members` (and each member's `user`) loaded — `owner` is **not** loaded on this response:

```json
{
  "statusCode": 201,
  "message": "Organization created successfully",
  "data": {
    "id": "b1a2c3d4-...",
    "name": "Acme Inc",
    "ownerId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "isActive": true,
    "createdAt": "2026-09-16T02:07:28.920Z",
    "updatedAt": "2026-09-16T02:07:28.920Z",
    "members": [
      {
        "id": "3f9a2b10-...",
        "organizationId": "b1a2c3d4-...",
        "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
        "role": "OWNER",
        "joinedAt": "2026-09-16T02:07:28.920Z",
        "user": {
          "id": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
          "name": "Jane Doe",
          "loginCount": 3,
          "email": "jane@example.com",
          "location": "Dhaka",
          "userName": "janedoe",
          "createdAt": "2026-09-10T02:07:28.920Z"
        }
      }
    ]
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — missing/empty `name`, or an unknown field (rejected by the global `whitelist`/`forbidNonWhitelisted` validation pipe).
- `401 Unauthorized` — missing/invalid/expired bearer token.

**Example:**

```bash
curl -X POST http://localhost:3001/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Acme Inc"}'
```

---

## `GET /api/organizations`

**Requires auth.** No `@Roles(...)`. Lists organizations, but **only ones the caller owns** (`WHERE ownerId = <caller's id>`) — organizations where the caller is merely a `MEMBER` or `ADMIN` (not the `OWNER`) are **not** returned by this endpoint.

**Success — `200 OK`:** message `"Organizations fetched successfully"`. `data` is an array of organizations, each with `members` (and each member's `user`) and `owner` loaded, e.g.:

```json
{
  "statusCode": 200,
  "message": "Organizations fetched successfully",
  "data": [
    {
      "id": "b1a2c3d4-...",
      "name": "Acme Inc",
      "ownerId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
      "isActive": true,
      "createdAt": "2026-09-16T02:07:28.920Z",
      "updatedAt": "2026-09-16T02:07:28.920Z",
      "owner": {
        "id": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
        "name": "Jane Doe",
        "...": "..."
      },
      "members": [
        { "id": "3f9a2b10-...", "role": "OWNER", "user": { "...": "..." } }
      ]
    }
  ],
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

An empty array `[]` for `data` (not an error) if the caller doesn't own any organization.

**Example:**

```bash
curl http://localhost:3001/api/organizations \
  -H "Authorization: Bearer <token>"
```

---

## `GET /api/organizations/:id`

**Requires auth (JWT) only.** No `@Roles(...)` and no membership check of any kind — any authenticated user can fetch **any** organization by id, whether or not they belong to it, and the response includes its full member list.

**Success — `200 OK`:** message `"Organization fetched successfully"`. `data` is the organization with `members` (and each member's `user`) loaded, or `null` if no organization has that id (same no-404-on-missing-id pattern as `GET /api/users/:id`).

**Failure — `401 Unauthorized`:** missing/invalid/expired bearer token.

**Example:**

```bash
curl http://localhost:3001/api/organizations/b1a2c3d4-... \
  -H "Authorization: Bearer <token>"
```

---

## `PATCH /api/organizations/:id`

**Requires auth + role.** `@Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)` — the caller must be a member of organization `:id` with role `OWNER` or `ADMIN`.

**Body (`UpdateOrganizationDto`):**

| Field  | Type   | Rules               |
| ------ | ------ | ------------------- |
| `name` | string | required, non-empty |

There's only one updatable field today (`name`) and it's required, not optional, so a `PATCH` here behaves like a full replace of that field rather than a true partial update.

**Success — `200 OK`:** message `"Organization updated successfully"`. `data` is the updated organization row — note this is the bare entity from `preload()`/`save()`, **without** `members` or `owner` loaded (unlike the create/list/get-by-id responses above):

```json
{
  "statusCode": 200,
  "message": "Organization updated successfully",
  "data": {
    "id": "b1a2c3d4-...",
    "name": "Acme Incorporated",
    "ownerId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "isActive": true,
    "createdAt": "2026-09-16T02:07:28.920Z",
    "updatedAt": "2026-09-19T10:00:00.000Z"
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — missing/empty `name`, or an unknown field.
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of the organization, or is a member but only `MEMBER` role.
- `404 Not Found` — no organization with that id (`preload()` returns `undefined` for a missing id, which the service turns into `NotFoundException('Organization not found')`).

**Example:**

```bash
curl -X PATCH http://localhost:3001/api/organizations/b1a2c3d4-... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Acme Incorporated"}'
```

---

## `POST /api/organizations/:id/members`

**Requires auth + role.** `@Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)` — the caller must be a member of organization `:id` with role `OWNER` or `ADMIN` (this used to be commented out, allowing any authenticated user through; that's no longer the case). There is still no server-side check that `role` is one of `OWNER`/`ADMIN`/`MEMBER` (the DTO only validates it's a non-empty string), so an invalid role value will pass validation and only fail later at the database layer.

**Body (`OrganizationMemberCreateDto`):**

| Field    | Type   | Rules                                                                                                      |
| -------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `userId` | string | required, non-empty                                                                                        |
| `role`   | string | required, non-empty — should be one of `OWNER` / `ADMIN` / `MEMBER`, but this isn't enforced by validation |

**Success — `201 Created`:** message `"Organization member added successfully"`. `data` is the created membership row (no nested `user`/`organization` object):

```json
{
  "statusCode": 201,
  "message": "Organization member added successfully",
  "data": {
    "organizationId": "b1a2c3d4-...",
    "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "role": "MEMBER",
    "id": "3f9a2b10-...",
    "joinedAt": "2026-09-16T02:07:28.920Z"
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — missing/empty `userId` or `role`, or an unknown field.
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of the organization, or is a member but only holds `MEMBER` role.
- `409 Conflict` — that user is already a member of this organization.

**Example:**

```bash
curl -X POST http://localhost:3001/api/organizations/b1a2c3d4-.../members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e", "role": "MEMBER"}'
```

---

## `GET /api/organizations/:id/members`

**Requires auth (JWT) only.** No `@Roles(...)` and no membership check — any authenticated user can list any organization's members.

**Success — `200 OK`:** message `"Organization members fetched successfully"`. `data` is an array of membership rows with `user` loaded:

```json
{
  "statusCode": 200,
  "message": "Organization members fetched successfully",
  "data": [
    {
      "id": "3f9a2b10-...",
      "organizationId": "b1a2c3d4-...",
      "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
      "role": "OWNER",
      "joinedAt": "2026-09-16T02:07:28.920Z",
      "user": {
        "id": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
        "name": "Jane Doe",
        "loginCount": 3,
        "email": "jane@example.com",
        "location": "Dhaka",
        "userName": "janedoe",
        "createdAt": "2026-09-10T02:07:28.920Z"
      }
    }
  ],
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Example:**

```bash
curl http://localhost:3001/api/organizations/b1a2c3d4-.../members \
  -H "Authorization: Bearer <token>"
```

---

## `DELETE /api/organizations/:id/members/:userId`

**Requires auth + role.** `@Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)` — a caller whose own membership role in organization `:id` is `OWNER` or `ADMIN` can call this; a plain `MEMBER` is rejected with `403 Forbidden` by `RolesGuard` before the handler runs (this used to be `OWNER`-only — `ADMIN` was added since).

No body. `userId` in the path is the member being removed. The handler now blocks **self-removal** instead: if `userId` equals the caller's own id, it throws `403 Forbidden, "You can not delete yourself"` regardless of role — including for an `OWNER` trying to remove themselves. There's still no separate protection against an `ADMIN` removing the sole remaining `OWNER` (any other user id is fair game), and no ownership-transfer flow.

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of the organization, is only a `MEMBER`, or is targeting their own `userId`.
- `404 Not Found` — no member with that `userId` exists in this organization.

**Success — `200 OK`:** message `"Organization member removed successfully"`. `data` is a TypeORM delete result, not the deleted entity:

```json
{
  "statusCode": 200,
  "message": "Organization member removed successfully",
  "data": {
    "raw": [],
    "affected": 1
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/organizations/b1a2c3d4-.../members/df7db73d-f047-44d5-9d51-62ec043bfe0e \
  -H "Authorization: Bearer <token>"
```

---

## `DELETE /api/organizations/:id/members/:userId/leave`

**Requires auth + role.** `@Roles(OrganizationRole.ADMIN, OrganizationRole.MEMBER)` — the caller's own membership role in organization `:id` must be `ADMIN` or `MEMBER`; an `OWNER` calling this route is rejected with `403 Forbidden` by `RolesGuard` (there's currently no "leave as owner" or ownership-transfer flow).

> ⚠️ The handler (`leaveMemberFromOrganization`) now checks `:userId` against the caller for one of the two roles, but not both: if the caller's own role is `MEMBER` and `:userId` is **not** their own id, it throws `403 Forbidden, "You can't happening this action as member."` (typo included, verbatim from source) — so a plain `MEMBER` can only use this route on themselves. An `ADMIN` caller has no such check at all and can still remove **any** other member (including another `ADMIN`) through this route, not just themselves — that part of the original "leave" bug remains.

No body.

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of the organization, holds the `OWNER` role, or is a `MEMBER` targeting someone other than themselves.
- `404 Not Found` — no member with that `userId` exists in this organization.

**Success — `200 OK`:** message `"Left organization successfully"`. `data` is a TypeORM delete result, not the deleted entity:

```json
{
  "statusCode": 200,
  "message": "Left organization successfully",
  "data": {
    "raw": [],
    "affected": 1
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/organizations/b1a2c3d4-.../members/df7db73d-f047-44d5-9d51-62ec043bfe0e/leave \
  -H "Authorization: Bearer <token>"
```

---

## Projects

Note the route prefix here is singular **`organization`**, not `organizations` like the organization endpoints above — `/api/organization/:organizationId/project...`, not `/api/organizations/...`.

### `POST /api/organization/:organizationId/project`

**Requires auth + role.** `@Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)`. Creates the project and, in the same transaction, adds the caller as its first `project_members` row. No `role` is passed for that insert, so it takes the column default — `ProjectRole.LEAD` — regardless of the caller's organization role.

**Body (`craeteProjectDto`** — the class name is a typo in source for "create", kept as-is here since it's what you'll see in stack traces/Swagger):

| Field         | Type   | Rules               |
| ------------- | ------ | ------------------- |
| `name`        | string | required, non-empty |
| `description` | string | required, non-empty |
| `key`         | string | required, non-empty |

There's a DB-level `UNIQUE(organizationId, key)` constraint on `projects`, but the service doesn't catch a violation the way `UserService.create` catches a duplicate `userName` — a duplicate `key` within the same organization currently surfaces as an uncaught `QueryFailedError`, i.e. a raw **`500 Internal Server Error`**, not a clean `409 Conflict`.

**Success — `201 Created`:** message `"Project created successfully"`. `data` is the created project with `members` loaded, and each member's own `project` also loaded one level deep (so you'll see the project's scalar fields duplicated inside `members[].project`):

```json
{
  "statusCode": 201,
  "message": "Project created successfully",
  "data": {
    "id": "5c2b1f4a-...",
    "organizationId": "b1a2c3d4-...",
    "name": "Website Redesign",
    "key": "WEB",
    "description": "Revamp the marketing website",
    "status": "PLANNING",
    "createdBy": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "createdAt": "2026-09-19T02:07:28.920Z",
    "updatedAt": "2026-09-19T02:07:28.920Z",
    "deletedAt": null,
    "members": [
      {
        "id": "3f9a2b10-...",
        "projectId": "5c2b1f4a-...",
        "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
        "role": "LEAD",
        "addedAt": "2026-09-19T02:07:28.920Z",
        "project": {
          "id": "5c2b1f4a-...",
          "name": "Website Redesign",
          "...": "same project fields again"
        }
      }
    ]
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — missing/empty field, or an unknown field.
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of the organization, or is only a `MEMBER`.
- `500 Internal Server Error` — duplicate `key` within the organization (see above).

**Example:**

```bash
curl -X POST http://localhost:3001/api/organization/b1a2c3d4-.../project \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Website Redesign", "description": "Revamp the marketing website", "key": "WEB"}'
```

---

### `GET /api/organization/:organizationId/project`

**Requires auth + role.** `@Roles(OrganizationRole.OWNER)` — **`OWNER` only**, notably stricter than every other project/organization list-type endpoint above (`ADMIN` cannot list an organization's projects through this route).

**Success — `200 OK`:** message `"Projects fetched successfully"`. `data` is an array of projects with `members` loaded (no nested `project` on each member this time — just the member rows):

```json
{
  "statusCode": 200,
  "message": "Projects fetched successfully",
  "data": [
    {
      "id": "5c2b1f4a-...",
      "organizationId": "b1a2c3d4-...",
      "name": "Website Redesign",
      "key": "WEB",
      "description": "Revamp the marketing website",
      "status": "PLANNING",
      "createdBy": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
      "createdAt": "2026-09-19T02:07:28.920Z",
      "updatedAt": "2026-09-19T02:07:28.920Z",
      "deletedAt": null,
      "members": [
        { "id": "3f9a2b10-...", "role": "LEAD", "userId": "df7db73d-..." }
      ]
    }
  ],
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of the organization, or is a member but not the `OWNER`.

**Example:**

```bash
curl http://localhost:3001/api/organization/b1a2c3d4-.../project \
  -H "Authorization: Bearer <token>"
```

---

### `GET /api/organization/:organizationId/project/:id`

**Requires auth (JWT) only.** No `@Roles(...)` and no membership check — any authenticated user can fetch any project by id/organization pair, same pattern as `GET /api/organizations/:id`.

**Success — `200 OK`:** message `"Project fetched successfully"`. `data` is the project with `members` loaded, or `null` if no project matches that `(organizationId, id)` pair (no 404 on a missing id).

**Failure — `401 Unauthorized`:** missing/invalid/expired bearer token.

**Example:**

```bash
curl http://localhost:3001/api/organization/b1a2c3d4-.../project/5c2b1f4a-... \
  -H "Authorization: Bearer <token>"
```

---

### `PATCH /api/organization/:organizationId/project/:id`

**Requires auth + role.** `@Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)`.

**Body (`UpdateProjectDto`, all fields optional):**

| Field         | Type   | Rules                                                                                               |
| ------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `name`        | string | optional                                                                                            |
| `description` | string | optional                                                                                            |
| `key`         | string | optional                                                                                            |
| `status`      | string | optional, must be one of `PLANNING` / `ACTIVE` / `ON_HOLD` / `COMPLETED` / `ARCHIVED` / `CANCELLED` |

> ⚠️ The service builds the update via `projectRepository.preload({ organizationId, id, ...data })`. TypeORM's `preload()` only looks the entity up **by primary key (`id`)** — it does not filter by `organizationId`. That means:
>
> - The `:organizationId` in the URL is **not actually verified as the project's real organization** before the update runs; the `RolesGuard` check only confirms the _caller_ holds `OWNER`/`ADMIN` in _that_ organization, not that the target project belongs to it.
> - Whatever `organizationId` you pass gets merged into the entity and saved — so calling this with a project `id` that belongs to a _different_ organization silently **reassigns that project** to the organization in the URL, as long as you hold `OWNER`/`ADMIN` there. This is a real cross-tenant issue, not just a cosmetic one — worth fixing (scope the lookup with a `findOne({ where: { organizationId, id } })` first, the way `getProjectByIdInOrganization` and `deleteIndividualProject` already do) before relying on this route in anything multi-tenant-sensitive.

**Success — `200 OK`:** message `"Project updated successfully"`. `data` is the updated project row — bare entity from `preload()`/`save()`, **without** `members` loaded.

**Failure:**

- `400 Bad Request` — invalid field value (e.g. `status` not in the enum), or an unknown field.
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of the organization in the URL, or is only a `MEMBER` there.
- `404 Not Found` — no project with that `id` exists at all (checked by primary key only, per the caveat above).

**Example:**

```bash
curl -X PATCH http://localhost:3001/api/organization/b1a2c3d4-.../project/5c2b1f4a-... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "ACTIVE"}'
```

---

### `DELETE /api/organization/:organizationId/project/:id`

**Requires auth + role, plus a project-level check.** `@Roles(OrganizationRole.OWNER)` gates the route at the organization level — **`OWNER` only**. On top of that, the service (`deleteIndividualProject`) now runs in a transaction and separately looks up the caller's own `project_members` row for _this specific project_ (`{ projectId: id, userId: user.sub }`); the delete only proceeds if that row's `role` is `ProjectRole.LEAD`, otherwise it throws `403 Forbidden`. This check is scoped per-project — being `LEAD` on some other project no longer counts (an earlier version of this check queried by `userId` alone, so `LEAD` on _any_ project was enough to delete _any other_ project; that cross-project bug is fixed).

No body. The delete itself runs via `manager.delete(Project, { organizationId, id })` inside the same transaction, scoped to `{ organizationId, id }` (properly scoped, unlike the `PATCH` above). Unlike before, the handler no longer returns the TypeORM delete result at all — there's still no `404 Not Found` to distinguish "deleted" from "nothing matched," but now that ambiguity is silent rather than surfaced via `affected`.

**Success — `200 OK`:** message `"Project deleted successfully"`, `data: null`.

```json
{
  "statusCode": 200,
  "message": "Project deleted successfully",
  "data": null,
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of the organization, is a member but not the `OWNER`, or (new) does not hold `LEAD` in this project's `project_members` (including when the caller has no membership row on the project at all).

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/organization/b1a2c3d4-.../project/5c2b1f4a-... \
  -H "Authorization: Bearer <token>"
```

---

## Project Members

Route prefix is singular here too — `/api/project/:projectId/member...`. None of these three routes currently carry `@Roles(...)` (it's commented out in source on the `POST`, and simply absent on the other two), and — per the [Role-based authorization](#role-based-authorization-organization-endpoints) note above — these routes have no `:organizationId` param to key off of even if `@Roles(...)` were added as-is. So today, **any authenticated user can add or change the role of a member on any project**, regardless of organization or project membership. The one exception is `DELETE` below, which now enforces a project-level check by hand (not via `@Roles`/`RolesGuard`): only a caller who is the target project's `LEAD` can remove a member.

### `POST /api/project/:projectId/member`

**Requires auth (JWT) only.**

**Body (`ProjectMemberAddDto`):**

| Field    | Type   | Rules                                                                                                                                                     |
| -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userId` | string | required, non-empty                                                                                                                                       |
| `role`   | string | required, non-empty — should be one of `LEAD` / `CONTRIBUTOR` / `VIEWER`, but (like `OrganizationMemberCreateDto.role`) this isn't enforced by validation |

There's a DB-level `UNIQUE(projectId, userId)` constraint, but — unlike `OrganizationMemberService.createOrganizationMember`, which pre-checks and throws a clean `409` — this service doesn't check for an existing membership first. Adding a user who's already on the project surfaces as an uncaught `QueryFailedError`, i.e. a raw **`500 Internal Server Error`**.

**Success — `201 Created`:** message `"Project member added successfully"`. `data` is the created membership row:

```json
{
  "statusCode": 201,
  "message": "Project member added successfully",
  "data": {
    "projectId": "5c2b1f4a-...",
    "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "role": "CONTRIBUTOR",
    "id": "7a1e9c22-...",
    "addedAt": "2026-09-19T02:07:28.920Z"
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — missing/empty `userId` or `role`, or an unknown field.
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `500 Internal Server Error` — that user is already a member of this project (see above).

**Example:**

```bash
curl -X POST http://localhost:3001/api/project/5c2b1f4a-.../member \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e", "role": "CONTRIBUTOR"}'
```

---

### `DELETE /api/project/:projectId/member/:userId`

**Requires auth (JWT), plus a project-level check.** No `@Roles(...)` (there's no `:organizationId` param here to key one off), but the service (`removeProjectMember`) now looks up the caller's own `project_members` row for `:projectId` first — if it doesn't exist or its `role` isn't `ProjectRole.LEAD`, the request is rejected with `403 Forbidden` before anything is deleted. Only the project's `LEAD` can remove members through this route.

No body. Deletes scoped to `{ projectId, userId }` and, unlike the project `DELETE` above, does check `result.affected`.

**Success — `200 OK`:** message `"Project member removed successfully"`, `data: null`.

```json
{
  "statusCode": 200,
  "message": "Project member removed successfully",
  "data": null,
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller has no `project_members` row on `:projectId`, or holds a role other than `LEAD` there.
- `404 Not Found` — no member with that `userId` exists on this project.

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/project/5c2b1f4a-.../member/df7db73d-f047-44d5-9d51-62ec043bfe0e \
  -H "Authorization: Bearer <token>"
```

---

### `PATCH /api/project/:projectId/member/:userId`

**Requires auth (JWT) only.**

**Body (`ProjectMemberUpdateDto`):**

| Field  | Type   | Rules                                                                                                                              |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `role` | string | required, must be one of `LEAD` / `CONTRIBUTOR` / `VIEWER` (this one **is** enforced with `@IsEnum`, unlike the `POST` body above) |

**Success — `200 OK`:** message `"Project member role updated successfully"`. `data` is the updated membership row:

```json
{
  "statusCode": 200,
  "message": "Project member role updated successfully",
  "data": {
    "id": "7a1e9c22-...",
    "projectId": "5c2b1f4a-...",
    "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "role": "LEAD",
    "addedAt": "2026-09-19T02:07:28.920Z"
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — missing `role`, an invalid enum value, or an unknown field.
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `404 Not Found` — no member with that `userId` exists on this project.

**Example:**

```bash
curl -X PATCH http://localhost:3001/api/project/5c2b1f4a-.../member/df7db73d-f047-44d5-9d51-62ec043bfe0e \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"role": "LEAD"}'
```

---

## Sprints

Route prefix is `/api/project/:projectId/sprint...`, same style as the project-member routes above — no `:organizationId` param, so none of these routes carry `@Roles(...)` (see the [Role-based authorization](#role-based-authorization-organization-endpoints) note). Instead, every route does its own manual check in `SprintService`, keyed off the caller's `project_members` row for `:projectId`:

- The caller must have a `project_members` row for `:projectId` at all, or every route below responds `403 Forbidden, "You are not a member of this project"`.
- `POST` and `PUT` additionally require the caller's role on that row to be `LEAD` or `CONTRIBUTOR` (`VIEWER` is read-only) — otherwise `403 Forbidden`.
- `DELETE` additionally requires `LEAD` specifically — `CONTRIBUTOR` can create/update sprints but not delete them.
- `GET` (both routes) only requires membership — any role, including `VIEWER`, can read.

Unlike `PATCH /api/organization/:organizationId/project/:id` above, the single-sprint routes (`GET`/`PUT`/`DELETE .../sprint/:sprintId`) are properly scoped to `{ id: sprintId, projectId }`, not looked up by `id` alone — a `sprintId` that belongs to a different project 404s instead of leaking across projects.

### `POST /api/project/:projectId/sprint`

**Requires auth + project membership** (`LEAD` or `CONTRIBUTOR` on `:projectId`, per above).

**Body (`CreateSprintDto`):**

| Field       | Type   | Rules                                                                                                                            |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `name`      | string | required, non-empty                                                                                                              |
| `startDate` | string | required, ISO 8601 date string (`@IsDateString`)                                                                                 |
| `endDate`   | string | required, ISO 8601 date string (`@IsDateString`)                                                                                 |
| `status`    | string | optional, one of `PLANNED` / `ACTIVE` / `COMPLETED` / `CANCELLED` — defaults to `PLANNED` (the entity column default) if omitted |

`startDate` must not be after `endDate`, or the request fails with `400 Bad Request, "startDate must be before endDate"` — checked in the service, not via a DTO validator.

**Success — `201 Created`:** message `"Sprint created successfully"`. `data` is the created sprint row:

```json
{
  "statusCode": 201,
  "message": "Sprint created successfully",
  "data": {
    "name": "Sprint 1",
    "startDate": "2026-01-05T00:00:00.000Z",
    "endDate": "2026-01-19T00:00:00.000Z",
    "projectId": "5c2b1f4a-...",
    "id": "9e1f7c3a-...",
    "status": "PLANNED"
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — missing/empty `name`, an invalid `startDate`/`endDate`/`status`, `startDate` after `endDate`, or an unknown field.
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`, or is a member but only `VIEWER`.

**Example:**

```bash
curl -X POST http://localhost:3001/api/project/5c2b1f4a-.../sprint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Sprint 1", "startDate": "2026-01-05T00:00:00.000Z", "endDate": "2026-01-19T00:00:00.000Z"}'
```

---

### `GET /api/project/:projectId/sprint`

**Requires auth + project membership** (any role).

**Success — `200 OK`:** message `"Sprints fetched successfully"`. `data` is an array of every sprint on the project:

```json
{
  "statusCode": 200,
  "message": "Sprints fetched successfully",
  "data": [
    {
      "id": "9e1f7c3a-...",
      "projectId": "5c2b1f4a-...",
      "name": "Sprint 1",
      "startDate": "2026-01-05T00:00:00.000Z",
      "endDate": "2026-01-19T00:00:00.000Z",
      "status": "PLANNED"
    }
  ],
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`.

**Example:**

```bash
curl http://localhost:3001/api/project/5c2b1f4a-.../sprint \
  -H "Authorization: Bearer <token>"
```

---

### `GET /api/project/:projectId/sprint/:sprintId`

**Requires auth + project membership** (any role).

**Success — `200 OK`:** message `"Sprint fetched successfully"`. `data` is the sprint row (same shape as one entry in the list endpoint above).

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`.
- `404 Not Found` — no sprint with that `sprintId` exists on `:projectId` (including one that exists but belongs to a different project).

**Example:**

```bash
curl http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-... \
  -H "Authorization: Bearer <token>"
```

---

### `PUT /api/project/:projectId/sprint/:sprintId`

**Requires auth + project membership** (`LEAD` or `CONTRIBUTOR` on `:projectId`, per above).

**Body (`UpdateSprintDto`, all fields optional):**

| Field       | Type   | Rules                                                             |
| ----------- | ------ | ----------------------------------------------------------------- |
| `name`      | string | optional                                                          |
| `startDate` | string | optional, ISO 8601 date string (`@IsDateString`)                  |
| `endDate`   | string | optional, ISO 8601 date string (`@IsDateString`)                  |
| `status`    | string | optional, one of `PLANNED` / `ACTIVE` / `COMPLETED` / `CANCELLED` |

Fields are merged onto the existing sprint (`Object.assign`), then the same `startDate <= endDate` check runs against the merged result — so sending only `endDate` can still 400 if it now falls before the sprint's existing `startDate`.

**Success — `200 OK`:** message `"Sprint updated successfully"`. `data` is the updated sprint row.

**Failure:**

- `400 Bad Request` — invalid `startDate`/`endDate`/`status`, the merged `startDate` after `endDate`, or an unknown field.
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`, or is a member but only `VIEWER`.
- `404 Not Found` — no sprint with that `sprintId` exists on `:projectId`.

**Example:**

```bash
curl -X PUT http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "ACTIVE"}'
```

---

### `DELETE /api/project/:projectId/sprint/:sprintId`

**Requires auth + project membership** — `LEAD` specifically (per above; `CONTRIBUTOR` cannot delete).

No body.

**Success — `200 OK`:** message `"Sprint deleted successfully"`, `data: null`.

```json
{
  "statusCode": 200,
  "message": "Sprint deleted successfully",
  "data": null,
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`, or is a member but not `LEAD`.
- `404 Not Found` — no sprint with that `sprintId` exists on `:projectId`.

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-... \
  -H "Authorization: Bearer <token>"
```

---

## Tickets

Route prefix is `/api/project/:projectId/sprint/:sprintId/ticket...` — **tickets always belong to a sprint**, not directly to a project. There is no backlog concept: a ticket cannot be created without a `sprintId`, and the DB foreign key is `ON DELETE CASCADE`, so deleting a sprint deletes every ticket inside it.

No `@Roles(...)` on any of these routes (no `:organizationId` param to key one off, same as Project Members/Sprints above). Every route does its own manual check in `TicketService`, keyed off the caller's `project_members` row for `:projectId`:

- The caller must have a `project_members` row for `:projectId` at all, or every route below responds `403 Forbidden, "You are not a member of this project"`.
- `POST`, `PUT`, and `DELETE` additionally require the caller's role on that row to be `LEAD` or `CONTRIBUTOR` (`VIEWER` is read-only) — otherwise `403 Forbidden, "Only the project LEAD or CONTRIBUTOR can <create|update|delete> tickets"`. Unlike sprints, ticket deletion is **not** `LEAD`-only — `CONTRIBUTOR` can delete tickets too.
- `GET` (both routes) only requires membership — any role, including `VIEWER`, can read.
- On every route, `:sprintId` is additionally verified to belong to `:projectId` (`404 Not Found, "Sprint not found in this project"` otherwise) — you can't operate on a sprint from a different project just because you know its id.

All single-ticket routes (`GET`/`PUT`/`DELETE .../ticket/:ticketId`) are scoped to `{ id: ticketId, projectId, sprintId }`, not just `id` — a `ticketId` that exists but under a different sprint (even within the same project) 404s instead of leaking across sprints.

### `POST /api/project/:projectId/sprint/:sprintId/ticket`

**Requires auth + project membership** (`LEAD` or `CONTRIBUTOR` on `:projectId`, per above).

**Body (`CreateTicketDto`):**

| Field         | Type   | Rules                                                                                                                 |
| ------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| `title`       | string | required, non-empty                                                                                                   |
| `description` | string | required, non-empty                                                                                                   |
| `status`      | string | optional, one of `TODO` / `IN_PROGRESS` / `IN_REVIEW` / `DONE` / `CANCELLED` / `HOLD` — defaults to `TODO` if omitted |
| `priority`    | string | optional, one of `LOW` / `MEDIUM` / `HIGH` / `URGENT` — defaults to `LOW` if omitted                                  |
| `metaData`    | object | optional, free-form JSON object, e.g. `{"browser": "Chrome", "os": "macOS", "environment": "staging"}`                |

`sprintId` is **not** a body field — it's taken from the URL. `createdBy` and `assigneeId` are also not body fields (sending them is rejected — see below); both are set server-side from the caller's JWT, and **the creator is automatically the initial assignee** (`createdBy === assigneeId` at creation time). Reassigning to someone else is only possible afterward, via `PUT .../ticket/:ticketId`.

**Success — `201 Created`:** message `"Ticket created successfully"`.

```json
{
  "statusCode": 201,
  "message": "Ticket created successfully",
  "data": {
    "title": "Fix login redirect loop",
    "description": "Users get bounced back to /login after SSO",
    "status": "TODO",
    "priority": "LOW",
    "metaData": {
      "browser": "Chrome",
      "os": "macOS",
      "environment": "staging"
    },
    "projectId": "5c2b1f4a-...",
    "sprintId": "9e1f7c3a-...",
    "createdBy": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "assigneeId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "id": "c7de719b-ed89-4396-9483-287e1c0e06f3",
    "createdAt": "2026-09-21T10:14:04.131Z",
    "updatedAt": "2026-09-21T10:14:04.131Z",
    "deletedAt": null
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — missing/empty `title`/`description`, an invalid `status`/`priority`, or an unknown field (including `sprintId`, `createdBy`, or `assigneeId` in the body — the global `whitelist`/`forbidNonWhitelisted` pipe rejects them outright).
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`, or is a member but only `VIEWER`.
- `404 Not Found` — `:sprintId` doesn't belong to `:projectId`.

**Example:**

```bash
curl -X POST http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Fix login redirect loop", "description": "Users get bounced back to /login after SSO", "metaData": {"browser": "Chrome", "os": "macOS", "environment": "staging"}}'
```

---

### `GET /api/project/:projectId/sprint/:sprintId/ticket`

**Requires auth + project membership** (any role).

**Success — `200 OK`:** message `"Tickets fetched successfully"`. `data` is an array of every ticket currently in that sprint (each shaped like the create response's `data`). An empty array `[]` for `data` if the sprint has none. A ticket that was moved to a different sprint via `PUT` (see below) will no longer show up here.

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`.
- `404 Not Found` — `:sprintId` doesn't belong to `:projectId`.

**Example:**

```bash
curl http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket \
  -H "Authorization: Bearer <token>"
```

---

### `GET /api/project/:projectId/sprint/:sprintId/ticket/:ticketId`

**Requires auth + project membership** (any role).

**Success — `200 OK`:** message `"Ticket fetched successfully"`. `data` is the ticket row (same shape as the create response's `data`).

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`.
- `404 Not Found` — no ticket with that `ticketId` exists on `:sprintId`/`:projectId` (including a ticket that exists but currently belongs to a different sprint).

**Example:**

```bash
curl http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket/c7de719b-... \
  -H "Authorization: Bearer <token>"
```

---

### `PUT /api/project/:projectId/sprint/:sprintId/ticket/:ticketId`

**Requires auth + project membership** (`LEAD` or `CONTRIBUTOR` on `:projectId`, per above). The ticket is looked up under the sprint in the URL, so `:sprintId` here means "the sprint the ticket currently belongs to," not necessarily where it ends up.

**Body (`UpdateTicketDto`, all fields optional):**

| Field         | Type   | Rules                                                                                                                                                     |
| ------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | string | optional                                                                                                                                                  |
| `description` | string | optional                                                                                                                                                  |
| `sprintId`    | string | optional, UUID — **moves the ticket to a different sprint** in the same project (validated the same way as `POST`; a sprint id from another project 404s) |
| `status`      | string | optional, one of `TODO` / `IN_PROGRESS` / `IN_REVIEW` / `DONE` / `CANCELLED` / `HOLD`                                                                     |
| `priority`    | string | optional, one of `LOW` / `MEDIUM` / `HIGH` / `URGENT`                                                                                                     |
| `assigneeId`  | string | optional, UUID — **this is the only way to reassign a ticket** after creation                                                                             |
| `metaData`    | object | optional, free-form JSON object                                                                                                                           |

Only fields actually present in the request body are applied — omitted fields keep their current value (fields not sent are filtered out before merging, precisely to avoid blanking columns the caller didn't intend to touch).

**Success — `200 OK`:** message `"Ticket updated successfully"`. `data` is the updated ticket row. If `sprintId` was changed, subsequent `GET`s must use the _new_ `:sprintId` in the URL — the old sprint's list/get routes will 404 for this ticket.

```json
{
  "statusCode": 200,
  "message": "Ticket updated successfully",
  "data": {
    "id": "c7de719b-ed89-4396-9483-287e1c0e06f3",
    "projectId": "5c2b1f4a-...",
    "sprintId": "9e1f7c3a-...",
    "title": "Fix login redirect loop",
    "description": "Users get bounced back to /login after SSO",
    "status": "IN_PROGRESS",
    "priority": "LOW",
    "metaData": {
      "browser": "Chrome",
      "os": "macOS",
      "environment": "staging"
    },
    "createdBy": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "assigneeId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "createdAt": "2026-09-21T10:14:04.131Z",
    "updatedAt": "2026-09-21T10:14:23.609Z",
    "deletedAt": null
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — invalid `status`/`priority`, a non-UUID `sprintId`/`assigneeId`, or an unknown field (`createdBy` is still not settable here).
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`, or is a member but only `VIEWER`.
- `404 Not Found` — no ticket with that `ticketId` on `:sprintId`/`:projectId`, `:sprintId` doesn't belong to `:projectId`, or (if moving) the new `sprintId` doesn't belong to `:projectId`.

**Example:**

```bash
# Change status and reassign
curl -X PUT http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket/c7de719b-... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"status": "IN_PROGRESS", "assigneeId": "df7db73d-f047-44d5-9d51-62ec043bfe0e"}'

# Move to a different sprint
curl -X PUT http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket/c7de719b-... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"sprintId": "a1b2c3d4-..."}'
```

---

### `DELETE /api/project/:projectId/sprint/:sprintId/ticket/:ticketId`

**Requires auth + project membership** (`LEAD` or `CONTRIBUTOR` on `:projectId` — not `LEAD`-only, unlike sprint deletion).

No body.

**Success — `200 OK`:** message `"Ticket deleted successfully"`, `data: null`.

```json
{
  "statusCode": 200,
  "message": "Ticket deleted successfully",
  "data": null,
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`, or is a member but only `VIEWER`.
- `404 Not Found` — no ticket with that `ticketId` exists on `:sprintId`/`:projectId`.

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket/c7de719b-... \
  -H "Authorization: Bearer <token>"
```

---

## Comments

Route prefix is `/api/project/:projectId/sprint/:sprintId/ticket/:ticketId/comment...` — comments belong to a ticket, one level deeper than tickets themselves. The DB foreign key from `comments` to `tickets` is `ON DELETE CASCADE`, so deleting a ticket deletes its comments.

No `@Roles(...)` on any of these routes (no `:organizationId` param to key one off). `CommentService` does its own manual checks, and unlike Sprints/Tickets, **write access here is author-based, not project-role-based**:

- The caller must have a `project_members` row for `:projectId` at all, or every route below responds `403 Forbidden, "You are not a member of this project"`.
- `POST` and both `GET`s only require membership — **any role, including `VIEWER`, can post and read comments** (commenting is collaborative, not a management action, unlike creating/editing a ticket).
- `PUT` and `DELETE` additionally require the caller to be the comment's own author (`comment.userId === caller`) — `403 Forbidden` otherwise, regardless of the caller's project role. A project `LEAD` cannot edit or delete another member's comment through these routes; there's no moderator override.
- On every route, `:ticketId` is additionally verified to belong to `{ :projectId, :sprintId }` (`404 Not Found, "Ticket not found"` otherwise) — same pattern as tickets verifying their sprint.

Single-comment routes (`GET`/`PUT`/`DELETE .../comment/:commentId`) are scoped to `{ id: commentId, ticketId }` — a `commentId` that exists but on a different ticket 404s instead of leaking across tickets.

### `POST /api/project/:projectId/sprint/:sprintId/ticket/:ticketId/comment`

**Requires auth + project membership** (any role).

**Body (`CreateCommentDto`):**

| Field     | Type   | Rules               |
| --------- | ------ | ------------------- |
| `comment` | string | required, non-empty |

`userId` is not a body field — it's taken from the caller's JWT, the same way `createdBy`/`assigneeId` are on ticket creation.

**Success — `201 Created`:** message `"Comment created successfully"`.

```json
{
  "statusCode": 201,
  "message": "Comment created successfully",
  "data": {
    "comment": "Reproduced this on staging too.",
    "ticketId": "c7de719b-ed89-4396-9483-287e1c0e06f3",
    "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "id": "2ba7107c-2685-451a-ad2d-89e875758907",
    "createdAt": "2026-09-21T11:57:19.590Z",
    "updatedAt": "2026-09-21T11:57:19.590Z"
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `400 Bad Request` — missing/empty `comment`, or an unknown field (e.g. `userId` in the body is rejected outright by the global `whitelist`/`forbidNonWhitelisted` pipe).
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`.
- `404 Not Found` — `:ticketId` doesn't belong to `{ :projectId, :sprintId }`.

**Example:**

```bash
curl -X POST http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket/c7de719b-.../comment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"comment": "Reproduced this on staging too."}'
```

---

### `GET /api/project/:projectId/sprint/:sprintId/ticket/:ticketId/comment`

**Requires auth + project membership** (any role).

**Success — `200 OK`:** message `"Comments fetched successfully"`. `data` is an array of every comment on that ticket, oldest first (`ORDER BY created_at ASC`, so it reads top-to-bottom like a discussion thread). An empty array `[]` for `data` if there are none.

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`.
- `404 Not Found` — `:ticketId` doesn't belong to `{ :projectId, :sprintId }`.

**Example:**

```bash
curl http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket/c7de719b-.../comment \
  -H "Authorization: Bearer <token>"
```

---

### `GET /api/project/:projectId/sprint/:sprintId/ticket/:ticketId/comment/:commentId`

**Requires auth + project membership** (any role).

**Success — `200 OK`:** message `"Comment fetched successfully"`. `data` is the comment row (same shape as the create response's `data`).

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`.
- `404 Not Found` — `:ticketId` doesn't belong to `{ :projectId, :sprintId }`, or no comment with that `commentId` exists on this ticket.

**Example:**

```bash
curl http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket/c7de719b-.../comment/2ba7107c-... \
  -H "Authorization: Bearer <token>"
```

---

### `PUT /api/project/:projectId/sprint/:sprintId/ticket/:ticketId/comment/:commentId`

**Requires auth + comment authorship.** Project membership alone is not enough — the caller must be this comment's own `userId`, checked in `CommentService` (not `RolesGuard`).

**Body (`UpdateCommentDto`):**

| Field     | Type   | Rules               |
| --------- | ------ | ------------------- |
| `comment` | string | required, non-empty |

**Success — `200 OK`:** message `"Comment updated successfully"`. `data` is the updated comment row.

**Failure:**

- `400 Bad Request` — missing/empty `comment`, or an unknown field.
- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`, or is a member but not this comment's author (`"Only the comment author can update this comment"`).
- `404 Not Found` — `:ticketId` doesn't belong to `{ :projectId, :sprintId }`, or no comment with that `commentId` exists on this ticket.

**Example:**

```bash
curl -X PUT http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket/c7de719b-.../comment/2ba7107c-... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"comment": "Updated comment text"}'
```

---

### `DELETE /api/project/:projectId/sprint/:sprintId/ticket/:ticketId/comment/:commentId`

**Requires auth + comment authorship** (same rule as `PUT` — the caller must be this comment's author, not just any project member, and not even the project `LEAD`).

No body.

**Success — `200 OK`:** message `"Comment deleted successfully"`, `data: null`.

```json
{
  "statusCode": 200,
  "message": "Comment deleted successfully",
  "data": null,
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

**Failure:**

- `401 Unauthorized` — missing/invalid/expired bearer token.
- `403 Forbidden` — caller is not a member of `:projectId`, or is a member but not this comment's author (`"Only the comment author can delete this comment"`).
- `404 Not Found` — `:ticketId` doesn't belong to `{ :projectId, :sprintId }`, or no comment with that `commentId` exists on this ticket.

**Example:**

```bash
curl -X DELETE http://localhost:3001/api/project/5c2b1f4a-.../sprint/9e1f7c3a-.../ticket/c7de719b-.../comment/2ba7107c-... \
  -H "Authorization: Bearer <token>"
```

---

## `POST /webhook/response`

**API key only** — same auth model as `GET /api/users/:id`: excluded from the global `AuthGuard`, protected instead by `ApiKeyGuard` via an `x-api-key` header (get one from `POST /api-key`). No JWT accepted.

Intended as a webhook target (e.g. a survey platform posting responses back to you). The `userId` stored on the record is **not** taken from the body — it's resolved from whichever API key made the request.

> ⚠️ **Breaking change for external callers:** this route now goes through the same global [response envelope](#response-envelope) as every other endpoint, so the old bare `{"status": "ok"}` body is gone — `status` now lives at `data.status`. If an external system (e.g. a survey platform) parses this response and reads `body.status` directly, it will break until it's updated to read `body.data.status` instead.

**Body:** any JSON object — it's stored as-is, no schema validation:

```json
{
  "surveyId": "abc123",
  "answers": { "q1": "yes", "q2": 5 }
}
```

**Success — `201 Created`:** message `"Webhook received successfully"`.

```json
{
  "statusCode": 201,
  "message": "Webhook received successfully",
  "data": { "status": "ok" },
  "timestamp": "2026-09-22T10:28:39.207Z"
}
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

> ⚠️ Same breaking change as `POST /webhook/response` above — `status`, `userId`, and `responseData` now live under `data`, not at the top level.

**Success — `201 Created`:** message `"Webhook test received successfully"`.

```json
{
  "statusCode": 201,
  "message": "Webhook test received successfully",
  "data": {
    "status": "ok",
    "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
    "responseData": { "surveyId": "abc123", "answers": { "q1": "yes" } }
  },
  "timestamp": "2026-09-22T10:28:39.207Z"
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

| Query param | Type   | Behavior                                               |
| ----------- | ------ | ------------------------------------------------------ |
| `userId`    | string | Filter — only responses whose `userId` matches exactly |

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

**Success — `200 OK`:** message `"Survey responses fetched successfully"`. `data` is an array of survey response records, e.g.:

```json
{
  "statusCode": 200,
  "message": "Survey responses fetched successfully",
  "data": [
    {
      "id": "3f9a2b10-...",
      "userId": "df7db73d-f047-44d5-9d51-62ec043bfe0e",
      "responseData": { "surveyId": "abc123", "answers": { "q1": "yes" } },
      "createdAt": "2026-09-14T02:07:28.920Z"
    }
  ],
  "timestamp": "2026-09-22T10:28:39.207Z"
}
```

An empty array `[]` for `data` (not an error) if nothing matches.

---

## Common error shapes

These are for **error** responses only (anything a thrown exception produces) and are unaffected by the [response envelope](#response-envelope) above, which only ever wraps successful responses.

| Status | When                                                                                                                                                                                          | Example body                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `400`  | Validation failed, or an unknown/extra field was sent                                                                                                                                         | `{"message": ["loginCount must be an integer number"], "error": "Bad Request", "statusCode": 400}` |
| `401`  | No token, bad token format, expired/invalid token, or wrong login credentials                                                                                                                 | `{"message": "Unauthorized", "statusCode": 401}`                                                   |
| `403`  | Valid token, but caller lacks the required organization role (see [Role-based authorization](#role-based-authorization-organization-endpoints)), or isn't a member of the organization at all | `{"message": "Only Owner can delete", "error": "Forbidden", "statusCode": 403}`                    |
| `409`  | Duplicate `userName` on registration, or user already a member of an organization                                                                                                             | `{"message": "userName is already taken", "statusCode": 409}`                                      |
| `500`  | Unexpected server error                                                                                                                                                                       | `{"statusCode": 500, "message": "Internal server error"}`                                          |
