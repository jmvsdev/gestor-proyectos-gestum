import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { ProjectStatusSummary } from './ProjectStatusSummary';
import { CompletedThisWeekCard } from './CompletedThisWeekCard';
import { Card } from '../ui/Card';
import type { Task, Assignee, WorkloadSegment } from '../../data/types';

interface MobileDashboardProps {
  tasks: Task[];
  assignees: Assignee[];
  workload: WorkloadSegment[];
  today: string;
}

function Accordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-[13.5px] font-semibold text-[#272b36] bg-transparent border-0 cursor-pointer"
      >
        {title}
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="text-[#9aa0ad] flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-[#f0f1f4]">
          {children}
        </div>
      )}
    </Card>
  );
}

function PersonHBars({ assignees }: { assignees: Assignee[] }) {
  const active = [...assignees]
    .filter(a => a.openTasks > 0)
    .sort((a, b) => b.openTasks - a.openTasks);
  const max = active.length > 0 ? active[0].openTasks : 1;

  if (active.length === 0) {
    return <p className="pt-3 text-[12.5px] text-[#9aa0ad] text-center">Sin tareas abiertas</p>;
  }

  return (
    <div className="flex flex-col gap-3 pt-3">
      {active.map(a => (
        <div key={a.id} className="flex items-center gap-2.5">
          <span className="text-[12px] text-[#4a4f5c] w-[76px] truncate flex-shrink-0">{a.shortName}</span>
          <div className="flex-1 h-2.5 bg-[#f0f1f4] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(a.openTasks / max) * 100}%`, background: a.color }}
            />
          </div>
          <span className="text-[12px] font-bold text-[#272b36] w-5 text-right flex-shrink-0">{a.openTasks}</span>
        </div>
      ))}
    </div>
  );
}

function StatusHBars({ workload }: { workload: WorkloadSegment[] }) {
  const active = workload.filter(s => s.value > 0);
  const max = active.length > 0 ? Math.max(...active.map(s => s.value)) : 1;

  if (active.length === 0) {
    return <p className="pt-3 text-[12.5px] text-[#9aa0ad] text-center">Sin tareas pendientes</p>;
  }

  return (
    <div className="flex flex-col gap-3 pt-3">
      {active.map(s => (
        <div key={s.label} className="flex items-center gap-2.5">
          <span className="text-[12px] text-[#4a4f5c] w-[80px] truncate flex-shrink-0">{s.label}</span>
          <div className="flex-1 h-2.5 bg-[#f0f1f4] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(s.value / max) * 100}%`, background: s.color }}
            />
          </div>
          <span className="text-[12px] font-bold text-[#272b36] w-5 text-right flex-shrink-0">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MobileDashboard({ tasks, assignees, workload, today }: MobileDashboardProps) {
  return (
    <>
      <ProjectStatusSummary tasks={tasks} />
      <CompletedThisWeekCard tasks={tasks} today={today} />
      <Accordion title="Carga por persona">
        <PersonHBars assignees={assignees} />
      </Accordion>
      <Accordion title="Carga de trabajo por estado">
        <StatusHBars workload={workload} />
      </Accordion>
    </>
  );
}
