import { TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';

interface CompletedThisWeekCardProps {
  count?: number;
}

export function CompletedThisWeekCard({ count = 0 }: CompletedThisWeekCardProps) {
  return (
    <Card className="p-[18px_20px] flex flex-col">
      <div className="text-[14px] font-bold text-[#272b36] mb-2">Tareas completadas esta semana</div>
      {count === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[210px] text-[#c3c7d0]">
          <TrendingUp size={46} strokeWidth={1.4} />
          <span className="text-[13px] text-[#9aa0ad]">No hay resultados.</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-[48px] font-bold text-[#1f9d63]">{count}</span>
          <span className="text-[12px] text-[#9aa0ad] mt-1">tareas completadas</span>
        </div>
      )}
    </Card>
  );
}
