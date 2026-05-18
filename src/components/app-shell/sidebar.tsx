"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  PlayCircle,
  Compass,
  Bug,
  BarChart3,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  matchPrefix?: string;
}

interface SidebarProps {
  projectKey: string;
  projectName: string;
  projects: { id: string; key: string; name: string }[];
}

const items = (key: string): NavItem[] => [
  { href: `/p/${key}`, label: "Dashboard", icon: LayoutDashboard },
  {
    href: `/p/${key}/repository`,
    label: "Repository",
    icon: BookOpen,
    matchPrefix: `/p/${key}/repository`,
  },
  { href: `/p/${key}/runs`, label: "Test Runs", icon: PlayCircle },
  { href: `/p/${key}/exploratory`, label: "Exploratory", icon: Compass },
  { href: `/p/${key}/defects`, label: "Defects", icon: Bug },
  { href: `/p/${key}/reports`, label: "Reports", icon: BarChart3 },
];

export function Sidebar({ projectKey, projectName, projects }: SidebarProps) {
  const pathname = usePathname();
  const nav = items(projectKey);

  return (
    <aside
      className="w-56 shrink-0 h-screen sticky top-0 border-r"
      style={{ background: "var(--color-bg-sidebar)" }}
    >
      <div className="flex flex-col h-full">
        {/* Brand */}
        <div className="px-3 pt-3 pb-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--color-bg-subtle)]"
          >
            <span className="h-6 w-6 rounded-md bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-bold">
              Q
            </span>
            <span className="text-sm font-semibold">QA Studio</span>
          </Link>
        </div>

        {/* Project switcher */}
        <div className="px-3 pb-2">
          <details className="group">
            <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--color-bg-subtle)]">
              <span className="flex items-center gap-2 min-w-0">
                <FolderKanban
                  size={14}
                  className="text-[var(--color-fg-muted)] shrink-0"
                />
                <span className="text-sm truncate">{projectName}</span>
              </span>
              <span className="text-xs text-[var(--color-fg-subtle)]">▾</span>
            </summary>
            <div className="mt-1 ml-1 border-l border-[var(--color-border)]">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${p.key}`}
                  className={cn(
                    "block pl-3 pr-2 py-1.5 text-sm rounded-r hover:bg-[var(--color-bg-subtle)]",
                    p.key === projectKey
                      ? "text-[var(--color-fg)] font-medium"
                      : "text-[var(--color-fg-muted)]",
                  )}
                >
                  {p.name}
                </Link>
              ))}
              <Link
                href="/"
                className="block pl-3 pr-2 py-1.5 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] rounded-r"
              >
                All projects →
              </Link>
            </div>
          </details>
        </div>

        {/* Nav */}
        <nav className="px-2 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.matchPrefix
                ? pathname.startsWith(item.matchPrefix)
                : item.href !== `/p/${projectKey}` &&
                  pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm mb-0.5",
                  active
                    ? "bg-[var(--color-accent-bg-subtle)] text-[var(--color-accent)] font-medium"
                    : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]",
                )}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t text-xs text-[var(--color-fg-subtle)]">
          Local QA workspace
        </div>
      </div>
    </aside>
  );
}
