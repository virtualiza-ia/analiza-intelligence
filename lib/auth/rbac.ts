import type { RoleKey } from "@/lib/tenant/demo-context";
import { navigationItems } from "@/lib/navigation";

const unrestrictedAdminRoles: ReadonlySet<RoleKey> = new Set([
  "super_admin",
  "webmaster_admin",
]);

export function isUnrestrictedAdmin(roleKey: RoleKey) {
  return unrestrictedAdminRoles.has(roleKey);
}

export function canRoleAccessModule(roleKey: RoleKey, moduleSlug: string) {
  const item = navigationItems.find(
    (navigationItem) =>
      navigationItem.href === `/protected/${moduleSlug}`,
  );

  if (!item) {
    return false;
  }

  return isUnrestrictedAdmin(roleKey) || item.allowedRoles.includes(roleKey);
}
