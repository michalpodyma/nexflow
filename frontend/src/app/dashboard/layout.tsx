"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { LanguageProvider } from "@/components/layout/language-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { isAuthenticated } from "@/lib/auth";

const DEFAULT_SECTION_KEY = "nexflow-default-section";

const DEFAULT_SECTION_ROUTES: Record<string, string> = {
  recruitment: "/dashboard/job-orders",
  b2b: "/dashboard/pipeline",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    // On exact dashboard home, redirect to the user's preferred default section
    if (pathname === "/dashboard") {
      const section = localStorage.getItem(DEFAULT_SECTION_KEY);
      const target = section ? DEFAULT_SECTION_ROUTES[section] : null;
      if (target) {
        router.replace(target);
      }
    }
  }, [router, pathname]);

  return (
    <LanguageProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </SidebarProvider>
    </LanguageProvider>
  );
}
