import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 text-[var(--color-fg-subtle)]">{icon}</div>
      ) : null}
      <h3 className="text-sm font-semibold text-[var(--color-fg)]">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-[var(--color-fg-muted)] max-w-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
