import { useState } from 'react';
import type { ReactNode } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Assignee, Phase, Task } from '../../data/types';

export type TaskFormMode = 'create' | 'edit' | 'view';

interface TaskFormModalProps {
  phases: Phase[];
  assignees: Assignee[];
  defaultPhaseId: string;
  accentColor: string;
  mode: TaskFormMode;
  initialTask?: Task;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onCancel: () => void;
}

const TITLE_BY_MODE: Record<TaskFormMode, string> = {
  create: 'Nueva tarea',
  edit:   'Editar tarea',
  view:   'Detalle de tarea',
};

const SAVE_LABEL_BY_MODE: Record<'create' | 'edit', string> = {
  create: 'Crear tarea',
  edit:   'Guardar cambios',
};

export function TaskFormModal({
  phases, assignees, defaultPhaseId, accentColor,
  mode, initialTask, onSave, onDelete, onCancel,
}: TaskFormModalProps) {
  const t = initialTask;
  const disabled = mode === 'view';

  const [title, setTitle]             = useState(t?.title ?? '');
  const [description, setDescription] = useState(t?.description ?? '');
  const [phaseId, setPhaseId]         = useState(t?.phaseId ?? defaultPhaseId);
  const [assigneeId, setAssigneeId]   = useState<string | null>(t?.assigneeId ?? null);
  const [status, setStatus]           = useState<Task['status']>(t?.status ?? 'sin-empezar');
  const [priority, setPriority]       = useState<NonNullable<Task['priority']>>(t?.priority ?? 'normal');
  const [startDate, setStartDate]     = useState(t?.startDate ?? '');
  const [dueDate, setDueDate]         = useState(t?.dueDate ?? '');
  const [risk, setRisk]               = useState<NonNullable<Task['risk']> | ''>(t?.risk ?? '');
  const [isMilestone, setIsMilestone] = useState(t?.isMilestone ?? false);
  const [titleError, setTitleError]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const realAssignees = assignees.filter(a => a.id !== 'sa');

  function handleSave() {
    if (!title.trim()) { setTitleError(true); return; }
    const updated: Task = {
      // Preserve any fields not in the form (tags, vendor, budget, etc.)
      ...(mode === 'edit' && t ? t : {}),
      id: mode === 'edit' && t ? t.id : `task-manual-${Date.now()}`,
      title: title.trim(),
      phaseId,
      assigneeId,
      status,
      priority,
      description: description.trim() || undefined,
      startDate:   startDate   || undefined,
      dueDate:     dueDate     || undefined,
      risk:        risk        || undefined,
      isMilestone: isMilestone || undefined,
    };
    onSave(updated);
  }

  function handleDelete() {
    if (t && onDelete) onDelete(t.id);
  }

  const inputCls = `w-full border border-[#e4e6ec] rounded-lg px-3 py-2 text-[13px] outline-none ${disabled ? 'bg-[#fafafa] text-[#6b7280] cursor-default' : 'bg-white'}`;
  const selectCls = `w-full border border-[#e4e6ec] rounded-lg px-3 py-2 text-[13px] outline-none ${disabled ? 'bg-[#fafafa] text-[#6b7280] cursor-default' : 'bg-white cursor-pointer'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] w-[520px] max-w-[calc(100vw-32px)] max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f0f1f4] sticky top-0 bg-white z-10">
          <h2 className="text-[15px] font-bold text-[#272b36]">{TITLE_BY_MODE[mode]}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9aa0ad] hover:bg-[#f0f1f4] transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Título */}
          <div>
            <label className="block text-[11.5px] font-bold text-[#4a4f5c] mb-1.5 uppercase tracking-wide">
              Título {!disabled && <span className="text-red-400 normal-case">*</span>}
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleError(false); }}
              placeholder="Nombre de la tarea…"
              autoFocus={!disabled}
              disabled={disabled}
              className={inputCls}
              style={titleError ? { borderColor: '#ef4444' } : {}}
            />
            {titleError && <p className="text-[11px] text-red-400 mt-1">El título es obligatorio.</p>}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-[11.5px] font-bold text-[#4a4f5c] mb-1.5 uppercase tracking-wide">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={disabled ? '—' : 'Descripción opcional…'}
              rows={2}
              disabled={disabled}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Fase + Asignado */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fase">
              <select value={phaseId} onChange={e => setPhaseId(e.target.value)} disabled={disabled} className={selectCls}>
                {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Asignado">
              <select
                value={assigneeId ?? ''}
                onChange={e => setAssigneeId(e.target.value || null)}
                disabled={disabled}
                className={selectCls}
              >
                <option value="">Sin asignar</option>
                {realAssignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Estado + Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estado">
              <select value={status} onChange={e => setStatus(e.target.value as Task['status'])} disabled={disabled} className={selectCls}>
                <option value="sin-empezar">Sin empezar</option>
                <option value="en-curso">En curso</option>
                <option value="en-revision">En revisión</option>
                <option value="bloqueada">Bloqueada</option>
                <option value="por-validar">Por validar</option>
                <option value="completada">Completada</option>
              </select>
            </Field>
            <Field label="Prioridad">
              <select value={priority} onChange={e => setPriority(e.target.value as NonNullable<Task['priority']>)} disabled={disabled} className={selectCls}>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="normal">Normal</option>
                <option value="baja">Baja</option>
              </select>
            </Field>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de inicio">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={disabled} className={inputCls} />
            </Field>
            <Field label="Fecha límite">
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={disabled} className={inputCls} />
            </Field>
          </div>

          {/* Riesgo + Hito */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label="Riesgo">
              <select value={risk} onChange={e => setRisk(e.target.value as NonNullable<Task['risk']> | '')} disabled={disabled} className={selectCls}>
                <option value="">Sin especificar</option>
                <option value="alto">Alto</option>
                <option value="medio">Medio</option>
                <option value="bajo">Bajo</option>
              </select>
            </Field>
            <div className="flex items-center gap-2 pb-[9px]">
              <input
                id="milestone-check"
                type="checkbox"
                checked={isMilestone}
                onChange={e => setIsMilestone(e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded"
                style={{ accentColor, cursor: disabled ? 'default' : 'pointer' }}
              />
              <label htmlFor="milestone-check" className="text-[12.5px] text-[#4a4f5c] select-none" style={{ cursor: disabled ? 'default' : 'pointer' }}>
                Marcar como hito
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-[#f0f1f4] sticky bottom-0 bg-white">
          {/* Delete — edit mode only */}
          {mode === 'edit' && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#ef4444] font-medium">¿Eliminar?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-[#ef4444] border-0 cursor-pointer hover:brightness-110 transition-all"
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#4a4f5c] border border-[#e4e6ec] bg-white cursor-pointer hover:border-[#cfd3dc] transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium text-[#ef4444] border border-[#fca5a5] bg-white cursor-pointer hover:bg-[#fef2f2] transition-colors"
              >
                <Trash2 size={13} />
                Eliminar
              </button>
            )
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#4a4f5c] border border-[#e4e6ec] bg-white hover:border-[#cfd3dc] cursor-pointer transition-colors"
            >
              {mode === 'view' ? 'Cerrar' : 'Cancelar'}
            </button>
            {mode !== 'view' && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white cursor-pointer border-0 hover:brightness-110 transition-all shadow-sm"
                style={{ background: accentColor }}
              >
                {SAVE_LABEL_BY_MODE[mode]}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-bold text-[#4a4f5c] mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
