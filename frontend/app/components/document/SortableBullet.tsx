"use client"

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { BulletRenderer } from "./BulletRenderer";
import { useSessionStore } from "@/stores/sessionStore";
import type { Bullet } from "@/types";

export function SortableBullet({ bullet, sectionLabel, entryIndex, bulletIndex }: {
  bullet: Bullet;
  sectionLabel: string;
  entryIndex: number;
  bulletIndex: number;
}) {
  const viewMode = useSessionStore((s) => s.viewMode)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bullet.id,
    disabled: viewMode === "diff",
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50" : ""}
    >
      <div className="flex items-start gap-1 group">
        {viewMode !== "diff" && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1.5 opacity-0 group-hover:opacity-100 cursor-grab text-slate hover:text-ink transition-opacity"
          >
            <GripVertical size={14} />
          </button>
        )}
        <div className="flex-1">
          <BulletRenderer bullet={bullet} sectionLabel={sectionLabel} entryIndex={entryIndex} bulletIndex={bulletIndex} />
        </div>
      </div>
    </div>
  );
}
