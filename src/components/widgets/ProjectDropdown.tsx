import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import type { StoredProject } from '../../data/types';

interface ProjectDropdownProps {
  projects: Record<string, StoredProject>;
  activeProjectId: string;
  accentColor: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function ProjectDropdown({
  projects, activeProjectId, accentColor,
  onSwitch, onCreate, onDelete, onRename,
}: ProjectDropdownProps) {
  const [open, setOpen]                   = useState(false);
  const [creatingNew, setCreatingNew]     = useState(false);
  const [newName, setNewName]             = useState('');
  const [renamingId, setRenamingId]       = useState<string | null>(null);
  const [renameValue, setRenameValue]     = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const newInputRef  = useRef<HTMLInputElement>(null);
  const renameRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreatingNew(false);
        setNewName('');
        setRenamingId(null);
        setDeleteConfirmId(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => { if (creatingNew) newInputRef.current?.focus(); }, [creatingNew]);
  useEffect(() => { if (renamingId) renameRef.current?.focus(); }, [renamingId]);

  const projectList = Object.values(projects).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const activeName  = projects[activeProjectId]?.name ?? '—';

  function commitCreate() {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
    setCreatingNew(false);
    setOpen(false);
  }

  function commitRename(id: string) {
    const name = renameValue.trim();
    if (name) onRename(id, name);
    setRenamingId(null);
  }

  function confirmDelete(id: string) {
    onDelete(id);
    setDeleteConfirmId(null);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setCreatingNew(false); setNewName(''); setDeleteConfirmId(null); }}
        className="flex items-center gap-1.5 font-semibold text-[14px] text-[#272b36] hover:text-[#5a67f2] transition-colors bg-transparent border-0 cursor-pointer p-0"
      >
        <span className="truncate max-w-[180px] sm:max-w-[260px]">{activeName}</span>
        <ChevronDown size={13} strokeWidth={2.2} className="flex-shrink-0 text-[#8b909c]" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.13)] border border-[#e8eaee] w-[270px] py-1.5 overflow-hidden">

          {/* Project list */}
          {projectList.map(project => (
            <div key={project.id}>
              <div className="flex items-center gap-2 px-3 py-[7px] hover:bg-[#f6f7f9] group">
                {/* Active check / spacer */}
                <span className="w-4 flex-shrink-0 flex items-center">
                  {project.id === activeProjectId && (
                    <Check size={13} strokeWidth={2.5} style={{ color: accentColor }} />
                  )}
                </span>

                {/* Name or rename input */}
                {renamingId === project.id ? (
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(project.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={() => commitRename(project.id)}
                    className="flex-1 text-[13px] border border-[#5a67f2] rounded-md px-1.5 py-0.5 outline-none min-w-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { if (project.id !== activeProjectId) { onSwitch(project.id); setOpen(false); } }}
                    className="flex-1 text-left text-[13px] text-[#272b36] truncate bg-transparent border-0 cursor-pointer p-0"
                    style={{ fontWeight: project.id === activeProjectId ? 600 : 400 }}
                  >
                    {project.name}
                  </button>
                )}

                {/* Rename + delete — always visible, not just on hover */}
                {renamingId !== project.id && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      type="button"
                      title="Renombrar"
                      onClick={e => { e.stopPropagation(); setRenamingId(project.id); setRenameValue(project.name); }}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#eceef2] text-[#8b909c] hover:text-[#4a4f5c] bg-transparent border-0 cursor-pointer"
                    >
                      <Pencil size={12} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      title="Borrar proyecto"
                      onClick={e => { e.stopPropagation(); setDeleteConfirmId(project.id); }}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#fef2f2] text-[#8b909c] hover:text-[#ef4444] bg-transparent border-0 cursor-pointer"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>

              {/* Delete confirmation row */}
              {deleteConfirmId === project.id && (
                <div className="mx-3 mb-2 rounded-lg bg-[#fff5f5] border border-[#fecaca] px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#ef4444] mb-1.5">
                    ¿Borrar &ldquo;{project.name}&rdquo; y todas sus tareas?
                  </p>
                  <p className="text-[11px] text-[#9aa0ad] mb-2">Esta acción no se puede deshacer.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => confirmDelete(project.id)}
                      className="text-[12px] font-semibold bg-[#ef4444] text-white rounded-lg px-3 py-1 border-0 cursor-pointer hover:bg-[#dc2626] transition-colors"
                    >
                      Sí, borrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-[12px] font-semibold text-[#4a4f5c] bg-white border border-[#e4e6ec] rounded-lg px-3 py-1 cursor-pointer hover:bg-[#f6f7f9] transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Separator + New project */}
          <div className="h-px bg-[#f0f1f4] mx-3 my-1" />

          {!creatingNew ? (
            <button
              type="button"
              onClick={() => setCreatingNew(true)}
              className="flex items-center gap-2 px-3 py-[7px] w-full text-left text-[13px] text-[#4a4f5c] hover:bg-[#f6f7f9] bg-transparent border-0 cursor-pointer transition-colors"
            >
              <Plus size={14} strokeWidth={2.2} className="text-[#8b909c]" />
              Nuevo proyecto
            </button>
          ) : (
            <div className="px-3 py-2">
              <input
                ref={newInputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitCreate();
                  if (e.key === 'Escape') { setCreatingNew(false); setNewName(''); }
                }}
                placeholder="Nombre del proyecto"
                className="w-full text-[13px] border border-[#5a67f2] rounded-lg px-2 py-1.5 outline-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={!newName.trim()}
                  onClick={commitCreate}
                  className="text-[12px] font-semibold text-white rounded-lg px-3 py-1 border-0 cursor-pointer hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-default"
                  style={{ background: accentColor }}
                >
                  Crear
                </button>
                <button
                  type="button"
                  onClick={() => { setCreatingNew(false); setNewName(''); }}
                  className="text-[12px] font-semibold text-[#4a4f5c] bg-white border border-[#e4e6ec] rounded-lg px-3 py-1 cursor-pointer hover:bg-[#f6f7f9] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
