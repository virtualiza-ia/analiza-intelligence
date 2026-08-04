# Invitation Email Setup

Analiza BI sends user invitations from the server, not from the browser.

## Required Variables

```text
DATABASE_URL
APP_URL
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
```

For Google Workspace:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=analiza@interactivecore.app
SMTP_FROM="Analiza BI <analiza@interactivecore.app>"
```

`SMTP_PASSWORD` must be a Google app password generated for the same mailbox. Do not commit it, paste it into screenshots, or place it in a browser-visible variable.

## Flow

1. An authorized admin invites a user from `Usuarios y permisos`.
2. The server validates the role hierarchy and scope.
3. The server creates a `user_invitations` record in PostgreSQL.
4. The raw invitation token is sent by email; only its hash is stored.
5. Audit records keep the action trace without storing secrets.

The current self-hosted flow sends and records the invitation. Password creation on the invitation page is a separate auth phase and should be connected to the final authentication provider before real user onboarding.
