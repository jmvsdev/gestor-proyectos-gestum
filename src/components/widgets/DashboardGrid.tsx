import { ProjectStatusSummary } from './ProjectStatusSummary';
import { WorkloadBar } from './WorkloadBar';
import { TasksByAssigneeDonut } from './TasksByAssigneeDonut';
import { OpenTasksBar } from './OpenTasksBar';
import { CompletedThisWeekCard } from './CompletedThisWeekCard';
import { MobileDashboard } from './MobileDashboard';
import type { WorkloadSegment, Assignee, Task } from '../../data/types';

interface DashboardGridProps {
  accentColor: string;
  workload: WorkloadSegment[];
  assignees: Assignee[];
  tasks: Task[];
  today: string;
}

export function DashboardGrid({
  accentColor,
  workload,
  assignees,
  tasks,
  today,
}: DashboardGridProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* Mobile layout — visible below 768px */}
      <div className="md:hidden px-4 pb-6 pt-4 flex flex-col gap-3">
        <MobileDashboard
          tasks={tasks}
          assignees={assignees}
          workload={workload}
          today={today}
        />
      </div>

      {/* Desktop layout — visible at 768px and above */}
      <div className="hidden md:block px-[18px] pb-[22px] pt-4">
        <div className="flex flex-col gap-4 mb-4">
          <ProjectStatusSummary tasks={tasks} />
          <WorkloadBar segments={workload} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <TasksByAssigneeDonut assignees={assignees} />
          <OpenTasksBar assignees={assignees} accentColor={accentColor} />
          <CompletedThisWeekCard tasks={tasks} today={today} />
        </div>
      </div>
    </div>
  );
}
