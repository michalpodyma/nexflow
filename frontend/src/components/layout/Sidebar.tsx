"use client";

import {
  BarChart3,
  Briefcase,
  Building2,
  Bus,
  CalendarDays,
  Clock,
  Database,
  FileText,
  GitBranch,
  Home,
  LineChart,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  UserSquare2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useLanguage } from "@/components/layout/language-context";

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const { t } = useLanguage();
  const isDashboardActive = pathname === "/dashboard";

  const recruitmentNav = [
    { href: "/dashboard/job-orders", labelKey: "nav.job-orders", icon: Briefcase },
    { href: "/dashboard/candidates", labelKey: "nav.candidates", icon: UserSquare2 },
    { href: "/dashboard/workers", labelKey: "nav.workers", icon: Users },
    { href: "/dashboard/accommodations", labelKey: "nav.accommodations", icon: Home },
    { href: "/dashboard/transport", labelKey: "nav.transport", icon: Bus },
    { href: "/dashboard/placement-calendar", labelKey: "nav.placement-calendar", icon: CalendarDays },
    { href: "/dashboard/compliance", labelKey: "nav.compliance", icon: ShieldCheck },
    { href: "/dashboard/documents", labelKey: "nav.documents", icon: FileText },
    { href: "/dashboard/hours-import", labelKey: "nav.hours-import", icon: Clock },
    { href: "/dashboard/aga-export", labelKey: "nav.aga-export", icon: Database },
  ];

  const b2bNav = [
    { href: "/dashboard/pipeline", labelKey: "nav.pipeline", icon: GitBranch },
    { href: "/dashboard/clients", labelKey: "nav.clients", icon: Building2 },
    { href: "/dashboard/prospects", labelKey: "nav.prospects", icon: UserPlus },
    { href: "/dashboard/analytics", labelKey: "nav.analytics", icon: LineChart },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "flex h-screen w-60 flex-col border-r bg-white transition-transform duration-200",
          // Desktop: always visible in normal flow
          "md:relative md:translate-x-0",
          // Mobile: fixed overlay, slide in/out
          "fixed inset-y-0 left-0 z-40",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-semibold text-primary">Nexflow</span>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <div className="flex-1">
            {/* Top-level entry */}
            <Link
              href="/dashboard"
              onClick={close}
              className={cn(
                "mb-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isDashboardActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              {t("nav.dashboard")}
            </Link>

            <div className="space-y-5">
              {/* Recruitment group */}
              <div>
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t("nav.group.recruitment")}
                </p>
                <div className="space-y-0.5">
                  {recruitmentNav.map(({ href, labelKey, icon: Icon }) => {
                    const isActive = pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={close}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {t(labelKey)}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* B2B group */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t("nav.group.b2b")}
                </p>
                <div className="space-y-0.5">
                  {b2bNav.map(({ href, labelKey, icon: Icon }) => {
                    const isActive = pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={close}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {t(labelKey)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Settings link — pinned to bottom */}
          <div className="mt-4 border-t border-gray-100 pt-3">
            <Link
              href="/dashboard/settings"
              onClick={close}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/dashboard/settings")
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {t("nav.settings")}
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
