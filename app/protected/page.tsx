import { RoleWorkspaceHome } from "@/components/role-workspace-home";
import { requireAuthenticatedUser } from "@/lib/auth/session";

export default async function ProtectedPage() {
  const user = await requireAuthenticatedUser();
  return <RoleWorkspaceHome roleKey={user.roleKey} />;
}
