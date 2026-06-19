import { KpiCard } from './KpiCard';
import { WorkloadBar } from './WorkloadBar';
import { TasksByAssigneeDonut } from './TasksByAssigneeDonut';
import { OpenTasksBar } from './OpenTasksBar';
import { CompletedThisWeekCard } from './CompletedThisWeekCard';
import type { KPI, WorkloadSegment, Assignee } from '../../data/types';

interface DashboardGridProps {
  accentColor: string;
  kpis: KPI[];
  workload: WorkloadSegment[];
  assignees: Assignee[];
  completedThisWeek: number;
}

export function DashboardGrid({
  accentColor,
  kpis,
  workload,
  assignees,
  completedThisWeek,
}: DashboardGridProps) {
  return (
    <div className="flex-1 overflow-y-auto px-[18px] pb-[22px] pt-4 min-h-0">
      {/* Row 1: KPI cards + Workload */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="grid grid-cols-3 gap-4">
          {kpis.map(kpi => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </div>
        <WorkloadBar segments={workload} />
      </div>

      {/* Row 2: Donut | Open tasks | Completed */}
      <div className="grid grid-cols-3 gap-4">
        <TasksByAssigneeDonut assignees={assignees} />
        <OpenTasksBar assignees={assignees} accentColor={accentColor} />
        <CompletedThisWeekCard count={completedThisWeek} />
      </div>
    </div>
  );
}
