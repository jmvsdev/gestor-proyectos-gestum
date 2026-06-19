import {
  Home, Calendar, Sparkles, Users, FileText,
  LayoutDashboard, LayoutGrid, Target, Grid3x3,
  Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CurrentUser } from '../../data/types';

interface NavItem {
  label: string;
  Icon: LucideIcon;
  active?: boolean;
}

interface IconRailProps {
  currentUser: CurrentUser;
}

const navItems: NavItem[] = [
  { label: 'Inicio',      Icon: Home,            active: true },
  { label: 'Agenda',      Icon: Calendar },
  { label: 'IA',          Icon: Sparkles },
  { label: 'Equipos',     Icon: Users },
  { label: 'Documentos',  Icon: FileText },
  { label: 'Paneles',     Icon: LayoutDashboard },
  { label: 'Pizarras',    Icon: LayoutGrid },
  { label: 'Metas',       Icon: Target },
  { label: 'Más',         Icon: Grid3x3 },
];

export function IconRail({ currentUser }: IconRailProps) {
  return (
    <aside className="flex flex-col items-center w-[68px] bg-[#1b1f2a] py-3 gap-0.5 flex-shrink-0">
      {navItems.map(({ label, Icon, active }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className="flex flex-col items-center gap-[3px] w-14 py-[7px] rounded-xl cursor-pointer transition-colors duration-100 border-0"
          style={{
            color: active ? '#ffffff' : 'rgba(255,255,255,0.6)',
            background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
          }}
          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Icon size={20} strokeWidth={1.8} />
          <span className="text-[9.5px] font-medium leading-none">{label}</span>
        </button>
      ))}

      <div className="mt-auto flex flex-col items-center gap-3 pb-1">
        <button type="button" aria-label="Agregar espacio" className="w-8 h-8 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/55 hover:border-white/50 hover:text-white transition-colors bg-transparent">
          <Plus size={15} strokeWidth={2} />
        </button>
        <div
          title={currentUser.name}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs border-2 border-[#2a2f3d] cursor-pointer"
        >
          {currentUser.initials}
        </div>
      </div>
    </aside>
  );
}
