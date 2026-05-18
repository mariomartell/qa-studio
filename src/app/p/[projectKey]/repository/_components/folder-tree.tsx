"use client";

import Link from "next/link";
import { useState, useTransition, useRef } from "react";
import { Folder, FolderOpen, ChevronRight, Plus, Trash2, GripVertical } from "lucide-react";
import { createFolder, deleteFolder, reorderFolders } from "../_actions";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  _count: { testCases: number };
}

interface Props {
  projectKey: string;
  folders: FolderItem[];
  activeFolderId: string | null;
  totalCases: number;
}

export function FolderTree({ projectKey, folders: initialFolders, activeFolderId, totalCases }: Props) {
  const [folders, setFolders] = useState(initialFolders);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  // Track which parent folders are collapsed (default: all expanded)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const draggedId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Split into root folders and a children map
  const rootFolders = folders.filter((f) => f.parentId === null);
  const childrenOf = (parentId: string) => folders.filter((f) => f.parentId === parentId);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  // Drag-to-reorder only applies to root-level folders
  function handleDragStart(id: string) {
    draggedId.current = id;
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (draggedId.current && draggedId.current !== overId) {
      setDragOverId(overId);
    }
  }

  function handleDrop(e: React.DragEvent, overId: string) {
    e.preventDefault();
    const fromId = draggedId.current;
    if (!fromId || fromId === overId) { setDragOverId(null); return; }

    const next = [...rootFolders];
    const fromIdx = next.findIndex((f) => f.id === fromId);
    const toIdx = next.findIndex((f) => f.id === overId);
    if (fromIdx === -1 || toIdx === -1) { setDragOverId(null); return; }

    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);

    // Rebuild full folders list: reordered roots + all children unchanged
    const children = folders.filter((f) => f.parentId !== null);
    setFolders([...next, ...children]);
    setDragOverId(null);
    draggedId.current = null;

    startTransition(() => reorderFolders(projectKey, next.map((f) => f.id)));
  }

  function handleDragEnd() {
    draggedId.current = null;
    setDragOverId(null);
  }

  return (
    <div className="text-sm">
      {/* All cases */}
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

      {/* Root folders */}
      {rootFolders.map((folder) => {
        const children = childrenOf(folder.id);
        const hasChildren = children.length > 0;
        const isOpen = !collapsed.has(folder.id);
        const active = activeFolderId === folder.id;
        const isOver = dragOverId === folder.id;

        return (
          <div key={folder.id}>
            {/* Root folder row */}
            <div
              draggable
              onDragStart={() => handleDragStart(folder.id)}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDrop={(e) => handleDrop(e, folder.id)}
              onDragEnd={handleDragEnd}
              className={[
                "group flex items-center gap-0.5 mb-0.5 rounded-md transition-colors",
                isOver ? "bg-[var(--color-accent-bg-subtle)] ring-1 ring-[var(--color-accent)]" : "",
              ].join(" ")}
            >
              {/* Drag handle */}
              <span
                className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 text-[var(--color-fg-subtle)] shrink-0"
                title="Drag to reorder"
              >
                <GripVertical size={12} />
              </span>

              {/* Expand/collapse chevron */}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleCollapse(folder.id)}
                  className="p-0.5 shrink-0 text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]"
                >
                  <ChevronRight
                    size={12}
                    className={["transition-transform", isOpen ? "rotate-90" : ""].join(" ")}
                  />
                </button>
              ) : (
                <span className="w-[20px] shrink-0" />
              )}

              {/* Folder link */}
              <Link
                href={`/p/${projectKey}/repository?folder=${folder.id}`}
                className={[
                  "flex-1 flex items-center justify-between px-1.5 py-1.5 rounded-md min-w-0",
                  active
                    ? "bg-[var(--color-accent-bg-subtle)] text-[var(--color-accent)] font-medium"
                    : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]",
                ].join(" ")}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {active ? <FolderOpen size={13} className="shrink-0" /> : <Folder size={13} className="shrink-0" />}
                  <span className="truncate">{folder.name}</span>
                </span>
                <span className="text-xs tabular-nums ml-1">{folder._count.testCases}</span>
              </Link>

              {/* Delete */}
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(folder.id, folder.name)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)] transition-opacity shrink-0"
                title="Delete folder"
              >
                <Trash2 size={11} />
              </button>
            </div>

            {/* Children (indented) */}
            {hasChildren && isOpen && (
              <div className="ml-5 border-l border-[var(--color-border)] pl-1.5 mb-0.5">
                {children.map((child) => {
                  const childActive = activeFolderId === child.id;
                  return (
                    <div key={child.id} className="group flex items-center gap-0.5 mb-0.5 rounded-md">
                      <Link
                        href={`/p/${projectKey}/repository?folder=${child.id}`}
                        className={[
                          "flex-1 flex items-center justify-between px-2 py-1.5 rounded-md min-w-0",
                          childActive
                            ? "bg-[var(--color-accent-bg-subtle)] text-[var(--color-accent)] font-medium"
                            : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-fg)]",
                        ].join(" ")}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          {childActive ? <FolderOpen size={12} className="shrink-0" /> : <Folder size={12} className="shrink-0" />}
                          <span className="truncate text-xs">{child.name}</span>
                        </span>
                        <span className="text-xs tabular-nums ml-1">{child._count.testCases}</span>
                      </Link>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleDelete(child.id, child.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)] transition-opacity shrink-0"
                        title="Delete folder"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* New folder */}
      {adding ? (
        <form onSubmit={handleCreate} className="flex gap-1 mt-1.5 px-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setAdding(false); setNewName(""); }
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
