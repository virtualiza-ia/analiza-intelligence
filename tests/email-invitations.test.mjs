import { readFileSync, statSync } from "node:fs";

const routePath = "app/api/users/invite/route.ts";
const mailPath = "lib/server/mail.ts";
const databasePath = "lib/server/database.ts";
const invitationsPath = "lib/server/user-invitations.ts";
const componentPath = "components/business-module-dashboard.tsx";
const signUpPath = "app/auth/sign-up/page.tsx";
const acceptInvitationFormPath = "components/accept-invitation-form.tsx";
const acceptInvitationRoutePath = "app/api/auth/accept-invitation/route.ts";
const localLoginRoutePath = "app/api/auth/local-login/route.ts";
const localPasswordRoutePath = "app/api/auth/local-password/route.ts";
const localAuthPath = "lib/server/local-auth.ts";
const passwordPath = "lib/server/passwords.ts";
const localSessionPath = "lib/auth/local-session.ts";
const userGuidePath = "docs/user-guide.md";
const setupGuidePath = "docs/invitation-email-setup.md";
const envExamplePath = ".env.example";
const dockerEnvExamplePath = ".env.docker.example";

for (const file of [
  routePath,
  mailPath,
  databasePath,
  invitationsPath,
  componentPath,
  signUpPath,
  acceptInvitationFormPath,
  acceptInvitationRoutePath,
  localLoginRoutePath,
  localPasswordRoutePath,
  localAuthPath,
  passwordPath,
  localSessionPath,
  userGuidePath,
  setupGuidePath,
  envExamplePath,
  dockerEnvExamplePath,
]) {
  statSync(file);
}

const route = readFileSync(routePath, "utf8");
const mail = readFileSync(mailPath, "utf8");
const database = readFileSync(databasePath, "utf8");
const invitations = readFileSync(invitationsPath, "utf8");
const component = readFileSync(componentPath, "utf8");
const signUp = readFileSync(signUpPath, "utf8");
const acceptInvitationForm = readFileSync(acceptInvitationFormPath, "utf8");
const acceptInvitationRoute = readFileSync(acceptInvitationRoutePath, "utf8");
const localLoginRoute = readFileSync(localLoginRoutePath, "utf8");
const localPasswordRoute = readFileSync(localPasswordRoutePath, "utf8");
const localAuth = readFileSync(localAuthPath, "utf8");
const passwords = readFileSync(passwordPath, "utf8");
const localSession = readFileSync(localSessionPath, "utf8");
const userGuide = readFileSync(userGuidePath, "utf8");
const setupGuide = readFileSync(setupGuidePath, "utf8");
const envExample = readFileSync(envExamplePath, "utf8");
const dockerEnvExample = readFileSync(dockerEnvExamplePath, "utf8");

for (const requiredRouteText of [
  "getMissingDatabaseConfig",
  "getMissingSmtpConfig",
  "getCurrentAuthorizationActor",
  "canPerformAction",
  "sendMail",
  "No se pudo enviar la invitacion",
]) {
  if (!route.includes(requiredRouteText)) {
    throw new Error(`Invitation API route is missing: ${requiredRouteText}`);
  }
}

for (const requiredMailText of [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "nodemailer.createTransport",
]) {
  if (!mail.includes(requiredMailText)) {
    throw new Error(`SMTP mailer is missing: ${requiredMailText}`);
  }
}

for (const requiredDatabaseText of [
  "DATABASE_URL",
  "POSTGRES_URL",
  "new Pool",
]) {
  if (!database.includes(requiredDatabaseText)) {
    throw new Error(`PostgreSQL helper is missing: ${requiredDatabaseText}`);
  }
}

for (const requiredInvitationText of [
  "randomBytes",
  "createHash(\"sha256\")",
  "invitation_token_hash",
  "user_invitations",
  "audit_logs",
  "delivery_provider",
]) {
  if (!invitations.includes(requiredInvitationText)) {
    throw new Error(
      `Invitation persistence is missing: ${requiredInvitationText}`,
    );
  }
}

