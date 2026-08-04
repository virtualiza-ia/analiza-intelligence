import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20260804000100_local_auth_sessions.sql",
  "utf8",
);
const session = readFileSync("lib/auth/session.ts", "utf8");
const password = readFileSync("lib/auth/password.ts", "utf8");
const localRoute = readFileSync("app/auth/local/route.ts", "utf8");
const protectedLayout = readFileSync("app/protected/layout.tsx", "utf8");
const modulePage = readFileSync("app/protected/[module]/page.tsx", "utf8");
const sidebar = readFileSync("components/app-sidebar.tsx", "utf8");

assert.match(migration, /create schema if not exists app_auth/);
assert.match(migration, /create table app_auth\.accounts/);
assert.match(migration, /create table app_auth\.sessions/);
assert.match(migration, /token_hash text not null unique/);

assert.match(session, /randomBytes\(32\)/);
assert.match(session, /createHash\("sha256"\)/);
assert.match(session, /s\.revoked_at is null/);
assert.match(session, /s\.expires_at > now\(\)/);

assert.match(password, /compare\(password, account\.password_hash\)/);
assert.match(password, /maximumFailedAttempts = 5/);
assert.match(password, /locked_until/);

assert.match(localRoute, /httpOnly: true/);
assert.match(localRoute, /sameSite: "strict"/);
assert.match(localRoute, /secure: process\.env\.NODE_ENV === "production"/);

assert.match(protectedLayout, /requireAuthenticatedUser/);
assert.match(protectedLayout, /roleKey=\{user\.roleKey\}/);
assert.match(modulePage, /canRoleAccessModule\(user\.roleKey, module\)/);
assert.doesNotMatch(sidebar, /analiza:demo-role/);
assert.doesNotMatch(sidebar, /Rol DEMO/);

console.log("Local authentication and RBAC checks passed.");
