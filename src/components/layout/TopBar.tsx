import type { ReactNode } from 'react';
import {
  Lock, Star,
  LayoutGrid, Calendar, Users, GanttChartSquare, List, LayoutDashboard,
  Share2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TopBarProps {
  /** Rendered in place of the project name — pass a <ProjectDropdown> */
  projectSelector: ReactNode;
  accentColor: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activePhase: string;
  onShare: () => void;
}

interface TabDef {
  label: string;
  Icon: LucideIcon;
}

const TABS: TabDef[] = [
  { label: 'Tablero',    Icon: LayoutGrid },
  { label: 'Calendario', Icon: Calendar },
  { label: 'Equipo',     Icon: Users },
  { label: 'Gantt',      Icon: GanttChartSquare },
  { label: 'Lista',      Icon: List },
  { label: 'Panel',      Icon: LayoutDashboard },
];

export function TopBar({ projectSelector, accentColor, activeTab, onTabChange, activePhase, onShare }: TopBarProps) {
  return (
    <div className="flex flex-col flex-shrink-0">
      {/* Row 1: breadcrumb + Compartir */}
      <div className="flex items-center gap-[10px] px-[18px] pt-[10px] pb-[6px]">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{ background: accentColor }}
          >P</div>
          {projectSelector}
          <Lock size={12} strokeWidth={2} className="hidden sm:block text-[#9aa0ad] flex-shrink-0" />
          <span className="hidden sm:inline text-[#c3c7d0] text-[14px]">/</span>
          <LayoutDashboard size={15} strokeWidth={2} className="hidden sm:block flex-shrink-0" style={{ color: accentColor }} />
          <span className="hidden sm:inline text-[14px] font-semibold text-[#272b36] truncate">{activePhase}</span>
          <Star size={15} strokeWidth={1.8} className="hidden sm:block text-[#c3c7d0] flex-shrink-0 cursor-pointer hover:text-amber-400 transition-colors" />
        </div>

        <button
          type="button"
          onClick={onShare}
          className="flex items-center gap-[6px] border-0 rounded-lg px-[10px] sm:px-[13px] py-[7px] text-[13px] font-semibold text-white cursor-pointer ml-1 shadow-sm hover:brightness-110 transition-all flex-shrink-0"
          style={{ background: accentColor }}
        >
          <Share2 size={14} strokeWidth={2} />
          <span className="hidden sm:inline">Compartir</span>
        </button>
      </div>

      {/* Row 2: view tabs — scrollable on mobile */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-gray-200 px-[18px] scrollbar-none">
        {TABS.map(({ label, Icon }) => {
          const active = activeTab === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onTabChange(label)}
              className="flex items-center gap-[6px] bg-transparent border-0 px-[11px] pb-[11px] pt-2 text-[13px] cursor-pointer transition-colors flex-shrink-0 whitespace-nowrap"
              style={{
                color: active ? accentColor : '#8b909c',
                fontWeight: active ? 600 : 500,
                borderBottom: `2px solid ${active ? accentColor : 'transparent'}`,
              }}
            >
              <Icon size={14} strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
