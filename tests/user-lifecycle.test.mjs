import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getPasswordPolicyError } from "../lib/auth/password-policy.ts";

const migration = readFileSync("supabase/migrations/20260804000200_secure_user_lifecycle.sql", "utf8");
const inviteRoute = readFileSync("app/api/users/invite/route.ts", "utf8");
const lifecycle = readFileSync("lib/auth/user-lifecycle.ts", "utf8");
const signUpPage = readFileSync("app/auth/sign-up/page.tsx", "utf8");
const resetRoute = readFileSync("app/auth/password/reset/route.ts", "utf8");

assert.match(migration, /password_reset_tokens/);
assert.match(migration, /user_invitations_one_pending_email_idx/);
assert.match(migration, /auth_users_email_lower_idx/);
assert.match(inviteRoute, /getAuthenticatedUser/);
assert.doesNotMatch(inviteRoute, /actorRole/);
assert.doesNotMatch(inviteRoute, /actorScope/);
assert.match(lifecycle, /randomBytes\(32\)/);
assert.match(lifecycle, /invitation_token_hash = \$1/);
assert.match(lifecycle, /for update of i/);
assert.match(lifecycle, /status = 'accepted'/);
assert.match(lifecycle, /insert into app_auth\.accounts/);
assert.match(lifecycle, /insert into public\.user_roles/);
assert.match(lifecycle, /update app_auth\.sessions set revoked_at = now\(\)/);
assert.match(signUpPage, /getInvitationPreview/);
assert.match(resetRoute, /resetPassword/);

assert.ok(getPasswordPolicyError("short"));
assert.ok(getPasswordPolicyError("alllowercase123!"));
assert.ok(getPasswordPolicyError("NOLOWERCASE123!"));
assert.ok(getPasswordPolicyError("NoNumberSymbolHere"));
assert.equal(getPasswordPolicyError("ValidPassword1!"), null);

console.log("Secure user lifecycle checks passed.");
