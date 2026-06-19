import type { Task, Assignee } from '../../data/types';

interface TeamViewProps {
  tasks: Task[];
  assignees: Assignee[];
}

const STATUS_COLOR: Record<Task['status'], string> = {
  'sin-empezar': '#9aa3b2',
  'en-curso':    '#5a67f2',
  'en-revision': '#f97316',
  'bloqueada':   '#ef4444',
  'por-validar': '#b58aa6',
  'completada':  '#1f9d63',
};

const STATUS_LABELS: Record<Task['status'], string> = {
  'sin-empezar': 'Sin empezar',
  'en-curso':    'En curso',
  'en-revision': 'En revisión',
  'bloqueada':   'Bloqueada',
  'por-validar': 'Por validar',
  'completada':  'Completada',
};

export function TeamView({ tasks, assignees }: TeamViewProps) {
  return (
    <div className="flex-1 overflow-auto min-h-0 px-[18px] py-4">
      <div className="grid grid-cols-1 gap-5" style={{ maxWidth: 900 }}>
        {assignees.filter(a => a.id !== 'sa').map(assignee => {
          const assigneeTasks = tasks.filter(t => t.assigneeId === assignee.id);
          const open = assigneeTasks.filter(t => t.status !== 'completada').length;
          const done = assigneeTasks.filter(t => t.status === 'completada').length;

          return (
            <div key={assignee.id} className="bg-white rounded-2xl border border-[#e8eaee] shadow-sm overflow-hidden">
              {/* Assignee header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f1f4]">
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-[14px] font-bold flex-shrink-0"
                  style={{ background: assignee.color }}
                >
                  {assignee.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                </span>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#272b36]">{assignee.name}</p>
                  <p className="text-[12px] text-[#9aa0ad]">{open} abiertas · {done} completadas</p>
                </div>
                <div className="flex gap-1.5">
                  {Object.entries(
                    assigneeTasks.reduce<Record<string, number>>((acc, t) => {
                      acc[t.status] = (acc[t.status] ?? 0) + 1;
                      return acc;
                    }, {})
                  ).map(([status, count]) => (
                    <span
                      key={status}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${STATUS_COLOR[status as Task['status']]}22`,
                        color: STATUS_COLOR[status as Task['status']],
                      }}
                    >
                      {count} {STATUS_LABELS[status as Task['status']]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Task list */}
              {assigneeTasks.length === 0 ? (
                <p className="px-5 py-4 text-[#9aa0ad] text-[13px]">Sin tareas asignadas en esta fase.</p>
              ) : (
                <div className="divide-y divide-[#f5f5f7]">
                  {assigneeTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#fafafa] transition-colors">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: STATUS_COLOR[task.status] }}
                      />
                      <span className="flex-1 text-[13px] font-medium text-[#272b36] truncate">{task.title}</span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: `${STATUS_COLOR[task.status]}22`,
                          color: STATUS_COLOR[task.status],
                        }}
                      >
                        {STATUS_LABELS[task.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned tasks */}
        {(() => {
          const unassigned = tasks.filter(t => t.assigneeId === null);
          if (unassigned.length === 0) return null;
          return (
            <div className="bg-white rounded-2xl border border-[#e8eaee] shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f1f4]">
                <span className="w-9 h-9 rounded-full bg-[#e8eaee] flex-shrink-0" />
                <div>
                  <p className="text-[14px] font-semibold text-[#272b36]">Sin asignar</p>
                  <p className="text-[12px] text-[#9aa0ad]">{unassigned.length} tarea{unassigned.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="divide-y divide-[#f5f5f7]">
                {unassigned.map(task => (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-2 h-2 rounded-full bg-[#9aa3b2] flex-shrink-0" />
                    <span className="flex-1 text-[13px] font-medium text-[#272b36] truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
