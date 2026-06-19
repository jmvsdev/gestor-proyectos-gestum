import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { Task, Assignee } from '../../data/types';

interface KanbanBoardProps {
  tasks: Task[];
  assignees: Assignee[];
  accentColor: string;
  onTasksChange: (tasks: Task[]) => void;
  onTaskClick?: (task: Task) => void;
}

const COLUMNS: { status: Task['status']; label: string; dotColor: string; badgeBg: string; badgeText: string }[] = [
  { status: 'sin-empezar', label: 'Sin empezar', dotColor: '#9aa3b2', badgeBg: '#f0f1f4', badgeText: '#6b7280' },
  { status: 'en-curso',    label: 'En curso',    dotColor: '#5a67f2', badgeBg: '#eef0fd', badgeText: '#5a67f2' },
  { status: 'en-revision', label: 'En revisión', dotColor: '#f97316', badgeBg: '#fff4ed', badgeText: '#f97316' },
  { status: 'bloqueada',   label: 'Bloqueada',   dotColor: '#ef4444', badgeBg: '#fef2f2', badgeText: '#ef4444' },
  { status: 'por-validar', label: 'Por validar', dotColor: '#b58aa6', badgeBg: '#f8f4f7', badgeText: '#b58aa6' },
  { status: 'completada',  label: 'Completada',  dotColor: '#1f9d63', badgeBg: '#ecfdf5', badgeText: '#1f9d63' },
];

/** Returns the column status for a given id (task id → its status, column status → itself) */
function resolveStatus(id: string, tasks: Task[]): Task['status'] | null {
  const asTask = tasks.find(t => t.id === id);
  if (asTask) return asTask.status;
  if (COLUMNS.some(c => c.status === id)) return id as Task['status'];
  return null;
}

export function KanbanBoard({ tasks, assignees, onTasksChange, onTaskClick }: KanbanBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTaskId(active.id as string);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overStatus = resolveStatus(overId, tasks);
    if (!overStatus || activeTask.status === overStatus) return;

    // Cross-column live preview: move task to new column
    onTasksChange(tasks.map(t =>
      t.id === activeId ? { ...t, status: overStatus } : t
    ));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTaskId(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find(t => t.id === overId);

    if (overTask && activeTask.status === overTask.status) {
      // Same column — reorder using arrayMove on the full array
      const activeIndex = tasks.findIndex(t => t.id === activeId);
      const overIndex = tasks.findIndex(t => t.id === overId);
      onTasksChange(arrayMove(tasks, activeIndex, overIndex));
    }
    // Cross-column case already handled by handleDragOver (live preview)
  }

  function handleDragCancel() {
    setActiveTaskId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 px-[18px] pb-[22px] pt-3">
        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.status}
              column={col}
              tasks={tasks.filter(t => t.status === col.status)}
              assignees={assignees}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-[260px]">
            <KanbanCard task={activeTask} assignees={assignees} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
