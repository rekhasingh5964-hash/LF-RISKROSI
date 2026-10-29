#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

image="${POSTGRES_IMAGE:-postgres:17-alpine}"
password="pitr-test-$(date +%s)-$$"
suffix="lf-pitr-$$"
source_container="${suffix}-source"
restore_container="${suffix}-restore"
archive_volume="${suffix}-archive"
backup_volume="${suffix}-backup"
restore_volume="${suffix}-restore"
started_at=""

cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 && -n "$restore_container" ]]; then
    docker logs "$restore_container" 2>&1 || true
  fi
  docker rm -f "$restore_container" "$source_container" >/dev/null 2>&1 || true
  docker volume rm "$restore_volume" "$backup_volume" "$archive_volume" >/dev/null 2>&1 || true
  exit "$exit_code"
}
trap cleanup EXIT

for volume in "$archive_volume" "$backup_volume" "$restore_volume"; do
  docker volume create "$volume" >/dev/null
done

docker run --detach --name "$source_container" \
  --env POSTGRES_PASSWORD="$password" \
  --volume "$archive_volume:/wal-archive" \
  --volume "$backup_volume:/backup" \
  "$image" sh -ec '
    mkdir -p /wal-archive /backup
    chown postgres:postgres /wal-archive /backup
    exec docker-entrypoint.sh postgres \
      -c wal_level=replica \
      -c archive_mode=on \
      -c "archive_command=test -f /wal-archive/%f || cp %p /wal-archive/%f" \
      -c archive_timeout=1s
  ' >/dev/null

ready=false
for _ in $(seq 1 60); do
  if docker exec "$source_container" pg_isready -U postgres >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo "FAIL: PostgreSQL 17 source did not become ready" >&2
  exit 1
fi

docker exec "$source_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE pitr_probe (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT clock_timestamp())" \
  -c "INSERT INTO pitr_probe (id) VALUES ('baseline')" >/dev/null

docker exec --user postgres --env PGPASSWORD="$password" "$source_container" \
  pg_basebackup -h 127.0.0.1 -U postgres -D /backup/base -Fp -Xs -P

target_time="$(docker exec "$source_container" psql -U postgres -d postgres -Atqc \
  "SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')")"

docker exec "$source_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "INSERT INTO pitr_probe (id) VALUES ('after_target')" >/dev/null

archived_before="$(docker exec "$source_container" psql -U postgres -d postgres -Atqc \
  "SELECT archived_count FROM pg_stat_archiver")"
docker exec "$source_container" psql -U postgres -d postgres -Atqc "SELECT pg_switch_wal()" >/dev/null

archived=false
for _ in $(seq 1 90); do
  archived_after="$(docker exec "$source_container" psql -U postgres -d postgres -Atqc \
    "SELECT archived_count FROM pg_stat_archiver")"
  if [[ "$archived_after" -gt "$archived_before" ]]; then
    archived=true
    break
  fi
  sleep 1
done
if [[ "$archived" != true ]]; then
  echo "FAIL: WAL segment containing the post-target transaction was not archived" >&2
  exit 1
fi

docker run --rm --entrypoint sh \
  --env RECOVERY_TARGET_TIME="$target_time" \
  --volume "$backup_volume:/backup:ro" \
  --volume "$restore_volume:/restore" \
  "$image" -ec '
    mkdir -p /restore/data
    cp -a /backup/base/. /restore/data/
    chown -R postgres:postgres /restore/data
    touch /restore/data/recovery.signal
    printf "restore_command = '\''cp /wal-archive/%%f %%p'\''\nrecovery_target_time = '\''%s'\''\nrecovery_target_action = '\''promote'\''\nrecovery_target_inclusive = '\''false'\''\n" \
      "$RECOVERY_TARGET_TIME" >> /restore/data/postgresql.auto.conf
  '

started_at="$(date +%s)"
docker run --detach --name "$restore_container" \
  --volume "$restore_volume:/restore" \
  --volume "$archive_volume:/wal-archive:ro" \
  "$image" postgres -D /restore/data >/dev/null

recovered=false
for _ in $(seq 1 900); do
  if ! docker inspect "$restore_container" >/dev/null 2>&1; then
    echo "FAIL: PostgreSQL PITR restore container exited" >&2
    exit 1
  fi
  recovery_state="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc \
    "SELECT pg_is_in_recovery()" 2>/dev/null || true)"
  if [[ "$recovery_state" == "f" ]]; then
    recovered=true
    break
  fi
  sleep 1
done

elapsed_seconds="$(($(date +%s) - started_at))"
if [[ "$recovered" != true ]]; then
  echo "FAIL: PostgreSQL did not reach the requested PITR target" >&2
  exit 1
fi

baseline_present="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc \
  "SELECT EXISTS (SELECT 1 FROM pitr_probe WHERE id = 'baseline')")"
post_target_present="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc \
  "SELECT EXISTS (SELECT 1 FROM pitr_probe WHERE id = 'after_target')")"
target_gap_seconds="$(docker exec "$source_container" psql -U postgres -d postgres -Atqc \
  "SELECT ceil(extract(epoch FROM (created_at - '$target_time'::timestamptz)))::bigint FROM pitr_probe WHERE id = 'after_target'")"

if [[ "$baseline_present" != "t" || "$post_target_present" != "f" ]]; then
  echo "FAIL: restored database contents do not match the requested recovery target" >&2
  exit 1
fi
if [[ "$target_gap_seconds" -gt 900 ]]; then
  echo "FAIL: test recovery point is more than 900 seconds before the excluded transaction" >&2
  exit 1
fi
if [[ "$elapsed_seconds" -gt 14400 ]]; then
  echo "FAIL: measured restore elapsed time exceeds the declared four-hour RTO" >&2
  exit 1
fi

echo "PASS: PostgreSQL 17 point-in-time recovery reached target $target_time (UTC)."
echo "PASS: baseline transaction recovered; transaction after target correctly absent."
echo "PASS: test target-to-excluded-transaction interval ${target_gap_seconds}s is within the declared 900s RPO bound."
echo "PASS: restore-to-promotion elapsed ${elapsed_seconds}s is within the declared 14400s RTO bound."
echo "NOTE: isolated synthetic Docker test only; this does not verify production backups, archive continuity, deployed RPO/RTO, or statutory compliance."
