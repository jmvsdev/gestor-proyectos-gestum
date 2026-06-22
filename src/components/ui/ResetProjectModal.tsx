import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ResetProjectModalProps {
  projectName: string;
  onReset: () => void;
  onClose: () => void;
}

export function ResetProjectModal({ projectName, onReset, onClose }: ResetProjectModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const canReset = confirmText === 'ELIMINAR';

  function handleReset() {
    if (!canReset) return;
    onReset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-[#eceef2] w-full max-w-[420px] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f1f4]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} strokeWidth={2} className="text-[#ef4444]" />
            <span className="font-semibold text-[14px] text-[#272b36]">Configuración del proyecto</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f3f4f7] text-[#8b909c] bg-transparent border-0 cursor-pointer transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Section label */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#9aa0ad] mb-0.5">
              Administración · Zona de peligro
            </p>
            <p className="text-[13.5px] font-semibold text-[#272b36]">
              Resetear &ldquo;{projectName}&rdquo;
            </p>
          </div>

          {/* Warning box */}
          <div className="bg-[#fff5f5] border border-[#fecaca] rounded-xl px-3.5 py-3">
            <p className="text-[12.5px] text-[#991b1b] leading-relaxed">
              Esta acción <strong>eliminará todas las tareas</strong> del proyecto de
              forma <strong>permanente e irreversible</strong>. Los datos se borrarán
              inmediatamente en Firebase y no se podrán recuperar.
            </p>
          </div>

          {/* Confirm input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-[#4a4f5c]">
              Escribe{' '}
              <code className="font-mono font-bold tracking-wider bg-[#f3f4f7] px-1 py-0.5 rounded text-[11.5px]">
                ELIMINAR
              </code>{' '}
              para habilitar el botón:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              autoComplete="off"
              className="w-full px-3 py-2 text-[13px] rounded-xl outline-none transition-colors bg-[#fafbfc]"
              style={{
                border: `1.5px solid ${confirmText && !canReset ? '#fca5a5' : '#e0e2e8'}`,
              }}
            />
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-5 pb-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-[9px] text-[13px] font-semibold text-[#4a4f5c] bg-[#f3f4f7] rounded-xl border-0 cursor-pointer hover:bg-[#eceef2] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!canReset}
            className="flex-1 py-[9px] text-[13px] font-semibold text-white rounded-xl border-0 transition-all"
            style={{
              background: canReset ? '#ef4444' : '#fca5a5',
              cursor: canReset ? 'pointer' : 'not-allowed',
            }}
          >
            Resetear proyecto
          </button>
        </div>
      </div>
    </div>
  );
}
