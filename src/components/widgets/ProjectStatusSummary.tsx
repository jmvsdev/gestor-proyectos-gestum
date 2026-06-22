import type { Task } from '../../data/types';

interface Props {
  tasks: Task[];
}

const SEGMENTS = [
  { key: 'sinAsignar', label: 'Sin asignar', color: '#BA7517' },
  { key: 'enCurso',    label: 'En curso',    color: '#378ADD' },
  { key: 'completadas', label: 'Completadas', color: '#639922' },
] as const;

export function ProjectStatusSummary({ tasks }: Props) {
  const total      = tasks.length;
  const sinAsignar = tasks.filter(t => !t.assigneeId).length;
  const enCurso    = tasks.filter(t => t.status === 'en-curso').length;
  const completadas = tasks.filter(t => t.status === 'completada').length;
  const pct        = total === 0 ? 0 : Math.round((completadas / total) * 100);

  const counts: Record<string, number> = { sinAsignar, enCurso, completadas };

  return (
    <div className="rounded-2xl shadow-sm border border-gray-100 bg-white px-4 py-3">
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#9aa0ad]">
          Progreso del proyecto
        </span>
        <span className="text-[20px] font-bold text-[#272b36]">{pct}%</span>
      </div>

      {total === 0 ? (
        <p className="text-[12px] text-[#9aa0ad] text-center py-3">Sin tareas aún</p>
      ) : (
        <>
          {/* Segmented bar */}
          <div className="h-2.5 rounded-full bg-[#f0f1f4] overflow-hidden flex mb-3">
            {SEGMENTS.map(s =>
              counts[s.key] > 0 ? (
                <div
                  key={s.key}
                  style={{ width: `${(counts[s.key] / total) * 100}%`, background: s.color }}
                  className="h-full transition-all duration-500"
                />
              ) : null,
            )}
          </div>

          {/* Per-state lines */}
          <div className="flex flex-col gap-[5px] mb-2">
            {SEGMENTS.map(s => (
              <div key={s.key} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-[#4a4f5c]">{s.label}</span>
                </div>
                <span className="font-semibold text-[#272b36]">{counts[s.key]}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="pt-2 border-t border-[#f0f1f4]">
        <span className="text-[11px] text-[#9aa0ad]">Total de tareas: {total}</span>
      </div>
    </div>
  );
}
