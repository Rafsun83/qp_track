#!/usr/bin/env bash
set -euo pipefail

# Seeds ~112M rows: 10,000 users x 10 orgs x 10 projects x 10 sprints x 10
# tickets. Each user is its own top-level `SELECT seed_one_user(...)`
# statement, auto-committed individually by psql - deliberately NOT a
# PL/pgSQL loop spanning many users in one transaction, which measurably
# degrades as the transaction grows (see seed-large-dataset.sql for why).
#
# Batches only control how many auto-committed statements are sent per
# `docker exec` round trip (BATCH_SIZE), not transaction size - a failure
# mid-batch only loses the batch's users, and Ctrl-C / a crash never loses
# more than what hasn't been sent yet.
#
# Re-run with START_USER past the last successfully seeded index to resume:
#   docker exec qp_track_db psql -U postgres -d qp_track_db \
#     -tAc "SELECT count(*) FROM users WHERE \"userName\" LIKE 'seed_user_%'"
#
# Every seeded user can log in with:
#   username: seed_user_<N>   (N from 1 to TOTAL_USERS)
#   password: SeedPass123!

CONTAINER="${CONTAINER:-qp_track_db}"
DB="${DB:-qp_track_db}"
DB_USER="${DB_USER:-postgres}"
TOTAL_USERS="${TOTAL_USERS:-10000}"
BATCH_SIZE="${BATCH_SIZE:-200}"
START_USER="${START_USER:-1}"
# bcrypt hash of "SeedPass123!" (10 salt rounds, same as the app's own
# @BeforeInsert() hashing) - computed once, reused for every seeded user.
PASSWORD_HASH='$2b$10$UfwHP/d1a6wzdbD3cEGn6OOieeiIBX1fdcjwpmksGrBf2owpLsnFi'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/seed-large-dataset.sql"

# Register the pg_temp function once per DB session. pg_temp is
# session-scoped, so this needs to happen in the SAME `psql` invocation as
# the SELECT calls that use it - done per batch below, not here.

start_time=$(date +%s)
batch_start=$START_USER

while ((batch_start <= TOTAL_USERS)); do
  batch_end=$((batch_start + BATCH_SIZE - 1))
  if ((batch_end > TOTAL_USERS)); then
    batch_end=$TOTAL_USERS
  fi

  echo "[$(date +%T)] seeding users $batch_start..$batch_end"

  {
    cat "$SQL_FILE"
    for ((i = batch_start; i <= batch_end; i++)); do
      echo "SELECT pg_temp.seed_one_user(${i}, '${PASSWORD_HASH}');"
    done
  } | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB" \
    -v ON_ERROR_STOP=1 \
    -q \
    -f -

  batch_start=$((batch_end + 1))
done

elapsed=$(( $(date +%s) - start_time ))
echo "Done in ${elapsed}s"
