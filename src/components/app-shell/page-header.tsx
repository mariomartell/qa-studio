import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 pb-4 mb-4 border-b">
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-fg)]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[var(--color-fg-muted)] mt-0.5">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
