import { useEffect, useRef, useState } from 'react';
import {
  ChevronRight, Lock, Plus,
  TableProperties, CheckSquare2, Layers,
} from 'lucide-react';
import type { Phase } from '../../data/types';
import { ALL_PHASES_ID } from '../../data/types';

interface SidebarPanelProps {
  projectName: string;
  accentColor: string;
  phases: Phase[];
  activePhaseId: string;
  onPhaseChange: (phaseId: string) => void;
  onRenamePhase: (phaseId: string, newName: string) => void;
}

export function SidebarPanel({ projectName, accentColor, phases, activePhaseId, onPhaseChange, onRenamePhase }: SidebarPanelProps) {
  const [renamingId, setRenamingId]     = useState<string | null>(null);
  const [renameValue, setRenameValue]   = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  function startRename(phase: Phase) {
    if (phase.isImport) return;
    setRenamingId(phase.id);
    setRenameValue(phase.name);
  }

  function commitRename() {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (name) onRenamePhase(renamingId, name);
    setRenamingId(null);
  }

  const allActive = activePhaseId === ALL_PHASES_ID;

  return (
    <aside className="hidden md:flex flex-col w-[264px] bg-[#fbfbfc] border-r border-gray-200 flex-shrink-0 min-h-0">
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3">
        <span className="text-[16px] font-bold text-[#272b36]">Inicio</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="h-px bg-[#ececf0] mx-2 mb-2" />

        {/* Espacios */}
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[11px] font-bold text-[#9aa0ad] uppercase tracking-wide">Espacios</span>
          <button type="button" aria-label="Agregar espacio" className="w-5 h-5 rounded-md flex items-center justify-center text-[#9aa0ad] hover:bg-[#eceef2] hover:text-[#4a4f5c] transition-colors border-0 bg-transparent cursor-pointer">
            <Plus size={13} strokeWidth={2.4} />
          </button>
        </div>

        {/* Todas las tareas */}
        <button type="button" className="flex items-center gap-[9px] px-2 py-[7px] rounded-lg cursor-pointer text-[#4a4f5c] hover:bg-[#f0f1f4] transition-colors border-0 bg-transparent w-full text-left">
          <div className="w-5 h-5 rounded-md bg-[#eef0f3] flex items-center justify-center text-[#7c818d] text-[13px] font-bold flex-shrink-0">✳</div>
          <span className="text-[13px] font-medium">Todas las tareas <span className="text-[#9aa0ad] font-normal">- Gestum</span></span>
        </button>

        {/* Project row */}
        <button type="button" className="flex items-center gap-[9px] px-2 py-[7px] rounded-lg cursor-pointer text-[#272b36] hover:bg-[#f0f1f4] transition-colors border-0 bg-transparent w-full text-left mt-px">
          <ChevronRight size={12} strokeWidth={2.6} className="text-[#9aa0ad] flex-shrink-0" />
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
            style={{ background: accentColor }}
          >P</div>
          <span className="text-[13px] font-semibold flex-1 truncate">{projectName}</span>
          <Lock size={12} strokeWidth={2} className="text-[#9aa0ad] flex-shrink-0" />
        </button>

        {/* Phases + Todo el proyecto */}
        <div className="flex flex-col gap-px ml-3 pl-2 border-l border-[#ececf0] mt-0.5 mb-0.5">

          {/* "Todo el proyecto" chip */}
          <button
            type="button"
            onClick={() => onPhaseChange(ALL_PHASES_ID)}
            className="flex items-center gap-[9px] px-2 py-[6px] rounded-lg cursor-pointer transition-colors border-0 w-full text-left"
            style={{
              background: allActive ? `${accentColor}1a` : 'transparent',
              color: allActive ? accentColor : '#4a4f5c',
            }}
          >
            <Layers size={14} strokeWidth={2} className="flex-shrink-0" style={{ color: allActive ? accentColor : '#9aa0ad' }} />
            <span className="text-[12.5px] flex-1 truncate" style={{ fontWeight: allActive ? 700 : 500 }}>
              Todo el proyecto
            </span>
          </button>

          {/* Individual phase buttons */}
          {phases.map(phase => (
            <div key={phase.id} className="group relative">
              {renamingId === phase.id ? (
                <div className="flex items-center gap-1 px-2 py-[4px]">
                  <CheckSquare2 size={14} strokeWidth={2} className="flex-shrink-0 text-[#9aa0ad]" />
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={commitRename}
                    className="flex-1 text-[12.5px] border border-[#5a67f2] rounded-md px-1.5 py-0.5 outline-none min-w-0"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onPhaseChange(phase.id)}
                  onDoubleClick={() => startRename(phase)}
                  className="flex items-center gap-[9px] px-2 py-[6px] rounded-lg cursor-pointer transition-colors border-0 bg-transparent w-full text-left"
                  style={{
                    background: phase.active ? `${accentColor}1a` : 'transparent',
                    color: phase.active ? accentColor : '#4a4f5c',
                  }}
                >
                  {phase.isImport
                    ? <TableProperties size={14} strokeWidth={2} className="flex-shrink-0" style={{ color: '#9aa0ad' }} />
                    : <CheckSquare2 size={14} strokeWidth={2} className="flex-shrink-0" style={{ color: phase.active ? accentColor : '#9aa0ad' }} />
                  }
                  <span className="text-[12.5px] flex-1 truncate" style={{ fontWeight: phase.active ? 700 : 500 }}>
                    {phase.name}
                  </span>
                  {!phase.isImport && phase.taskCount > 0 && (
                    <span className="text-[11.5px] text-[#9aa0ad] font-semibold min-w-[14px] text-right">
                      {phase.taskCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          ))}

          <button type="button" className="flex items-center gap-[9px] px-2 py-[6px] rounded-lg cursor-pointer text-[#9aa0ad] hover:bg-[#f0f1f4] transition-colors border-0 bg-transparent w-full text-left">
            <Plus size={14} strokeWidth={2.2} />
            <span className="text-[12.5px] font-medium">Nuevo espacio</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
