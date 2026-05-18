"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Folder, FolderOpen, Plus, Trash2 } from "lucide-react";
import { createFolder, deleteFolder } from "../_actions";

interface FolderItem {
  id: string;
  name: string;
  _count: { testCases: number };
}

interface Props {
  projectKey: string;
  folders: FolderItem[];
  activeFolderId: string | null;
  totalCases: number;
}

export function FolderTree({ projectKey, folders, activeFolderId, totalCases }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      await createFolder(projectKey, name);
      setNewName("");
      setAdding(false);
    });
  }

  function handleDelete(folderId: string, folderName: string) {
    if (!confirm(`Delete folder "${folderName}"? Cases inside will become unfiled.`)) return;
    startTransition(() => deleteFolder(projectKey, folderId));
  }

  return (
    <div className="text-sm">
      <Link
        href={`/p/${projectKey}/repository`}
        className={[
          "flex items-center justify-between px-2 py-1.5 rounded-md mb-0.5",
          !activeFolderId
            ? "bg-[var(--color-accent-bg-subtle)] text-[var(--color-accent)] font-medium"
            : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]",
        ].join(" ")}
      >
        <span>All cases</span>
        <span className="text-xs tabular-nums">{totalCases}</span>
      </Link>

      {folders.map((folder) => {
        const active = activeFolderId === folder.id;
        return (
          <div key={folder.id} className="group flex items-center gap-0.5 mb-0.5">
            <Link
              href={`/p/${projectKey}/repository?folder=${folder.id}`}
              className={[
                "flex-1 flex items-center justify-between px-2 py-1.5 rounded-md",
                active
                  ? "bg-[var(--color-accent-bg-subtle)] text-[var(--color-accent)] font-medium"
                  : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]",
              ].join(" ")}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {active ? (
                  <FolderOpen size={13} className="shrink-0" />
                ) : (
                  <Folder size={13} className="shrink-0" />
                )}
                <span className="truncate">{folder.name}</span>
              </span>
              <span className="text-xs tabular-nums ml-1">{folder._count.testCases}</span>
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleDelete(folder.id, folder.name)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)] transition-opacity"
              title="Delete folder"
            >
              <Trash2 size={11} />
            </button>
          </div>
        );
      })}

      {adding ? (
        <form onSubmit={handleCreate} className="flex gap-1 mt-1.5 px-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setAdding(false);
                setNewName("");
              }
            }}
            placeholder="Folder name"
            className="flex-1 px-2 py-1 text-xs border rounded-md bg-[var(--color-bg)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={pending || !newName.trim()}
            className="px-2 py-1 text-xs rounded-md bg-[var(--color-accent)] text-white disabled:opacity-50"
          >
            Add
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] rounded-md hover:bg-[var(--color-bg-subtle)] mt-0.5"
        >
          <Plus size={11} />
          New folder
        </button>
      )}
    </div>
  );
}
