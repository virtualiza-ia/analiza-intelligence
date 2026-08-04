import "server-only";

import { compare } from "bcryptjs";

import { withDatabaseTransaction } from "@/lib/db/pool";

const maximumFailedAttempts = 5;
const lockDurationMinutes = 15;

type AccountRow = {
  failed_login_attempts: number;
  locked_until: Date | null;
  password_hash: string;
  user_id: string;
};

export type AuthenticationResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "locked" };

export async function authenticatePassword(
  email: string,
  password: string,
): Promise<AuthenticationResult> {
  return withDatabaseTransaction(async (client) => {
    const result = await client.query<AccountRow>(
      `select
         a.user_id,
         a.password_hash,
         a.failed_login_attempts,
         a.locked_until
       from app_auth.accounts a
       join auth.users u on u.id = a.user_id
       join public.profiles p on p.id = u.id
       where lower(u.email) = lower($1)
         and p.status = 'active'
         and p.deleted_at is null
       for update of a`,
      [email],
    );
    const account = result.rows[0];

    if (!account) {
      return { ok: false, reason: "invalid" };
    }

    if (account.locked_until && account.locked_until.getTime() > Date.now()) {
      return { ok: false, reason: "locked" };
    }

    const passwordMatches = await compare(password, account.password_hash);

    if (!passwordMatches) {
      const failedAttempts = account.failed_login_attempts + 1;
      const shouldLock = failedAttempts >= maximumFailedAttempts;

      await client.query(
        `update app_auth.accounts
         set failed_login_attempts = $2,
             locked_until = case
               when $3 then now() + make_interval(mins => $4)
               else null
             end,
             updated_at = now()
         where user_id = $1`,
        [
          account.user_id,
          shouldLock ? 0 : failedAttempts,
          shouldLock,
          lockDurationMinutes,
        ],
      );

      return { ok: false, reason: shouldLock ? "locked" : "invalid" };
    }

    await client.query(
      `update app_auth.accounts
       set failed_login_attempts = 0,
           locked_until = null,
           updated_at = now()
       where user_id = $1`,
      [account.user_id],
    );

    return { ok: true, userId: account.user_id };
  });
}