for (const requiredComponentText of [
  "/api/users/invite",
  "Invitacion enviada por correo",
  "Variables pendientes",
  "Enviando...",
]) {
  if (!component.includes(requiredComponentText)) {
    throw new Error(`User form is missing: ${requiredComponentText}`);
  }
}

if (!signUp.includes("Aceptar invitacion")) {
  throw new Error("Invitation landing page must recognize invitation links.");
}

for (const requiredActivationText of [
  "AcceptInvitationForm",
  "Crear contrasena",
  "/api/auth/accept-invitation",
  "Crear contrasena e ingresar",
]) {
  if (
    !signUp.includes(requiredActivationText) &&
    !acceptInvitationForm.includes(requiredActivationText)
  ) {
    throw new Error(
      `Invitation acceptance UI is missing: ${requiredActivationText}`,
    );
  }
}

for (const requiredActivationRouteText of [
  "acceptUserInvitation",
  "createLocalSessionToken",
  "localSessionCookieName",
  "getLocalSessionCookieOptions",
]) {
  if (!acceptInvitationRoute.includes(requiredActivationRouteText)) {
    throw new Error(
      `Invitation acceptance route is missing: ${requiredActivationRouteText}`,
    );
  }
}

for (const requiredLocalLoginText of [
  "authenticateLocalUser",
  "createLocalSessionToken",
  "getExpiredLocalSessionCookieOptions",
  "requiresPasswordChange",
  "/auth/update-password",
  "Usuario o contrasena incorrectos",
]) {
  if (!localLoginRoute.includes(requiredLocalLoginText)) {
    throw new Error(`Local login route is missing: ${requiredLocalLoginText}`);
  }
}

for (const requiredLocalPasswordText of [
  "readLocalSession",
  "changeAuthenticatedLocalUserPassword",
  "currentPassword",
  "newPassword",
]) {
  if (!localPasswordRoute.includes(requiredLocalPasswordText)) {
    throw new Error(
      `Local password route is missing: ${requiredLocalPasswordText}`,
    );
  }
}

for (const requiredLocalAuthText of [
  "auth.users",
  "encrypted_password",
  "public.profiles",
  "public.user_roles",
  "public.user_invitations",
  "requires_password_change",
  "local_password.changed",
  "invitation_token_hash = null",
  "user_invitation.accepted",
]) {
  if (!localAuth.includes(requiredLocalAuthText)) {
    throw new Error(`Local auth service is missing: ${requiredLocalAuthText}`);
  }
}

for (const requiredPasswordText of [
  "scrypt",
  "timingSafeEqual",
  "hashPassword",
  "verifyPassword",
]) {
  if (!passwords.includes(requiredPasswordText)) {
    throw new Error(`Password hashing is missing: ${requiredPasswordText}`);
  }
}

for (const requiredSessionText of [
  "createHmac",
  "timingSafeEqual",
  "localSessionCookieName",
  "httpOnly",
]) {
  if (!localSession.includes(requiredSessionText)) {
    throw new Error(`Local session helper is missing: ${requiredSessionText}`);
  }
}

for (const requiredDocText of [
  "SMTP_HOST",
  "Google Workspace",
  "app password",
  "crear su contrasena",
]) {
  if (!userGuide.includes(requiredDocText) && !setupGuide.includes(requiredDocText)) {
    throw new Error(`Invitation docs are missing: ${requiredDocText}`);
  }
}

for (const requiredEnvText of [
  "DATABASE_URL",
  "APP_URL",
  "SMTP_HOST",
  "SMTP_PASSWORD=your-google-app-password",
]) {
  if (!envExample.includes(requiredEnvText)) {
    throw new Error(`.env.example is missing: ${requiredEnvText}`);
  }

  if (!dockerEnvExample.includes(requiredEnvText)) {
    throw new Error(`.env.docker.example is missing: ${requiredEnvText}`);
  }
}

console.log("Email invitation checks passed.");
