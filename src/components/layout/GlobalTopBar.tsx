import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search, LogOut } from 'lucide-react';
import type { CurrentUser } from '../../data/types';

interface GlobalTopBarProps {
  workspaceName: string;
  accentColor: string;
  currentUser: CurrentUser;
  photoURL?: string | null;
  onSignOut?: () => void;
}

export function GlobalTopBar({ workspaceName, accentColor, currentUser, photoURL, onSignOut }: GlobalTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  return (
    <header className="flex items-center h-[46px] flex-shrink-0 bg-white border-b border-gray-200 px-3 gap-[10px] z-30">
      {/* Workspace selector */}
      <div className="flex items-center gap-2 min-w-0 md:min-w-[230px]">
        <button type="button" className="flex items-center gap-[7px] px-2 py-1 rounded-lg cursor-pointer hover:bg-[#f1f2f5] transition-colors border-0 bg-transparent">
          <div
            className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-white font-bold text-[12px] flex-shrink-0"
            style={{ background: accentColor }}
          >G</div>
          <span className="hidden sm:inline font-semibold text-[13.5px] text-[#272b36]">{workspaceName}</span>
          <ChevronDown size={13} strokeWidth={2.2} className="hidden sm:block text-[#8b909c]" />
        </button>
      </div>

      {/* Nav arrows */}
      <div className="hidden md:flex items-center gap-1">
        <button type="button" aria-label="Atrás" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b909c] hover:bg-[#f1f2f5] transition-colors border-0 bg-transparent cursor-pointer">
          <ChevronLeft size={17} strokeWidth={2} />
        </button>
        <button type="button" aria-label="Adelante" className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b909c] hover:bg-[#f1f2f5] transition-colors border-0 bg-transparent cursor-pointer">
          <ChevronRight size={17} strokeWidth={2} />
        </button>
      </div>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-[560px] mx-auto items-center gap-2 h-[30px] bg-[#f3f4f7] border border-[#ececf0] rounded-[9px] px-3 cursor-text hover:border-[#dcdee4] transition-colors">
        <Search size={15} strokeWidth={2} className="text-[#9aa0ad]" />
        <span className="text-[#9aa0ad] text-[12.5px] flex-1">Buscar</span>
        <span className="text-[#b3b8c2] text-[11px] bg-[#e8eaee] rounded-md px-[6px] py-px">Ctrl J</span>
      </div>

      {/* User avatar + optional sign-out menu */}
      <div className="ml-auto flex justify-end md:ml-0 md:min-w-[230px] relative" ref={menuRef}>
        <button
          type="button"
          title={currentUser.name}
          onClick={() => onSignOut ? setMenuOpen(v => !v) : undefined}
          className="w-[29px] h-[29px] rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-[11px] cursor-pointer focus:outline-none"
          style={photoURL ? {} : { background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
        >
          {photoURL
            ? <img src={photoURL} alt={currentUser.initials} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : currentUser.initials
          }
        </button>

        {menuOpen && onSignOut && (
          <div className="absolute right-0 top-[36px] bg-white border border-[#e0e2e8] rounded-xl shadow-lg py-1 min-w-[180px] z-50">
            <div className="px-4 py-2 border-b border-[#eceef2]">
              <p className="text-[12.5px] font-semibold text-[#272b36] truncate">{currentUser.name}</p>
            </div>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-2 px-4 py-[9px] text-[12.5px] text-[#4a4f5c] hover:bg-[#f6f7f9] transition-colors cursor-pointer border-0 bg-transparent text-left"
            >
              <LogOut size={14} strokeWidth={2} className="text-[#9aa0ad]" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
