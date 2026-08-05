#!/bin/sh
set -eu

base_url=${STAGING_BASE_URL:-http://127.0.0.1:3002}
credentials_path=${STAGING_CREDENTIALS_PATH:-/opt/analiza-intelligence-staging/shared/synthetic-accounts.txt}
fixture_path=${STAGING_FIXTURE_PATH:-/opt/analiza-intelligence-staging/current/deploy/staging/manual-submission-fisioterapia.json}
shared_password=$(sed -n 's/^Shared temporary password: //p' "$credentials_path")

temporary_dir=$(mktemp -d)
trap 'rm -rf "$temporary_dir"' EXIT

payload=$(printf '{"email":"%s","password":"%s"}' \
  'gerente_sucursal.tenant-a@staging.invalid' "$shared_password")
login_status=$(curl --silent --show-error \
  --cookie-jar "$temporary_dir/cookies" \
  --output "$temporary_dir/login.json" \
  --write-out '%{http_code}' \
  --header 'content-type: application/json' \
  --data "$payload" \
  "$base_url/auth/local")
session_token=$(awk '$6 == "analiza_session" {print $7}' "$temporary_dir/cookies")
printf 'branch_login=%s\n' "$login_status"
test "$login_status" = "200"
test -n "$session_token"

save_status=$(curl --silent --show-error \
  --output "$temporary_dir/save.json" \
  --write-out '%{http_code}' \
  --header "Cookie: analiza_session=$session_token" \
  --header 'content-type: application/json' \
  --data-binary "@$fixture_path" \
  "$base_url/api/manual-submissions")
printf 'initial_save=%s\n' "$save_status"
if [ "$save_status" != "200" ]; then
  cat "$temporary_dir/save.json"
  printf '\n'
fi
test "$save_status" = "200"

server_score=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["qualityScore"])' "$temporary_dir/save.json")
saved_version=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$temporary_dir/save.json")
test "$server_score" != "1"

python3 - "$fixture_path" "$temporary_dir/concurrent.json" "$saved_version" <<'PY'
import json, sys
payload = json.load(open(sys.argv[1]))
payload["expectedVersion"] = int(sys.argv[3])
json.dump(payload, open(sys.argv[2], "w"))
PY

for slot in 1 2; do
  (
    curl --silent --show-error \
      --output "$temporary_dir/concurrent-$slot.json" \
      --write-out '%{http_code}' \
      --header "Cookie: analiza_session=$session_token" \
      --header 'content-type: application/json' \
      --data-binary "@$temporary_dir/concurrent.json" \
      "$base_url/api/manual-submissions" \
      > "$temporary_dir/concurrent-$slot.status"
  ) &
done
wait

status_one=$(cat "$temporary_dir/concurrent-1.status")
status_two=$(cat "$temporary_dir/concurrent-2.status")
case "$status_one:$status_two" in
  200:409|409:200) ;;
  *) echo "Unexpected concurrency statuses: $status_one $status_two" >&2; exit 4 ;;
esac

history_status=$(curl --silent --show-error \
  --output "$temporary_dir/history.json" \
  --write-out '%{http_code}' \
  --header "Cookie: analiza_session=$session_token" \
  "$base_url/api/manual-submissions?branchId=50000000-0000-4000-8000-000000000001&businessLine=Fisioterapia&period=2026-07")
test "$history_status" = "200"
active_version=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["submissions"][0]["version"])' "$temporary_dir/history.json")

python3 - "$fixture_path" "$temporary_dir/publish.json" "$active_version" <<'PY'
import json, sys
payload = json.load(open(sys.argv[1]))
payload["action"] = "publish"
payload["expectedVersion"] = int(sys.argv[3])
payload["qualityScore"] = 1
json.dump(payload, open(sys.argv[2], "w"))
PY

publish_status=$(curl --silent --show-error \
  --output "$temporary_dir/publish-response.json" \
  --write-out '%{http_code}' \
  --header "Cookie: analiza_session=$session_token" \
  --header 'content-type: application/json' \
  --data-binary "@$temporary_dir/publish.json" \
  "$base_url/api/manual-submissions")
test "$publish_status" = "201"

printf 'save=%s server_score=%s concurrency=%s/%s publish=%s\n' \
  "$save_status" "$server_score" "$status_one" "$status_two" "$publish_status"
echo "STAGING_LIFECYCLE_OK"
