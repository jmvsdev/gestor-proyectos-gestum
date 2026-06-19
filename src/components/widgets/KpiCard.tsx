import { Card } from '../ui/Card';
import type { KPI } from '../../data/types';

interface KpiCardProps {
  kpi: KPI;
}

export function KpiCard({ kpi }: KpiCardProps) {
  return (
    <Card className="px-[14px] pt-4 pb-[18px] text-center">
      <div className="flex items-center justify-center gap-[7px] mb-2">
        <span
          className="w-[9px] h-[9px] rounded-sm flex-shrink-0"
          style={{ background: kpi.color }}
        />
        <span className="text-[13px] font-semibold text-[#4a4f5c]">{kpi.label}</span>
      </div>
      <div className="text-[42px] font-bold text-[#272b36] leading-[1.05] tracking-tight">
        {kpi.value}
      </div>
      <div className="text-[12px] text-[#9aa0ad] mt-0.5">tareas</div>
    </Card>
  );
}
