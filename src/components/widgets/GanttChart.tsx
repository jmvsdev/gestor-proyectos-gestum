import { useEffect, useRef, useState } from 'react';
import type { Task, Assignee, Phase } from '../../data/types';

interface GanttChartProps {
  tasks: Task[];
  assignees: Assignee[];
  phases?: Phase[]; // when provided, group tasks by phase (all-phases mode)
  onTasksChange: (tasks: Task[]) => void;
  onTaskClick?: (task: Task) => void;
}

const DAY_W = 30;
const ROW_H = 44;
const HEADER_H = 36;
const PHASE_H = 30; // height of phase swimlane header
const LABEL_W = 220;
const HANDLE_W = 8;
const MIN_DAYS = 1;

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatHeaderDay(date: Date): string {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// ── Status color ──────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<Task['status'], string> = {
  'sin-empezar': '#9aa3b2',
  'en-curso':    '#5a67f2',
  'en-revision': '#f97316',
  'bloqueada':   '#ef4444',
  'por-validar': '#b58aa6',
  'completada':  '#1f9d63',
};

// Distinct muted colors for phase swimlane headers
const PHASE_COLORS = [
  '#eef0fd', '#fff7ed', '#f0fdf4', '#fef9c3', '#fdf2f8', '#f0f9ff',
];

// ── Drag state ────────────────────────────────────────────────────────────────

type DragKind = 'move' | 'resize-start' | 'resize-end';

