import { Flag } from 'lucide-react';
import type { Task, Assignee } from '../../data/types';

interface ListViewProps {
  tasks: Task[];
  assignees: Assignee[];
  onTasksChange: (tasks: Task[]) => void;
  onTaskClick?: (task: Task) => void;
  readOnly?: boolean;
}

const STATUS_LABELS: Record<Task['status'], string> = {
  'sin-empezar': 'Sin empezar',
  'en-curso':    'En curso',
  'en-revision': 'En revisión',
  'bloqueada':   'Bloqueada',
  'por-validar': 'Por validar',
  'completada':  'Completada',
};

const STATUS_COLOR: Record<Task['status'], string> = {
  'sin-empezar': '#9aa3b2',
  'en-curso':    '#5a67f2',
  'en-revision': '#f97316',
  'bloqueada':   '#ef4444',
  'por-validar': '#b58aa6',
  'completada':  '#1f9d63',
};

const PRIORITY_COLOR: Record<NonNullable<Task['priority']>, string> = {
  urgente: '#ef4444',
  alta:    '#f5b400',
  normal:  '#5a67f2',
  baja:    '#9aa3b2',
};

const RISK_CONFIG: Record<NonNullable<Task['risk']>, { label: string; color: string; bg: string }> = {
  alto:  { label: 'Alto',  color: '#ef4444', bg: '#fef2f2' },
  medio: { label: 'Medio', color: '#f5b400', bg: '#fffbeb' },
  bajo:  { label: 'Bajo',  color: '#1f9d63', bg: '#f0fdf4' },
};

const ALL_STATUSES: Task['status'][] = [
  'sin-empezar','en-curso','en-revision','bloqueada','por-validar','completada',
];

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  const months = ['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sep.','oct.','nov.','dic.'];
  return `${months[m - 1]} ${d}`;
}

export function ListView({ tasks, assignees, onTasksChange, onTaskClick, readOnly = false }: ListViewProps) {
  function handleStatusChange(taskId: string, newStatus: Task['status']) {
    onTasksChange(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  }

  return (
    <div className="flex-1 overflow-auto min-h-0 px-[18px] py-4">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#e8eaee]">
            <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide w-[40%]">Tarea</th>
            <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide">Asignado</th>
            <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide">Estado</th>
            <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide">Prioridad</th>
            <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide">Inicio</th>
            <th className="text-left py-2 px-3 text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide">Vence</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-[#9aa0ad]">No hay tareas en esta fase.</td>
            </tr>
          )}
          {tasks.map((task, i) => {
            const assignee = assignees.find(a => a.id === task.assigneeId);
            const statusColor = STATUS_COLOR[task.status];
            return (
              <tr
                key={task.id}
                className={`border-b border-[#f0f1f4] hover:bg-[#f6f7f9] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}`}
              >
                {/* Title — click opens edit modal */}
                <td
                  className="py-2.5 px-3"
                  onClick={() => onTaskClick?.(task)}
                  style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {task.isMilestone && (
                      <span title="Hito" className="text-[13px] leading-none flex-shrink-0">🚩</span>
                    )}
                    <span className="font-medium text-[#272b36] hover:text-[#5a67f2] transition-colors">{task.title}</span>
                    {task.risk && (
                      <span
                        className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: RISK_CONFIG[task.risk].color, background: RISK_CONFIG[task.risk].bg }}
                      >
                        {RISK_CONFIG[task.risk].label}
                      </span>
                    )}
                    {task.tags && task.tags.length > 0 && task.tags.map(tag => (
                      <span key={tag} className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-[#eef0fd] text-[#5a67f2] font-medium">{tag}</span>
                    ))}
                  </div>
                </td>

                {/* Assignee */}
                <td className="py-2.5 px-3">
                  {assignee && assignee.id !== 'sa' ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-semibold flex-shrink-0"
                        style={{ background: assignee.color }}
                      >
                        {assignee.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                      </span>
                      <span className="text-[#4a4f5c]">{assignee.shortName}</span>
                    </div>
                  ) : (
                    <span className="text-[#9aa0ad]">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="py-2.5 px-3">
                  <select
                    value={task.status}
                    onChange={e => handleStatusChange(task.id, e.target.value as Task['status'])}
                    disabled={readOnly}
                    className="text-[12px] font-semibold rounded-full px-2 py-0.5 border-0 outline-none"
                    style={{
                      background: `${statusColor}22`,
                      color: statusColor,
                      cursor: readOnly ? 'default' : 'pointer',
                    }}
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </td>

                {/* Priority */}
                <td className="py-2.5 px-3">
                  {task.priority ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium"
                      style={{ color: PRIORITY_COLOR[task.priority] }}
                    >
                      <Flag size={11} />
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  ) : (
                    <span className="text-[#c3c7d0]">—</span>
                  )}
                </td>

                {/* Start date */}
                <td className="py-2.5 px-3 text-[#8b909c]">
                  {task.startDate ? formatDate(task.startDate) : '—'}
                </td>

                {/* Due date */}
                <td className="py-2.5 px-3 text-[#8b909c]">
                  {task.dueDate ? formatDate(task.dueDate) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
