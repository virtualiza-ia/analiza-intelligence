#!/bin/sh
set -eu

base_url=${STAGING_BASE_URL:-http://127.0.0.1:3002}
credentials_path=${STAGING_CREDENTIALS_PATH:-/opt/analiza-intelligence-staging/shared/synthetic-accounts.txt}
fixture_path=${STAGING_FIXTURE_PATH:-/opt/analiza-intelligence-staging/current/deploy/staging/manual-submission-fisioterapia.json}
shared_password=$(sed -n 's/^Shared temporary password: //p' "$credentials_path")
temporary_dir=$(mktemp -d)
trap 'rm -rf "$temporary_dir"' EXIT

login_token() {
  email_address=$1
  cookie_path=$2
  payload=$(printf '{"email":"%s","password":"%s"}' "$email_address" "$shared_password")
  status=$(curl --silent --show-error \
    --cookie-jar "$cookie_path" \
    --output "$temporary_dir/login.json" \
    --write-out '%{http_code}' \
    --header 'content-type: application/json' \
    --data "$payload" \
    "$base_url/auth/local")
  test "$status" = "200"
  awk '$6 == "analiza_session" {print $7}' "$cookie_path"
}

python3 - "$fixture_path" "$temporary_dir/tenant-b.json" <<'PY'
import json, sys
payload = json.load(open(sys.argv[1]))
payload["branchId"] = "51000000-0000-4000-8000-000000000002"
payload["period"] = "2026-06"
payload["answers"]["branch_reported"] = payload["branchId"]
payload["answers"]["period"] = payload["period"]
payload["answers"]["data_cutoff_date"] = "2026-06-30"
payload["answers"]["load_deadline_date"] = "2026-07-05"
json.dump(payload, open(sys.argv[2], "w"))
PY

branch_b_token=$(login_token gerente_sucursal.tenant-b@staging.invalid "$temporary_dir/branch-b.cookies")
save_b_status=$(curl --silent --show-error \
  --output "$temporary_dir/save-b.json" \
  --write-out '%{http_code}' \
  --header "Cookie: analiza_session=$branch_b_token" \
  --header 'content-type: application/json' \
  --data-binary "@$temporary_dir/tenant-b.json" \
  "$base_url/api/manual-submissions")
test "$save_b_status" = "200"

branch_a_token=$(login_token gerente_sucursal.tenant-a@staging.invalid "$temporary_dir/branch-a.cookies")
cross_write_status=$(curl --silent --show-error \
  --output "$temporary_dir/cross-write.json" \
  --write-out '%{http_code}' \
  --header "Cookie: analiza_session=$branch_a_token" \
  --header 'content-type: application/json' \
  --data-binary "@$temporary_dir/tenant-b.json" \
  "$base_url/api/manual-submissions")
test "$cross_write_status" = "403"

viewer_a_token=$(login_token viewer.tenant-a@staging.invalid "$temporary_dir/viewer-a.cookies")
viewer_b_token=$(login_token viewer.tenant-b@staging.invalid "$temporary_dir/viewer-b.cookies")
history_url="$base_url/api/manual-submissions?branchId=51000000-0000-4000-8000-000000000002&businessLine=Fisioterapia&period=2026-06"

curl --silent --show-error \
  --output "$temporary_dir/history-a.json" \
  --header "Cookie: analiza_session=$viewer_a_token" \
  "$history_url"
curl --silent --show-error \
  --output "$temporary_dir/history-b.json" \
  --header "Cookie: analiza_session=$viewer_b_token" \
  "$history_url"

count_a=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["submissions"]))' "$temporary_dir/history-a.json")
count_b=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["submissions"]))' "$temporary_dir/history-b.json")
test "$count_a" = "0"
test "$count_b" = "1"

printf 'tenant_b_save=%s cross_write=%s viewer_a_rows=%s viewer_b_rows=%s\n' \
  "$save_b_status" "$cross_write_status" "$count_a" "$count_b"
echo "STAGING_TENANT_ISOLATION_OK"
