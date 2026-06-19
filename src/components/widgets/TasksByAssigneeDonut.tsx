import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card } from '../ui/Card';
import { TOOLTIP_STYLE, makeFormatter } from './chartUtils';
import type { Assignee } from '../../data/types';

interface TasksByAssigneeDonutProps {
  assignees: Assignee[];
}

export function TasksByAssigneeDonut({ assignees }: TasksByAssigneeDonutProps) {
  const data = assignees.filter(a => a.totalTasks > 0).map(a => ({
    name: a.name,
    value: a.totalTasks,
    color: a.color,
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="p-[18px_20px]">
      <div className="text-[14px] font-bold text-[#272b36] mb-2">Total de tareas por persona asignada</div>
      <div className="flex items-center gap-[14px]">
        {/* Fixed-size donut — ResponsiveContainer with a numeric width cancels responsiveness */}
        <div className="relative flex-shrink-0 w-[148px] h-[148px]">
          <PieChart width={148} height={148}>
            <Pie
              data={data}
              cx={69}
              cy={69}
              innerRadius={46}
              outerRadius={70}
              paddingAngle={1}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map(d => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip
              formatter={makeFormatter((v, n) => [`${v ?? 0} tareas`, String(n)])}
              contentStyle={TOOLTIP_STYLE}
            />
          </PieChart>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[32px] font-bold text-[#272b36] leading-none">{total}</span>
            <span className="text-[12px] text-[#9aa0ad] mt-0.5">tareas</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2 min-w-0">
              <span className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-[12px] text-[#5a5f6b] truncate flex-1">{d.name}</span>
              <span className="text-[12px] font-bold text-[#272b36]">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
