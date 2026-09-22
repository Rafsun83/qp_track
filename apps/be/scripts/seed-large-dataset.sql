-- Seeds one user's worth of synthetic data for load/pagination testing:
--   1 user  -> 10 organizations (user is OWNER of each)
--            -> 10 projects per org  (100 per user)
--            -> 10 sprints per project (1,000 per user)
--            -> 10 tickets per sprint  (10,000 per user)
--
-- The user is also added as the OWNER org_member and LEAD project_member of
-- everything they "create", matching how the real API behaves.
--
-- Deliberately ONE user per function call, called as its own top-level
-- statement (see seed-large-dataset.sh) rather than looped inside a single
-- PL/pgSQL block: stacking many users' inserts into one long-running
-- transaction measurably degrades per-row FK-trigger cost as it grows
-- (observed ~25x slower by the 100th user in a 200-user transaction vs. one
-- user in isolation). Committing after every user keeps each transaction
-- small and avoids that degradation entirely.
CREATE OR REPLACE FUNCTION pg_temp.seed_one_user(
  p_index integer,
  p_password_hash text
) RETURNS void AS $$
BEGIN
  WITH new_user AS (
    INSERT INTO users (name, email, "userName", location, password, "loginCount", "createdAt")
    VALUES (
      'Seed User ' || p_index,
      'seed_user_' || p_index || '@example.com',
      'seed_user_' || p_index,
      'Dhaka',
      p_password_hash,
      0,
      now()
    )
    RETURNING id
  ),
  new_orgs AS (
    INSERT INTO organizations (name, owner_id, is_active, created_at, updated_at)
    SELECT 'Seed Org ' || p_index || '-' || g, new_user.id, true, now(), now()
    FROM new_user, generate_series(1, 10) AS g
    RETURNING id, owner_id
  ),
  ins_org_members AS (
    INSERT INTO organization_members (organization_id, user_id, role, joined_at)
    SELECT id, owner_id, 'OWNER'::organization_members_role_enum, now()
    FROM new_orgs
  ),
  new_projects AS (
    INSERT INTO projects (organization_id, name, key, description, status, created_by, created_at, updated_at)
    SELECT
      o.id,
      'Seed Project ' || p,
      'P' || lpad(p::text, 2, '0'),
      'Seed project description',
      'PLANNING'::projects_status_enum,
      o.owner_id,
      now(),
      now()
    FROM new_orgs o, generate_series(1, 10) AS p
    RETURNING id, created_by
  ),
  ins_project_members AS (
    INSERT INTO project_members (project_id, user_id, role, added_at)
    SELECT id, created_by, 'LEAD'::project_members_role_enum, now()
    FROM new_projects
  ),
  new_sprints AS (
    INSERT INTO sprint (project_id, name, start_date, end_date, status)
    SELECT
      pr.id,
      'Sprint ' || s,
      now() + ((s - 1) * interval '14 days'),
      now() + (s * interval '14 days'),
      'PLANNED'::sprint_status_enum
    FROM new_projects pr, generate_series(1, 10) AS s
    RETURNING id, project_id
  )
  INSERT INTO tickets (
    project_id, sprint_id, title, description, status, priority,
    created_by, assignee_id, created_at, updated_at
  )
  SELECT
    ns.project_id,
    ns.id,
    'Ticket ' || t,
    'Seed ticket description',
    'TODO'::tickets_status_enum,
    'LOW'::tickets_priority_enum,
    np.created_by,
    np.created_by,
    now(),
    now()
  FROM new_sprints ns
  JOIN new_projects np ON np.id = ns.project_id
  CROSS JOIN generate_series(1, 10) AS t;
END;
$$ LANGUAGE plpgsql;
