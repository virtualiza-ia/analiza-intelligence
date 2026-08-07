"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getGroupedNavigationForRole,
  getNavigationForRole,
  navigationItems,
  type NavigationItem,
} from "@/lib/navigation";
import {
  demoRoleProfiles,
  roleKeys,
  type RoleKey,
} from "@/lib/tenant/demo-context";

const storageKey = "analiza:sidebar-collapsed";
const roleStorageKey = "analiza:demo-role";
const roleChangeEvent = "analiza:role-change";

type AppSidebarProps = {
  allowDemoRoleSwitch: boolean;
  roleKey: RoleKey;
};

function isActive(pathname: string, item: NavigationItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppSidebar({ allowDemoRoleSwitch, roleKey }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [activeRole, setActiveRole] = useState<RoleKey>(roleKey);
  const visibleItems = getNavigationForRole(activeRole);
  const visibleGroups = getGroupedNavigationForRole(activeRole);
  const roleProfile = demoRoleProfiles[activeRole];

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(storageKey) === "true");

    if (!allowDemoRoleSwitch) {
      setActiveRole(roleKey);
      window.localStorage.setItem(roleStorageKey, roleKey);
      window.dispatchEvent(new Event(roleChangeEvent));
      return;
    }

    const storedRole = window.localStorage.getItem(roleStorageKey);

    if (roleKeys.includes(storedRole as RoleKey)) {
      const nextRole = storedRole as RoleKey;
      setActiveRole(nextRole);
      void fetch("/api/auth/demo-role", {
        body: JSON.stringify({ roleKey: nextRole }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      return;
    }

    setActiveRole(roleKey);
    window.localStorage.setItem(roleStorageKey, roleKey);
  }, [allowDemoRoleSwitch, roleKey]);

  function toggleCollapsed() {
    setCollapsed((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem(storageKey, String(nextValue));
      return nextValue;
    });
  }

  function changeRole(nextRole: RoleKey) {
    setActiveRole(nextRole);
    window.localStorage.setItem(roleStorageKey, nextRole);
    window.dispatchEvent(new Event(roleChangeEvent));

    void fetch("/api/auth/demo-role", {
      body: JSON.stringify({ roleKey: nextRole }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  }

  return (
    <aside
      className={cn(
        "hidden border-r bg-background lg:flex lg:flex-col",
        collapsed ? "lg:w-[72px]" : "lg:w-72",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        <span
          className={cn(
            "text-sm font-semibold",
            collapsed && "sr-only",
          )}
        >
          Analiza Intelligence
        </span>
        <Button
          aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
          onClick={toggleCollapsed}
          size="icon"
          type="button"
          variant="ghost"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="grid gap-4">
          <Link
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              pathname === "/protected" &&
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              collapsed && "justify-center px-0",
            )}
            href="/protected"
            title="Inicio por rol"
          >
            <Home className="size-4 shrink-0" />
            <span className={cn(collapsed && "sr-only")}>
              Inicio por rol
            </span>
          </Link>

          {visibleGroups.map((group) => (
            <section className="grid gap-1" key={group.key}>
              <div
                className={cn(
                  "px-3 text-[0.68rem] font-semibold uppercase tracking-normal text-muted-foreground",
                  collapsed && "sr-only",
                )}
              >
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);

                return (
                  <Link
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                      active &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      collapsed && "justify-center px-0",
                    )}
                    href={item.href}
                    key={item.href}
                    title={`${group.title}: ${item.title}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className={cn(collapsed && "sr-only")}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t p-3">
        <div className={cn("grid gap-2", collapsed && "sr-only")}>
          {!allowDemoRoleSwitch ? (
            <div className="rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
              <div className="font-medium text-foreground">
                {roleProfile.label}
              </div>
              <div>{roleProfile.accessSummary}</div>
              <div className="mt-1">
                {visibleItems.length} de {navigationItems.length} modulos visibles
              </div>
            </div>
          ) : (
            <>
          <label className="grid gap-1 text-xs">
            <span className="font-medium text-foreground">Rol DEMO</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-xs outline-none"
              value={activeRole}
              onChange={(event) => changeRole(event.target.value as RoleKey)}
            >
              {roleKeys.map((role) => (
                <option key={role} value={role}>
                  {demoRoleProfiles[role].label}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
            <div className="font-medium text-foreground">{roleProfile.label}</div>
            <div>{roleProfile.accessSummary}</div>
            <div className="mt-1">
              {visibleItems.length} de {navigationItems.length} modulos visibles
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
