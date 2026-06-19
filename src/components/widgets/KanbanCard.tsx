import { useEffect, useRef } from 'react';
import { Calendar, Flag } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import type { Task, Assignee } from '../../data/types';

interface KanbanCardProps {
  task: Task;
  assignees: Assignee[];
  isOverlay?: boolean;
  onTaskClick?: (task: Task) => void;
}

const PRIORITY_CONFIG = {
  urgente: { label: 'Urgente', color: '#ef4444', bg: '#fef2f2' },
  alta:    { label: 'Alta',    color: '#f5b400', bg: '#fffbeb' },
  normal:  { label: 'Normal',  color: '#5a67f2', bg: '#eef0fd' },
  baja:    { label: 'Baja',    color: '#9aa3b2', bg: '#f6f7f9' },
} as const;

const RISK_CONFIG = {
  alto:  { label: 'Riesgo alto',  color: '#ef4444', bg: '#fef2f2' },
  medio: { label: 'Riesgo medio', color: '#f5b400', bg: '#fffbeb' },
  bajo:  { label: 'Riesgo bajo',  color: '#1f9d63', bg: '#f0fdf4' },
} as const;

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  const months = ['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sep.','oct.','nov.','dic.'];
  return `${months[m - 1]} ${d}`;
}

export function KanbanCard({ task, assignees, isOverlay = false, onTaskClick }: KanbanCardProps) {
  const assignee = assignees.find(a => a.id === task.assigneeId);
  const priority = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const risk     = task.risk     ? RISK_CONFIG[task.risk]         : null;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  // Track whether a real drag occurred so we can suppress the click handler.
  // isDragging goes true only after the activation distance (5px) is crossed.
  const wasDragging = useRef(false);
  useEffect(() => {
    if (isDragging) wasDragging.current = true;
  }, [isDragging]);

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px,${transform.y}px,0) scaleX(${transform.scaleX ?? 1}) scaleY(${transform.scaleY ?? 1})`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isOverlay) return;
        if (wasDragging.current) { wasDragging.current = false; return; }
        onTaskClick?.(task);
      }}
      className={[
        'bg-white rounded-lg border border-[#e8eaee] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] select-none touch-none',
        isOverlay
          ? 'shadow-[0_8px_24px_rgba(0,0,0,0.14)] cursor-grabbing rotate-[1.5deg] scale-105'
          : isDragging
            ? 'opacity-30 cursor-grabbing'
            : 'hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:border-[#d0d3dc] cursor-grab transition-shadow',
      ].join(' ')}
    >
      <div className="flex items-start gap-1 mb-2.5">
        {task.isMilestone && <span title="Hito" className="text-[13px] leading-[1.4] flex-shrink-0">🚩</span>}
        <p className="text-[13px] font-medium text-[#272b36] leading-[1.4]">{task.title}</p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {assignee && assignee.id !== 'sa' ? (
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-semibold flex-shrink-0"
            style={{ background: assignee.color }}
            title={assignee.name}
          >
            {assignee.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#e8eaee] flex-shrink-0" />
        )}

        {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#8b909c]">
            <Calendar size={11} />
            {formatDate(task.dueDate)}
          </span>
        )}

        {risk && (
          <span
            className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ color: risk.color, background: risk.bg }}
            title={risk.label}
          >
            ▲
          </span>
        )}

        {priority && (
          <span
            className="inline-flex items-center gap-0.5 text-[10.5px] font-medium px-1.5 py-0.5 rounded-full ml-auto"
            style={{ color: priority.color, background: priority.bg }}
          >
            <Flag size={9} />
            {priority.label}
          </span>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map(tag => (
            <span
              key={tag}
              className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-[#eef0fd] text-[#5a67f2] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
