import { Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import type { Task } from '../../data/types';

interface CompletedThisWeekCardProps {
  tasks: Task[];
  today: string; // YYYY-MM-DD
}

function addDaysToISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function relativeDay(iso: string, today: string): string {
  const [ty, tm, td] = today.split('-').map(Number);
  const [iy, im, id] = iso.split('-').map(Number);
  const todayMs = new Date(ty, tm - 1, td).getTime();
  const isoMs   = new Date(iy, im - 1, id).getTime();
  const diff = Math.round((isoMs - todayMs) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  if (diff < 0)  return `hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`;
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const [, sm, sd] = iso.split('-').map(Number);
  return `${sd} ${months[sm - 1]}`;
}

export function CompletedThisWeekCard({ tasks, today }: CompletedThisWeekCardProps) {
  const weekEnd = addDaysToISO(today, 7);

  const dueThisWeek = tasks.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd);
  const completedThisWeek = dueThisWeek.filter(t => t.status === 'completada');
  const pendingThisWeek   = dueThisWeek.filter(t => t.status !== 'completada');
  const total = dueThisWeek.length;
  const done  = completedThisWeek.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : null;

  const upcoming = tasks
    .filter(t => t.dueDate && t.dueDate >= today && t.status !== 'completada')
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 3);

  const nextFuture = tasks
    .filter(t => t.dueDate && t.dueDate > weekEnd && t.status !== 'completada')
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 2);

  let pctColor = '#9aa3b2';
  if (pct !== null) {
    if (pct >= 80) pctColor = '#1f9d63';
    else if (pct >= 40) pctColor = '#f5b400';
    else pctColor = '#ef4444';
  }

  return (
    <Card className="p-[18px_20px] flex flex-col gap-3">
      <div className="text-[14px] font-bold text-[#272b36]">Tareas completadas esta semana</div>

      {total === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[160px] text-center">
          <Calendar size={36} strokeWidth={1.3} className="text-[#c3c7d0]" />
          <p className="text-[13px] text-[#9aa0ad]">Sin tareas programadas esta semana.</p>
          {nextFuture.length > 0 && (
            <div className="w-full mt-1 text-left">
              <p className="text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide mb-1.5">Próximas</p>
              {nextFuture.map(t => (
                <div key={t.id} className="flex items-center justify-between py-[3px]">
                  <span className="text-[12.5px] text-[#4a4f5c] truncate flex-1 mr-2">{t.title}</span>
                  <span className="text-[11.5px] text-[#9aa0ad] flex-shrink-0">{relativeDay(t.dueDate!, today)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Counters */}
          <div className="flex gap-3">
            <div className="flex-1 bg-[#f6f7f9] rounded-xl px-3 py-2 text-center">
              <div className="text-[22px] font-bold text-[#272b36]">{total}</div>
              <div className="text-[11px] text-[#9aa0ad]">vencen esta semana</div>
            </div>
            <div className="flex-1 bg-[#f6f7f9] rounded-xl px-3 py-2 text-center">
              <div className="text-[22px] font-bold" style={{ color: pctColor }}>{done}</div>
              <div className="text-[11px] text-[#9aa0ad]">completadas</div>
            </div>
          </div>

          {/* Compliance bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-semibold text-[#4a4f5c]">Cumplimiento</span>
              <span className="text-[13px] font-bold" style={{ color: pctColor }}>{pct}%</span>
            </div>
            <div className="w-full h-2 bg-[#e8eaee] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: pctColor }}
              />
            </div>
          </div>

          {/* Upcoming pending tasks */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide mb-1">Pendientes</p>
              {upcoming.map(t => (
                <div key={t.id} className="flex items-center justify-between py-[3px]">
                  <span className="text-[12px] text-[#4a4f5c] truncate flex-1 mr-2">{t.title}</span>
                  <span
                    className="text-[11px] font-semibold flex-shrink-0"
                    style={{ color: pendingThisWeek.find(p => p.id === t.id) ? pctColor : '#9aa0ad' }}
                  >
                    {relativeDay(t.dueDate!, today)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
