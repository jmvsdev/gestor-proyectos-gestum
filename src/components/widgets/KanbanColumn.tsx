import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import type { Task, Assignee } from '../../data/types';

interface ColumnConfig {
  status: string;
  label: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
}

interface KanbanColumnProps {
  column: ColumnConfig;
  tasks: Task[];
  assignees: Assignee[];
  onTaskClick?: (task: Task) => void;
}

export function KanbanColumn({ column, tasks, assignees, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const taskIds = tasks.map(t => t.id);

  return (
    <div className="flex flex-col flex-shrink-0 w-[260px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: column.dotColor }} />
        <span className="text-[12.5px] font-semibold text-[#272b36] uppercase tracking-wide flex-1 truncate">
          {column.label}
        </span>
        <span
          className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
          style={{ background: column.badgeBg, color: column.badgeText }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Drop zone with sortable context */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={[
            'flex flex-col gap-2 flex-1 min-h-[60px] rounded-lg p-1 -m-1 transition-colors duration-150',
            isOver ? 'bg-[#eef0fd]' : '',
          ].join(' ')}
        >
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} assignees={assignees} onTaskClick={onTaskClick} />
          ))}
        </div>
      </SortableContext>

      {/* Add task */}
      <button
        type="button"
        className="mt-2 flex items-center gap-1.5 text-[12px] text-[#9aa0ad] hover:text-[#5a67f2] px-1 py-1.5 rounded-md hover:bg-[#eef0fd] transition-colors w-full"
      >
        <Plus size={14} />
        Agregar Tarea
      </button>
    </div>
  );
}