interface DragState {
  taskId: string;
  kind: DragKind;
  startX: number;
  origStart: string;
  origEnd: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GanttChart({ tasks, assignees, phases, onTasksChange, onTaskClick }: GanttChartProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const dated = tasks.filter(t => t.startDate && t.dueDate);
  const rangeStart = dated.length
    ? addDays(dated.reduce((min, t) => {
        const d = parseISO(t.startDate!);
        return d < min ? d : min;
      }, parseISO(dated[0].startDate!)), -2)
    : addDays(todayDate, -7);

  const rangeEnd = dated.length
    ? addDays(dated.reduce((max, t) => {
        const d = parseISO(t.dueDate!);
        return d > max ? d : max;
      }, parseISO(dated[0].dueDate!)), 4)
    : addDays(todayDate, 30);

  const totalDays = daysBetween(rangeStart, rangeEnd);

  const ticks: Date[] = [];
  for (let i = 0; i < totalDays; i += 3) {
    ticks.push(addDays(rangeStart, i));
  }

  // ── Drag handlers ───────────────────────────────────────────────────────────

  function startDrag(e: React.PointerEvent, task: Task, kind: DragKind) {
    e.preventDefault();
    e.stopPropagation();
    if (!task.startDate || !task.dueDate) return;
    setDrag({
      taskId: task.id,
      kind,
      startX: e.clientX,
      origStart: task.startDate,
      origEnd: task.dueDate,
    });
  }

  useEffect(() => {
    if (!drag) return;

    function onMove(e: PointerEvent) {
      if (!drag) return;
      const deltaX = e.clientX - drag.startX;
      const deltaDays = Math.round(deltaX / DAY_W);
      if (deltaDays === 0) return;

      const origS = parseISO(drag.origStart);
      const origE = parseISO(drag.origEnd);

      let newStart = drag.origStart;
      let newEnd = drag.origEnd;

      if (drag.kind === 'move') {
        newStart = toISO(addDays(origS, deltaDays));
        newEnd   = toISO(addDays(origE, deltaDays));
      } else if (drag.kind === 'resize-start') {
        const candidate = addDays(origS, deltaDays);
        if (daysBetween(candidate, origE) >= MIN_DAYS) newStart = toISO(candidate);
      } else {
        const candidate = addDays(origE, deltaDays);
        if (daysBetween(origS, candidate) >= MIN_DAYS) newEnd = toISO(candidate);
      }

      const task = tasks.find(t => t.id === drag.taskId);
      if (!task || (task.startDate === newStart && task.dueDate === newEnd)) return;

      onTasksChange(tasks.map(t =>
        t.id === drag.taskId ? { ...t, startDate: newStart, dueDate: newEnd } : t
      ));
    }

    function onUp() { setDrag(null); }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, tasks, onTasksChange]);

  // ── Build row list (with optional swimlane headers) ─────────────────────────

  const timelineW = totalDays * DAY_W;
  const todayLeft = daysBetween(rangeStart, todayDate) * DAY_W;

  type Row =
    | { type: 'task'; task: Task; rowIdx: number }
    | { type: 'header'; phase: Phase; colorBg: string };

  const rows: Row[] = [];

  if (phases) {
    let taskIdx = 0;
    phases.forEach((phase, pi) => {
      const phaseTasks = tasks.filter(t => t.phaseId === phase.id);
      if (phaseTasks.length === 0) return;
      rows.push({ type: 'header', phase, colorBg: PHASE_COLORS[pi % PHASE_COLORS.length] });
      phaseTasks.forEach(task => rows.push({ type: 'task', task, rowIdx: taskIdx++ }));
    });
    // Tasks not matching any listed phase
    const knownPhaseIds = new Set(phases.map(p => p.id));
    const orphans = tasks.filter(t => !knownPhaseIds.has(t.phaseId));
    orphans.forEach(task => rows.push({ type: 'task', task, rowIdx: rows.length }));
  } else {
    tasks.forEach((task, i) => rows.push({ type: 'task', task, rowIdx: i }));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto min-h-0 bg-white select-none"
      style={{ cursor: drag ? (drag.kind === 'move' ? 'grabbing' : 'ew-resize') : 'default' }}
    >
      <div style={{ minWidth: LABEL_W + timelineW }}>
        {/* Date header */}
        <div className="flex sticky top-0 z-10 bg-white border-b border-[#e8eaee]" style={{ height: HEADER_H }}>
          <div className="flex-shrink-0 border-r border-[#e8eaee] flex items-center px-4" style={{ width: LABEL_W }}>
            <span className="text-[11px] font-semibold text-[#9aa0ad] uppercase tracking-wide">Tarea</span>
          </div>
          <div className="relative flex-1" style={{ width: timelineW }}>
            {ticks.map((tick, i) => (
              <div key={i} className="absolute top-0 flex flex-col items-start" style={{ left: daysBetween(rangeStart, tick) * DAY_W }}>
                <div className="w-px h-2 bg-[#e8eaee] mt-auto mb-0" />
                <span className="text-[10.5px] text-[#9aa0ad] font-medium pl-[3px] pb-[5px]">{formatHeaderDay(tick)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {rows.map((row) => {
          if (row.type === 'header') {
            return (
              <div
                key={`ph-${row.phase.id}`}
                className="flex items-center border-b border-[#e8eaee] sticky"
                style={{ height: PHASE_H, background: row.colorBg, top: HEADER_H, zIndex: 5 }}
              >
                <div className="flex-shrink-0 px-4" style={{ width: LABEL_W }}>
                  <span className="text-[11.5px] font-bold text-[#4a4f5c] truncate">{row.phase.name}</span>
                </div>
                <div className="flex-1 relative" style={{ width: timelineW }}>
                  {/* Today line in phase header */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-[#5a67f2] opacity-40"
                    style={{ left: todayLeft }}
                  />
                </div>
              </div>
            );
          }

          const { task, rowIdx } = row;
          const assignee = assignees.find(a => a.id === task.assigneeId);
          const barColor = STATUS_COLOR[task.status];
          const hasBar = task.startDate && task.dueDate;
          const barLeft = hasBar ? daysBetween(rangeStart, parseISO(task.startDate!)) * DAY_W : 0;
          const barWidth = hasBar ? Math.max(daysBetween(parseISO(task.startDate!), parseISO(task.dueDate!)) * DAY_W, DAY_W) : 0;
          const isDragging = drag?.taskId === task.id;

          return (
            <div
              key={task.id}
              className={`flex border-b border-[#f0f1f4] ${rowIdx % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}`}
              style={{ height: ROW_H }}
            >
              <div
                className="flex-shrink-0 flex items-center gap-2 px-4 border-r border-[#e8eaee] group"
                style={{ width: LABEL_W, height: ROW_H, cursor: onTaskClick ? 'pointer' : 'default' }}
                onClick={() => onTaskClick?.(task)}
              >
                {assignee && assignee.id !== 'sa' ? (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold flex-shrink-0"
                    style={{ background: assignee.color }}
                  >
                    {assignee.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-[#e8eaee] flex-shrink-0" />
                )}
                <span className="text-[12.5px] text-[#272b36] truncate font-medium group-hover:text-[#5a67f2] transition-colors">{task.title}</span>
              </div>

              <div className="relative flex-1" style={{ width: timelineW, height: ROW_H }}>
                {ticks.map((tick, j) => (
                  <div key={j} className="absolute top-0 bottom-0 w-px bg-[#f0f1f4]" style={{ left: daysBetween(rangeStart, tick) * DAY_W }} />
                ))}
                <div className="absolute top-0 bottom-0 w-[2px] bg-[#5a67f2] opacity-60 z-10" style={{ left: todayLeft }} />
                {hasBar && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rounded-[5px] flex items-center group"
                    style={{
                      left: barLeft, width: barWidth, height: 26,
                      background: barColor, opacity: isDragging ? 0.6 : 1,
                      cursor: drag ? (drag.kind === 'move' ? 'grabbing' : 'ew-resize') : 'grab',
                    }}
                    onPointerDown={e => startDrag(e, task, 'move')}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      style={{ width: HANDLE_W, cursor: 'ew-resize' }}
                      onPointerDown={e => startDrag(e, task, 'resize-start')}
                    >
                      <div className="w-[3px] h-3 rounded-full bg-white opacity-70" />
                    </div>
                    {barWidth > 60 && (
                      <span className="text-white text-[10.5px] font-semibold truncate px-2 pointer-events-none" style={{ maxWidth: barWidth - 20 }}>
                        {task.title}
                      </span>
                    )}
                    <div
                      className="absolute right-0 top-0 bottom-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      style={{ width: HANDLE_W, cursor: 'ew-resize' }}
                      onPointerDown={e => startDrag(e, task, 'resize-end')}
                    >
                      <div className="w-[3px] h-3 rounded-full bg-white opacity-70" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
