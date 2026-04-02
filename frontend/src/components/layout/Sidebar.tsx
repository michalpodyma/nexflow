"use client";

import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  GitBranch,
  LineChart,
  ShieldCheck,
  UserPlus,
  Users,
  UserSquare2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const recruitmentNav = [
  { href: "/dashboard/job-orders", label: "Job Orders", icon: Briefcase },
  { href: "/dashboard/candidates", label: "Candidates", icon: UserSquare2 },
  { href: "/dashboard/workers", label: "Workers", icon: Users },
  { href: "/dashboard/placement-calendar", label: "Placement Calendar", icon: CalendarDays },
  { href: "/dashboard/compliance", label: "Compliance", icon: ShieldCheck },
];

const b2bNav = [
  { href: "/dashboard/pipeline", label: "Deals Pipeline", icon: GitBranch },
  { href: "/dashboard/clients", label: "Clients", icon: Building2 },
  { href: "/dashboard/prospects", label: "Prospects", icon: UserPlus },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
];

function NavGroup({ title, items }: { title: string; items: typeof recruitmentNav }) {
  const pathname = usePathname();

  return (
    <div>
      <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isDashboardActive = pathname === "/dashboard";

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-semibold text-primary">Nexflow</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Top-level entry */}
        <Link
          href="/dashboard"
          className={cn(
            "mb-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isDashboardActive
              ? "bg-primary/10 text-primary"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
          )}
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          Dashboard Home
        </Link>

        <div className="space-y-5">
          <NavGroup title="Recruitment" items={recruitmentNav} />
          <div className="border-t border-gray-100 pt-4">
            <NavGroup title="B2B Pipeline" items={b2bNav} />
          </div>
        </div>
      </nav>
    </aside>
  );
}
