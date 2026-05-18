"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteProjectButtonProps {
  projectKey: string;
  projectName: string;
  deleteAction: (projectKey: string) => Promise<void>;
}

export function DeleteProjectButton({
  projectKey,
  projectName,
  deleteAction,
}: DeleteProjectButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={13} /> Delete project
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--color-fg-muted)]">
        Delete <strong>{projectName}</strong>?
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => deleteAction(projectKey))}
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </Button>
    </div>
  );
}
