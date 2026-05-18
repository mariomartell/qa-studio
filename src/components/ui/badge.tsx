import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone =
  | "neutral"
  | "success"
  | "danger"
  | "warn"
  | "info"
  | "accent";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

const tones: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: {
    bg: "bg-[var(--color-neutral-bg)]",
    fg: "text-[var(--color-neutral)]",
    dot: "bg-[var(--color-neutral)]",
  },
  success: {
    bg: "bg-[var(--color-success-bg)]",
    fg: "text-[var(--color-success)]",
    dot: "bg-[var(--color-success)]",
  },
  danger: {
    bg: "bg-[var(--color-danger-bg)]",
    fg: "text-[var(--color-danger)]",
    dot: "bg-[var(--color-danger)]",
  },
  warn: {
    bg: "bg-[var(--color-warn-bg)]",
    fg: "text-[var(--color-warn)]",
    dot: "bg-[var(--color-warn)]",
  },
  info: {
    bg: "bg-[var(--color-info-bg)]",
    fg: "text-[var(--color-info)]",
    dot: "bg-[var(--color-info)]",
  },
  accent: {
    bg: "bg-[var(--color-accent-bg-subtle)]",
    fg: "text-[var(--color-accent)]",
    dot: "bg-[var(--color-accent)]",
  },
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
  ...props
}: BadgeProps) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
        t.bg,
        t.fg,
        className,
      )}
      {...props}
    >
      {dot ? (
        <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
      ) : null}
      {children}
    </span>
  );
}
