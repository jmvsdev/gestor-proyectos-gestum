import { useMemo, useState } from 'react';
import {
  GanttChartSquare, List, LayoutDashboard, Calendar, LayoutGrid, Users,
  Eye,
} from 'lucide-react';
import type { Assignee, FilterState, Phase, Task } from '../../data/types';
import { EMPTY_FILTERS, applyFilters } from '../../data/types';
import type { SharePayload } from '../../utils/share';
import { FilterPanel } from '../widgets/FilterPanel';
import { TaskFormModal } from '../widgets/TaskFormModal';
import { GanttChart } from '../widgets/GanttChart';
import { ListView } from '../widgets/ListView';
import { CalendarView } from '../widgets/CalendarView';
import { DashboardGrid } from '../widgets/DashboardGrid';
import { KanbanBoard } from '../widgets/KanbanBoard';
import { TeamView } from '../widgets/TeamView';

const ACCENT = '#5a67f2';

const TABS = [
  { label: 'Tablero',    Icon: LayoutGrid },
  { label: 'Calendario', Icon: Calendar },
  { label: 'Equipo',     Icon: Users },
  { label: 'Gantt',      Icon: GanttChartSquare },
  { label: 'Lista',      Icon: List },
  { label: 'Panel',      Icon: LayoutDashboard },
];

const OPEN_STATUSES = ['sin-empezar','en-curso','en-revision','bloqueada','por-validar'] as const;

interface ReadOnlyShellProps {
  payload: SharePayload;
}

