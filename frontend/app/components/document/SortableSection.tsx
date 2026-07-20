"use client"

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { SectionRenderer } from "./SectionRenderer";
import type { Section } from "@/types";

export function SortableSection({ section, index }: { section: Section; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50" : ""}
    >
      <div className="flex items-start gap-2 group">
        <button
          {...attributes}
          {...listeners}
          className="mt-2 opacity-0 group-hover:opacity-100 cursor-grab text-slate hover:text-ink transition-opacity"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1">
          <SectionRenderer section={section} sectionIndex={index} />
        </div>
      </div>
    </div>
  );
}
