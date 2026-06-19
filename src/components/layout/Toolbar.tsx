import type { ReactNode } from 'react';
import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { FilterPanel } from '../widgets/FilterPanel';
import type { Assignee, FilterState } from '../../data/types';

interface ToolbarProps {
  accentColor: string;
  onReset: () => void;
  onImportSharedView?: () => void;
  extraActions?: ReactNode;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  assignees: Assignee[];
  onAddTask?: () => void;
}

export function Toolbar({
  accentColor, onReset, onImportSharedView, extraActions,
  filters, onFiltersChange, assignees, onAddTask,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-[10px] px-[18px] py-[10px] flex-shrink-0">
      <FilterPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
        assignees={assignees}
        accentColor={accentColor}
      />

      <button
        type="button"
        onClick={onReset}
        title="Borrar localStorage y volver al mockData"
        className="flex items-center gap-[7px] bg-white border border-[#e4e6ec] rounded-lg px-3 py-[6px] text-[12.5px] font-semibold text-[#ef4444] cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)] hover:border-[#ef4444] hover:bg-[#fff5f5] transition-colors"
      >
        <Trash2 size={13} strokeWidth={2} />
        Resetear datos
      </button>

      {onImportSharedView && (
        <button
          type="button"
          onClick={onImportSharedView}
          className="flex items-center gap-[7px] bg-white border border-[#e4e6ec] rounded-lg px-3 py-[6px] text-[12.5px] font-semibold text-[#4a4f5c] cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.02)] hover:border-[#cfd3dc] transition-colors"
        >
          <FolderOpen size={14} strokeWidth={2} className="text-[#8b909c]" />
          Importar vista compartida
        </button>
      )}

      {extraActions}

      {onAddTask && (
        <div className="ml-auto">
          <button
            type="button"
            onClick={onAddTask}
            className="flex items-center gap-[6px] border-0 rounded-lg px-[13px] py-[7px] text-[12.5px] font-semibold text-white cursor-pointer shadow-sm hover:brightness-110 transition-all"
            style={{ background: accentColor }}
          >
            <Plus size={14} strokeWidth={2.2} />
            Agregar tarjeta
          </button>
        </div>
      )}
    </div>
  );
}
