import { Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import type { AISummary } from '../../data/types';

interface AISummaryCardProps {
  accentColor: string;
  summary: AISummary;
}

export function AISummaryCard({ accentColor, summary }: AISummaryCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-[9px] mb-4">
        <div
          className="w-6 h-6 rounded-[7px] flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)` }}
        >
          <Sparkles size={14} color="#fff" strokeWidth={1.8} />
        </div>
        <span className="text-[15px] font-bold text-[#272b36]">Resumen ejecutivo con IA</span>
      </div>

      <p className="text-[13.5px] text-[#5a5f6b] leading-relaxed mb-6">
        {summary.summaryText}
      </p>

      <div className="text-[14px] font-bold text-[#272b36] mb-3">
        Esfuerzos e Iniciativas Clave
      </div>
      <p className="text-[13.5px] text-[#9aa0ad] leading-relaxed">
        {summary.keyInitiativesText}
      </p>
    </Card>
  );
}
