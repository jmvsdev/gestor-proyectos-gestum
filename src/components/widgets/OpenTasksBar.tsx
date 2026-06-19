import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '../ui/Card';
import { TOOLTIP_STYLE, makeFormatter } from './chartUtils';
import type { Assignee } from '../../data/types';

interface OpenTasksBarProps {
  assignees: Assignee[];
  accentColor: string;
}

export function OpenTasksBar({ assignees, accentColor }: OpenTasksBarProps) {
  const data = assignees.map(a => ({
    name: a.shortName,
    tareas: a.openTasks,
  }));

  return (
    <Card className="p-[18px_20px]">
      <div className="text-[14px] font-bold text-[#272b36] mb-0.5">Tareas abiertas por persona asignada</div>
      <div className="text-[12px] text-[#9aa0ad] mb-2">Tareas</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: -10 }}>
          <CartesianGrid vertical={false} stroke="#f0f1f4" strokeWidth={1} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11.5, fill: '#8b909c', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9aa0ad', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            tickCount={7}
          />
          <Tooltip
            formatter={makeFormatter(v => [`${v ?? 0} tareas`, 'Abiertas'])}
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="tareas" radius={[4, 4, 0, 0]}>
            {data.map(entry => <Cell key={entry.name} fill={accentColor} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
