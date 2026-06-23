import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task, Assignee } from '../../data/types';

interface CalendarViewProps {
  tasks: Task[];
  assignees: Assignee[];
  onTaskClick?: (task: Task) => void;
}

const STATUS_COLOR: Record<Task['status'], string> = {
  'sin-empezar': '#9aa3b2',
  'en-curso':    '#5a67f2',
  'en-revision': '#f97316',
  'bloqueada':   '#ef4444',
  'por-validar': '#b58aa6',
  'completada':  '#1f9d63',
};

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Build a 6-row × 7-col grid of dates for a given month */
function buildCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0 = Sun
  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - startOffset + i);
    dates.push(d);
  }
  return dates;
}

interface TaskBar {
  task: Task;
  startCol: number; // 0–6
  endCol: number;   // 0–6
  lane: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

/** Assign task bars for a 7-day week window */
function buildWeekBars(weekDates: Date[], tasks: Task[]): TaskBar[] {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const candidates: Omit<TaskBar, 'lane'>[] = tasks
    .filter(t => t.dueDate)
    .map(t => {
      const e = parseISO(t.dueDate!);
      const s = t.startDate ? parseISO(t.startDate) : e;
      if (e < weekStart || s > weekEnd) return null;
      const startCol = Math.max(0, Math.round((s.getTime() - weekStart.getTime()) / 86400000));
      const endCol   = Math.min(6, Math.round((e.getTime() - weekStart.getTime()) / 86400000));
      return {
        task: t,
        startCol,
        endCol: Math.max(startCol, endCol),
        continuesLeft:  s < weekStart,
        continuesRight: e > weekEnd,
      };
    })
    .filter((x): x is Omit<TaskBar, 'lane'> => x !== null);

  // Greedy lane assignment (no two bars share a lane if they overlap columns)
  const result: TaskBar[] = [];
  for (const c of candidates) {
    let lane = 0;
    while (result.some(r => r.lane === lane && r.startCol <= c.endCol && r.endCol >= c.startCol)) {
      lane++;
    }
    result.push({ ...c, lane });
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

const MAX_LANES_VISIBLE = 3;
const LANE_H = 20; // px per lane
const DAY_HEADER_H = 28; // px for day number
const CELL_PADDING = 4; // px top/bottom padding per cell

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const grid = buildCalendarGrid(year, month);
  const weeks: Date[][] = [];
  for (let i = 0; i < 6; i++) weeks.push(grid.slice(i * 7, i * 7 + 7));

  const todayISO = toISO(today);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto bg-white">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#e8eaee] flex-shrink-0">
        <h2 className="text-[15px] font-semibold text-[#272b36]">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0f1f4] transition-colors text-[#8b909c] border-0 bg-transparent cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            className="px-3 h-8 text-[12.5px] font-medium text-[#5a67f2] rounded-lg hover:bg-[#eef0fd] transition-colors border-0 bg-transparent cursor-pointer"
          >
            Hoy
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f0f1f4] transition-colors text-[#8b909c] border-0 bg-transparent cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-[#e8eaee] flex-shrink-0">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {weeks.map((week, wi) => {
          const bars = buildWeekBars(week, tasks);
          const maxLane = bars.length > 0 ? Math.max(...bars.map(b => b.lane)) : -1;
          const lanesShown = Math.min(maxLane + 1, MAX_LANES_VISIBLE);
          const rowH = DAY_HEADER_H + CELL_PADDING * 2 + lanesShown * LANE_H + (maxLane >= MAX_LANES_VISIBLE ? LANE_H : 0);

          return (
            <div
              key={wi}
              className="relative grid grid-cols-7 border-b border-[#e8eaee]"
              style={{ minHeight: rowH }}
            >
              {/* Day cells */}
              {week.map((date, di) => {
                const isCurrentMonth = date.getMonth() === month;
                const isToday = toISO(date) === todayISO;
                return (
                  <div
                    key={di}
                    className={`border-r border-[#f0f1f4] last:border-r-0 ${!isCurrentMonth ? 'bg-[#fafafa]' : ''}`}
                    style={{ minHeight: rowH }}
                  >
                    <div className="flex items-center justify-center pt-1.5 pb-0.5">
                      <span
                        className={[
                          'w-6 h-6 flex items-center justify-center rounded-full text-[12.5px] font-semibold',
                          isToday
                            ? 'bg-[#5a67f2] text-white'
                            : isCurrentMonth
                              ? 'text-[#272b36]'
                              : 'text-[#c3c7d0]',
                        ].join(' ')}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Task bars — absolutely positioned over the grid */}
              <div className="absolute inset-0 pointer-events-none" style={{ top: DAY_HEADER_H + CELL_PADDING }}>
                {bars.map(({ task, startCol, endCol, lane, continuesLeft, continuesRight }) => {
                  if (lane >= MAX_LANES_VISIBLE) return null;
                  const colW = 100 / 7;
                  const left = `${startCol * colW + (continuesLeft ? 0 : 0.3)}%`;
                  const width = `${(endCol - startCol + 1) * colW - (continuesLeft ? 0 : 0.3) - (continuesRight ? 0 : 0.3)}%`;
                  const color = STATUS_COLOR[task.status];
                  return (
                    <div
                      key={`${task.id}-w${wi}`}
                      title={task.title}
                      onClick={() => onTaskClick?.(task)}
                      className="absolute flex items-center overflow-hidden pointer-events-auto cursor-pointer hover:brightness-110 transition-all"
                      style={{
                        left,
                        width,
                        top: lane * LANE_H,
                        height: LANE_H - 3,
                        background: color,
                        borderRadius: continuesLeft
                          ? (continuesRight ? 0 : '0 4px 4px 0')
                          : (continuesRight ? '4px 0 0 4px' : 4),
                        paddingLeft: continuesLeft ? 4 : 6,
                        paddingRight: continuesRight ? 0 : 4,
                      }}
                    >
                      {!continuesLeft && (
                        <span className="text-white text-[10.5px] font-semibold truncate leading-none">
                          {task.title}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* "+N more" indicator per column */}
                {week.map((_, di) => {
                  const overflow = bars.filter(b => b.startCol <= di && b.endCol >= di && b.lane >= MAX_LANES_VISIBLE);
                  if (overflow.length === 0) return null;
                  const colW = 100 / 7;
                  return (
                    <div
                      key={`overflow-${di}`}
                      className="absolute text-[10.5px] font-semibold text-[#9aa0ad]"
                      style={{
                        left: `${di * colW + 0.5}%`,
                        width: `${colW}%`,
                        top: MAX_LANES_VISIBLE * LANE_H,
                      }}
                    >
                      +{overflow.length} más
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
