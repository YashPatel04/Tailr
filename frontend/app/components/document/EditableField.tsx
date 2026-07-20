"use client"
import { useState, useRef, useCallback } from "react";

interface EditableFieldProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  tag?: "span" | "div" | "h2" | "h1";
}

export function EditableField({ value, onSave, className = "", tag: Tag = "span" }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLElement>(null);

  const startEdit = useCallback(() => {
    setDraft(value);
    setEditing(true);
    setTimeout(() => {
      if (ref.current) ref.current.focus();
    }, 0);
  }, [value]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== value && draft.trim()) {
      onSave(draft.trim());
    }
  }, [draft, value, onSave]);

  if (editing) {
    return (
      <input
        ref={ref as any}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={`border border-blue-400 rounded px-1 py-0 bg-white dark:bg-[#2d2d2d] text-inherit outline-none ${className}`}
        autoFocus
      />
    );
  }

  return (
    <Tag
      ref={ref as any}
      className={`cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-0.5 -mx-0.5 transition-colors ${className}`}
      onClick={startEdit}
      title="Click to edit"
    >
      {value}
    </Tag>
  );
}
