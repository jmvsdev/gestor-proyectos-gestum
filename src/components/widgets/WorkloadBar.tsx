import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '../ui/Card';
import { TOOLTIP_STYLE, makeFormatter } from './chartUtils';
import type { WorkloadSegment } from '../../data/types';

interface WorkloadBarProps {
  segments: WorkloadSegment[];
}

export function WorkloadBar({ segments }: WorkloadBarProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const legend = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {segments.map(s => (
        <div key={s.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
          <span className="text-[11.5px] text-[#5a5f6b]">{s.label}</span>
          <span className="text-[11.5px] font-semibold text-[#272b36]">{s.value}</span>
        </div>
      ))}
    </div>
  );

  if (total === 0) {
    return (
      <Card className="px-5 pt-4 pb-3 flex-1">
        <div className="text-[14px] font-bold text-[#272b36] mb-4">Carga de trabajo por estado</div>
        <div className="h-7 bg-[#f0f1f4] rounded-full flex items-center justify-center mb-1">
          <span className="text-[11.5px] text-[#9aa0ad]">Sin tareas pendientes</span>
        </div>
        {legend}
      </Card>
    );
  }

  // Build a single-row dataset: _cat is the category key required by YAxis in vertical layout
  const dataRow: Record<string, number | string> = { _cat: '' };
  segments.forEach((s, i) => { dataRow[`seg${i}`] = s.value; });

  return (
    <Card className="px-5 pt-4 pb-3 flex-1">
      <div className="text-[14px] font-bold text-[#272b36] mb-4">Carga de trabajo por estado</div>
      <ResponsiveContainer width="100%" height={44}>
        <BarChart
          layout="vertical"
          data={[dataRow]}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barCategoryGap={0}
          barGap={0}
        >
          {/* YAxis is mandatory in layout="vertical" — without it, bars have zero height */}
          <YAxis dataKey="_cat" type="category" hide width={0} />
          <XAxis type="number" domain={[0, total]} hide />
          <Tooltip
            formatter={makeFormatter((value, name) => {
              const idx = parseInt(String(name).replace('seg', ''));
              return [`${value ?? 0} tareas`, segments[idx]?.label ?? String(name)];
            })}
            contentStyle={TOOLTIP_STYLE}
          />
          {segments.map((s, i) => (
            <Bar
              key={s.label}
              dataKey={`seg${i}`}
              stackId="a"
              radius={i === 0 ? [3, 0, 0, 3] : i === segments.length - 1 ? [0, 3, 3, 0] : [0, 0, 0, 0]}
            >
              <Cell key={`cell-${i}`} fill={s.color} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      {legend}
    </Card>
  );
}
