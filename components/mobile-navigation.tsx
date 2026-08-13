"use client";

import { usePathname, useRouter } from "next/navigation";

import { getNavigationForRole } from "@/lib/navigation";
import type { RoleKey } from "@/lib/tenant/demo-context";

type MobileNavigationProps = {
  roleKey: RoleKey;
};

export function MobileNavigation({ roleKey }: MobileNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = [
    { href: "/protected", title: "Inicio por rol" },
    ...getNavigationForRole(roleKey).map((item) => ({
      href: item.href,
      title: item.title,
    })),
  ];
  const activeHref =
    items.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.href ?? "/protected";

  return (
    <label className="grid gap-1 text-xs text-muted-foreground lg:hidden">
      <span className="sr-only">Navegacion principal</span>
      <select
        aria-label="Navegacion principal"
        className="h-11 w-full rounded-lg border border-border/80 bg-background/95 px-3 text-sm font-medium text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        value={activeHref}
        onChange={(event) => router.push(event.target.value)}
      >
        {items.map((item) => (
          <option key={item.href} value={item.href}>
            {item.title}
          </option>
        ))}
      </select>
    </label>
  );
}
