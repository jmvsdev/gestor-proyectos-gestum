import type { ReactNode } from 'react';
import {
  Lock, Star,
  LayoutGrid, Calendar, Users, GanttChartSquare, List, LayoutDashboard,
  Share2, Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PresenceUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

interface TopBarProps {
  projectSelector: ReactNode;
  accentColor: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  activePhase: string;
  onShare: () => void;
  presenceUsers?: PresenceUser[];
  onSettings?: () => void;
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

export function TopBar({ projectSelector, accentColor, activeTab, onTabChange, activePhase, onShare, presenceUsers = [], onSettings }: TopBarProps) {
  return (
    <div className="flex flex-col flex-shrink-0">
      {/* Row 1: breadcrumb + presence + Compartir */}
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

        {/* Presence avatars — other users viewing this project */}
        {presenceUsers.length > 0 && (
          <div className="hidden sm:flex items-center flex-shrink-0" style={{ gap: '-4px' }}>
            {presenceUsers.slice(0, 4).map((u, i) => (
              <div
                key={u.uid}
                title={u.displayName ?? 'Colaborador'}
                className="w-6 h-6 rounded-full border-2 border-white overflow-hidden flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{
                  marginLeft: i === 0 ? 0 : -6,
                  background: u.photoURL ? undefined : '#1f9d63',
                  zIndex: 10 - i,
                }}
              >
                {u.photoURL
                  ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : (u.displayName?.[0]?.toUpperCase() ?? '?')
                }
              </div>
            ))}
            {presenceUsers.length > 4 && (
              <div
                className="w-6 h-6 rounded-full border-2 border-white bg-[#9aa0ad] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                style={{ marginLeft: -6 }}
              >
                +{presenceUsers.length - 4}
              </div>
            )}
          </div>
        )}

        {onSettings && (
          <button
            type="button"
            onClick={onSettings}
            title="Configuración del proyecto"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border-0 cursor-pointer text-[#8b909c] hover:bg-[#f0f1f4] hover:text-[#272b36] transition-colors flex-shrink-0"
          >
            <Settings size={15} strokeWidth={1.8} />
          </button>
        )}
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
