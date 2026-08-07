import { RoleWorkspaceHome } from "@/components/role-workspace-home";
import { requireProtectedPath } from "@/lib/server/authorization";

export default async function ProtectedPage() {
  const access = await requireProtectedPath("/protected");

  return (
    <RoleWorkspaceHome
      allowDemoRoleSwitch={access.allowDemoRoleSwitch}
      roleKey={access.roleKey}
    />
  );
}
