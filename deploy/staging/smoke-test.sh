#!/bin/sh
set -eu

base_url=${STAGING_BASE_URL:-http://127.0.0.1:3002}
credentials_path=${STAGING_CREDENTIALS_PATH:-/opt/analiza-intelligence-staging/shared/synthetic-accounts.txt}
shared_password=$(sed -n 's/^Shared temporary password: //p' "$credentials_path")
if [ -z "$shared_password" ]; then
  echo "Synthetic staging password is unavailable." >&2
  exit 2
fi

temporary_dir=$(mktemp -d)
trap 'rm -rf "$temporary_dir"' EXIT

login() {
  email_address=$1
  cookie_file=$2
  payload=$(printf '{"email":"%s","password":"%s"}' "$email_address" "$shared_password")
  curl --silent --show-error \
    --cookie-jar "$cookie_file" \
    --output "$temporary_dir/login.json" \
    --write-out '%{http_code}' \
    --header 'content-type: application/json' \
    --data "$payload" \
    "$base_url/auth/local"
}

session_token() {
  awk '$6 == "analiza_session" {print $7}' "$1"
}

admin_cookie="$temporary_dir/admin.cookies"
admin_status=$(login super_admin.tenant-a@staging.invalid "$admin_cookie")
printf 'admin_login=%s\n' "$admin_status"
admin_token=$(session_token "$admin_cookie")
test -n "$admin_token"

admin_history_status=$(curl --silent --show-error \
  --output "$temporary_dir/admin-history.json" \
  --write-out '%{http_code}' \
  --header "Cookie: analiza_session=$admin_token" \
  "$base_url/api/manual-submissions")
printf 'admin_history=%s\n' "$admin_history_status"

viewer_cookie="$temporary_dir/viewer.cookies"
viewer_status=$(login viewer.tenant-a@staging.invalid "$viewer_cookie")
printf 'viewer_login=%s\n' "$viewer_status"
viewer_token=$(session_token "$viewer_cookie")
test -n "$viewer_token"

viewer_write_status=$(curl --silent --show-error \
  --output "$temporary_dir/viewer-write.json" \
  --write-out '%{http_code}' \
  --header "Cookie: analiza_session=$viewer_token" \
  --header 'content-type: application/json' \
  --data '{}' \
  "$base_url/api/manual-submissions")
printf 'viewer_write=%s\n' "$viewer_write_status"

test "$admin_status" = "200"
test "$admin_history_status" = "200"
test "$viewer_status" = "200"
test "$viewer_write_status" = "403"

echo "STAGING_SMOKE_OK"
