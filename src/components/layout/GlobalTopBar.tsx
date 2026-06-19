import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { CurrentUser } from '../../data/types';

interface GlobalTopBarProps {
  workspaceName: string;
  accentColor: string;
  currentUser: CurrentUser;
}

export function GlobalTopBar({ workspaceName, accentColor, currentUser }: GlobalTopBarProps) {
  return (
    <header className="flex items-center h-[46px] flex-shrink-0 bg-white border-b border-gray-200 px-3 gap-[10px] z-30">
      {/* Workspace selector */}
      <div className="flex items-center gap-2 min-w-[230px]">
        <button type="button" className="flex items-center gap-[7px] px-2 py-1 rounded-lg cursor-pointer hover:bg-[#f1f2f5] transition-colors border-0 bg-transparent">
          <div
            className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-white font-bold text-[12px] flex-shrink-0"
            style={{ background: accentColor }}
          >G</div>
          <span className="font-semibold text-[13.5px] text-[#272b36]">{workspaceName}</span>
          <ChevronDown size={13} strokeWidth={2.2} className="text-[#8b909c]" />
        </button>
      </div>

      {/* Nav arrows */}
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Atrás" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b909c] hover:bg-[#f1f2f5] transition-colors border-0 bg-transparent cursor-pointer">
          <ChevronLeft size={17} strokeWidth={2} />
        </button>
        <button type="button" aria-label="Adelante" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b909c] hover:bg-[#f1f2f5] transition-colors border-0 bg-transparent cursor-pointer">
          <ChevronRight size={17} strokeWidth={2} />
        </button>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-[560px] mx-auto flex items-center gap-2 h-[30px] bg-[#f3f4f7] border border-[#ececf0] rounded-[9px] px-3 cursor-text hover:border-[#dcdee4] transition-colors">
        <Search size={15} strokeWidth={2} className="text-[#9aa0ad]" />
        <span className="text-[#9aa0ad] text-[12.5px] flex-1">Buscar</span>
        <span className="text-[#b3b8c2] text-[11px] bg-[#e8eaee] rounded-md px-[6px] py-px">Ctrl J</span>
      </div>

      {/* User avatar */}
      <div className="min-w-[230px] flex justify-end">
        <div
          title={currentUser.name}
          className="w-[29px] h-[29px] rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-[11px] cursor-pointer"
        >
          {currentUser.initials}
        </div>
      </div>
    </header>
  );
}
