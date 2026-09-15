# Review: `organizations` & `organization_members` modules

**Scope:** `src/modules/organizations/*`, `src/modules/organization_members/*`
**Verdict:** Not yet standard. The individual pieces (entities, migration, DTOs) are reasonable, but the module boundary between the two features is broken, there's no authorization on multi-tenant data, and the API surface doesn't follow REST conventions used elsewhere in this codebase. Details and fixes below.

---

## 1. What's already good

- Migration-based schema (no `synchronize: true`), matches the rest of the repo.
- `organization_members` has indexes on `organization_id` and `user_id` (`@Index()`), and FKs have sensible `onDelete` behavior (`CASCADE` for members, `RESTRICT` for the org owner).
- `OrganizationService.createOrganization` wraps the org insert + member insert in a single `dataSource.transaction(...)` — correct, avoids an org with zero members if the second insert fails.
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` and `ClassSerializerInterceptor` are set up in `main.ts`, and `User.password` is `@Exclude()` + `select: false`, so nested `user` objects returned via relations won't leak passwords.

---

## 2. Critical: broken module boundary (`organization_members` service is unusable)

`OrganizationMembersModule` declares `OrganizationMemberService` as a provider but never exports it:

```ts
// organization_member.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember])],
  controllers: [OrganizationMemberController],
  providers: [OrganizationMemberService],   // not in `exports`
})
export class OrganizationMembersModule {}
```

Because of that, `OrganizationsModule` — which imports `OrganizationMembersModule` — **cannot inject `OrganizationMemberService`**. That's why `OrganizationService.createOrganization` reaches past the module boundary and writes to the `OrganizationMember` entity directly via the raw `manager`:

```ts
// organization.service.ts
await manager.save(OrganizationMember, {
  organizationId: savedOrganization.id,
  userId: ownerId,
});
```

This means there are now **two independent code paths that create membership rows** with two different levels of validation and no shared logic:

| Path | Validates input? | Checks duplicate membership? | Checks org/user exist? |
|---|---|---|---|
| `OrganizationService.createOrganization` (transactional) | No (raw ids) | No | No (FKs already valid, came from the same tx) |
| `OrganizationMemberController → POST /create-member` | Yes (DTO) | **No** | **No** — relies on the DB throwing an FK error |

**Fix:**
1. Add `exports: [OrganizationMemberService]` to `OrganizationMembersModule`.
2. Have `OrganizationService.createOrganization` call `organizationMemberService.createOrganizationMember(...)` (passed the transactional `manager`, or refactored to accept a repository) instead of touching `OrganizationMember` directly. One place owns "how a membership row gets created."

---

## 3. Critical: no authorization on multi-tenant data (IDOR)

- `GET /organization` (`OrganizationController.findAllOrganization`) returns **every organization in the system**, including nested `members` and each member's `user` object (name/email), to **any authenticated user** — not just members/owners of that org. There's no `where owner = req.user` / membership filter at all.
- `POST /create-member` (`OrganizationMemberController.createOrganizationMember`) lets **any authenticated user add any `userId` to any `organizationId`** — there is no check that the caller is the org's owner (or even a member). Since `organizationId`/`userId` are just UUIDs in the request body, this is a textbook IDOR: anyone can enroll themselves — or anyone else — into any organization.

**Fix:**
- `findAll` should scope results to organizations the requester belongs to (join through `organization_members` on `req.user.sub`), or split into `findMine()` vs. an admin-only `findAll()`.
- `POST /create-member` (or wherever member-adding ends up living, see §5) needs an authorization check: only the org owner (or a member with an "admin" role — see §4) may add members. This likely means loading the target organization first and comparing `organization.ownerId === req.user.sub` before writing.

---

## 4. Data integrity gaps

- **No unique constraint on `(organization_id, user_id)`** in `organization_members`. Nothing stops the same user from being inserted as a member of the same org multiple times — both write paths (§2) are missing this check, and the DB schema doesn't enforce it either. Add a composite unique index in a new migration:
  ```sql
  ALTER TABLE "organization_members" ADD CONSTRAINT "UQ_org_member_org_user" UNIQUE ("organization_id", "user_id");
  ```
  and catch the resulting `23505` in the service the way `UserService.create` already does for `userName` (see `user.service.ts:54-63`) — that's the established pattern in this repo, so membership creation should follow it rather than letting a raw `QueryFailedError` bubble up as a 500.
- **No `role` column on `organization_members`.** Right now the only way to know who's "in charge" of an org is `Organizations.ownerId`. A standard org/membership model (GitHub orgs, Slack workspaces, etc.) tracks a role per membership row (`owner` / `admin` / `member`) so you can have more than one privileged user and so authorization checks (§3) have something to check against beyond a single owner column.
- `OrganizationMemberCreateDto` (`organization_members/dto/organization-member-create-dto.ts`) validates `userId`/`organizationId` with `@IsString() @IsNotEmpty()` only — not `@IsUUID()`. A malformed id currently passes DTO validation and fails later as a raw Postgres error (`invalid input syntax for type uuid`), producing an unhandled 500 instead of a clean 400. This is the same class of bug as the original owner/user 500 — validate the shape at the boundary.
- `CreateOrganizationDto.name` has no `@MaxLength(255)` even though the column is `varchar(255)` — a name over 255 chars will fail at the DB layer with a raw error instead of a 400 from the pipe.

---

## 5. API design doesn't follow this repo's own REST conventions

- `OrganizationController` mixes a plural and singular path for the same resource: `POST /api/organizations` but `GET /api/organization` (no “s”). Compare `UserController`, which is consistently plural (`/api/users`, `/api/users/:id`).
- There's no `GET /organizations/:id` (single-resource fetch), unlike `UserController.findOne`.
- `POST /create-member` is a verb-style, non-RESTful route bolted onto its own top-level namespace. Given the resource relationship, this should hang off the organization it belongs to, e.g. `POST /organizations/:id/members`, and probably shouldn't live in a controller with no other members-listing/removal endpoints. Right now there's create-only, no `GET /organizations/:id/members` or removal endpoint, so "membership management" is half-implemented.

**Suggested route shape:**
```
POST   /organizations              create an org (creator becomes owner+member)
GET    /organizations              list orgs the caller belongs to
GET    /organizations/:id          get one org (only if caller is a member)
POST   /organizations/:id/members  add a member (only if caller is owner/admin)
GET    /organizations/:id/members  list members
DELETE /organizations/:id/members/:userId   remove a member
```

---

## 6. Minor / naming consistency

- File naming is inconsistent within the same module: `organizationMember.controller.ts` is camelCase while the sibling files in the same folder are snake_case (`organization_member.service.ts`, `organization_member.entity.ts`, `organization_member.module.ts`) and the rest of the repo's controllers are kebab-case (`api-key.controller.ts`, `user.controller.ts`). Pick one convention for this module and apply it to all four files.
- `organization-member-create-dto.ts` breaks the naming pattern used everywhere else (`create-user.dto.ts`, `create-organization.dto.ts` — `create-<entity>.dto.ts`, double extension `.dto.ts`). Rename to `create-organization-member.dto.ts` for consistency.
- `organization.service.ts findAll()` currently loads `relations: { members: { user: true, organization: true }, owner: {} }` — the `organization: true` under `members` reloads the parent org back onto each member, which is pure duplicate payload (you already have that org object one level up). Drop it unless something downstream specifically needs `member.organization`.

---

## 7. Priority checklist

1. **High** — Export `OrganizationMemberService` from `OrganizationMembersModule`; make `OrganizationService.createOrganization` use it instead of writing `OrganizationMember` directly.
2. **High** — Add authorization: scope `findAll` to the caller's orgs; require owner/admin role before adding a member.
3. **High** — Add a unique `(organization_id, user_id)` constraint + migration, and handle the `23505` conflict like `UserService.create` does.
4. **Medium** — Switch `userId`/`organizationId` DTO fields to `@IsUUID()`; add `@MaxLength(255)` to `CreateOrganizationDto.name`.
5. **Medium** — Fix route naming (`/organization` → `/organizations`), nest member routes under `/organizations/:id/members`, add `GET /organizations/:id`.
6. **Low** — Add a `role` column to `organization_members` for future permission checks.
7. **Low** — Normalize file naming within `organization_members`, drop the redundant `member.organization` relation load.