export function ReadOnlyShell({ payload }: ReadOnlyShellProps) {
  const [activePhaseId, setActivePhaseId] = useState<string>(
    payload.phases.find(p => !p.isImport)?.id ?? payload.phases[0]?.id ?? ''
  );
  const [activeTab, setActiveTab] = useState('Panel');
  const [filters, setFilters]         = useState<FilterState>(EMPTY_FILTERS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const phaseTasks = useMemo(
    () => payload.tasks.filter(t => t.phaseId === activePhaseId),
    [payload.tasks, activePhaseId]
  );

  const filteredTasks = useMemo(
    () => applyFilters(phaseTasks, filters),
    [phaseTasks, filters]
  );

  const allAssignees: Assignee[] = useMemo(() =>
    payload.assignees.map(a => ({
      ...a,
      totalTasks: a.id === 'sa'
        ? payload.tasks.filter(t => !t.assigneeId).length
        : payload.tasks.filter(t => t.assigneeId === a.id).length,
      openTasks: a.id === 'sa'
        ? payload.tasks.filter(t => !t.assigneeId && OPEN_STATUSES.includes(t.status as typeof OPEN_STATUSES[number])).length
        : payload.tasks.filter(t => t.assigneeId === a.id && OPEN_STATUSES.includes(t.status as typeof OPEN_STATUSES[number])).length,
    })),
    [payload.assignees, payload.tasks]
  );

  const dynamicPhases: Phase[] = useMemo(() =>
    payload.phases.map(p => ({
      ...p,
      taskCount: payload.tasks.filter(t => t.phaseId === p.id).length,
      active: p.id === activePhaseId,
    })),
    [payload.phases, payload.tasks, activePhaseId]
  );

  const kpis = [
    { label: 'En curso',    value: payload.tasks.filter(t => t.status === 'en-curso').length,   color: ACCENT },
    { label: 'Por validar', value: payload.tasks.filter(t => t.status === 'por-validar').length, color: '#b58aa6' },
    { label: 'Completadas', value: payload.tasks.filter(t => t.status === 'completada').length,  color: '#1f9d63' },
  ];
  const workload = [
    { label: 'Sin empezar', value: payload.tasks.filter(t => t.status === 'sin-empezar').length, color: '#9aa3b2' },
    { label: 'En curso',    value: payload.tasks.filter(t => t.status === 'en-curso').length,    color: ACCENT },
    { label: 'En revisión', value: payload.tasks.filter(t => t.status === 'en-revision').length, color: '#f97316' },
    { label: 'Bloqueada',   value: payload.tasks.filter(t => t.status === 'bloqueada').length,   color: '#ef4444' },
    { label: 'Por validar', value: payload.tasks.filter(t => t.status === 'por-validar').length, color: '#b58aa6' },
  ];
  const completedThisWeek = phaseTasks.filter(t => t.status === 'completada').length;

  const noop = () => {};

  return (
    <div className="flex flex-col h-screen overflow-hidden text-[#272b36] bg-[#f6f7f9]" style={{ fontSize: 13, lineHeight: 1.45 }}>

      {/* Read-only banner */}
      <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-5 py-2 flex-shrink-0">
        <Eye size={15} className="text-amber-600 flex-shrink-0" />
        <span className="text-[12.5px] font-semibold text-amber-800">Solo lectura</span>
        <span className="hidden sm:inline text-[12.5px] text-amber-700">—</span>
        <span className="hidden sm:inline text-[12.5px] font-medium text-amber-800">{payload.projectName}</span>
        <span className="ml-auto text-[11.5px] text-amber-600 hidden sm:inline">Snapshot compartido · no se pueden hacer cambios</span>
      </div>

      {/* Phase selector */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 bg-white border-b border-gray-200 overflow-x-auto flex-shrink-0">
        {dynamicPhases.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePhaseId(p.id)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium border-0 cursor-pointer transition-colors flex-shrink-0"
            style={{
              background: p.active ? `${ACCENT}18` : 'transparent',
              color: p.active ? ACCENT : '#4a4f5c',
              fontWeight: p.active ? 700 : 500,
            }}
          >
            {p.name}
            {p.taskCount > 0 && (
              <span
                className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: p.active ? `${ACCENT}22` : '#f0f1f4',
                  color: p.active ? ACCENT : '#9aa0ad',
                }}
              >{p.taskCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab selector + filter button */}
      <div className="flex items-center bg-white border-b border-gray-200 flex-shrink-0 overflow-hidden">
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none px-2 sm:px-5">
          {TABS.map(({ label, Icon }) => {
            const active = activeTab === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(label)}
                className="flex items-center gap-[6px] bg-transparent border-0 px-[11px] pb-[11px] pt-2 text-[13px] cursor-pointer transition-colors flex-shrink-0 whitespace-nowrap"
                style={{
                  color: active ? ACCENT : '#8b909c',
                  fontWeight: active ? 600 : 500,
                  borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
                }}
              >
                <Icon size={14} strokeWidth={2} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Filters — hidden for Panel view (aggregate stats) */}
        {activeTab !== 'Panel' && (
          <div className="flex-shrink-0 py-1.5 pr-2 sm:pr-5">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              assignees={allAssignees}
              accentColor={ACCENT}
            />
          </div>
        )}
      </div>

      {/* View content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'Tablero' ? (
          <KanbanBoard tasks={filteredTasks} assignees={allAssignees} accentColor={ACCENT} onTasksChange={noop} onTaskClick={setSelectedTask} />
        ) : activeTab === 'Gantt' ? (
          <GanttChart tasks={filteredTasks} assignees={allAssignees} onTasksChange={noop} onTaskClick={setSelectedTask} />
        ) : activeTab === 'Calendario' ? (
          <CalendarView tasks={filteredTasks} assignees={allAssignees} onTaskClick={setSelectedTask} />
        ) : activeTab === 'Lista' ? (
          <ListView tasks={filteredTasks} assignees={allAssignees} onTasksChange={noop} onTaskClick={setSelectedTask} readOnly />
        ) : activeTab === 'Equipo' ? (
          <TeamView tasks={filteredTasks} assignees={allAssignees} />
        ) : (
          <DashboardGrid
            accentColor={ACCENT}
            kpis={kpis}
            workload={workload}
            assignees={allAssignees}
            completedThisWeek={completedThisWeek}
          />
        )}
      </div>

      {/* Task detail — view-only modal for shared snapshots */}
      {selectedTask && (
        <TaskFormModal
          phases={dynamicPhases}
          assignees={allAssignees}
          defaultPhaseId={activePhaseId}
          accentColor={ACCENT}
          mode="view"
          initialTask={selectedTask}
          onSave={noop as (t: Task) => void}
          onCancel={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
