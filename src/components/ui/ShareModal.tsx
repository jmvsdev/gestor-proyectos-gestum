import { useState } from 'react';
import { X, Copy, Check, Download, Link } from 'lucide-react';

interface ShareModalProps {
  url: string | null;        // null = data too large for URL
  projectName: string;
  onDownload: () => void;
  onClose: () => void;
}

export function ShareModal({ url, projectName, onDownload, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] w-[460px] max-w-[calc(100vw-32px)] p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-[#272b36]">Compartir proyecto</h2>
            <p className="text-[12.5px] text-[#8b909c] mt-0.5">{projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9aa0ad] hover:bg-[#f0f1f4] transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {url ? (
          // URL mode — fits in link
          <>
            <p className="text-[13px] text-[#4a4f5c] leading-relaxed">
              Este enlace incluye un <strong>snapshot</strong> de solo lectura del estado actual.
              Cualquier persona con el enlace puede ver las tareas, el Gantt y el Panel sin poder editar.
            </p>

            {/* URL field + copy */}
            <div className="flex items-center gap-2 bg-[#f6f7f9] border border-[#e4e6ec] rounded-xl px-3 py-2.5">
              <Link size={14} strokeWidth={2} className="text-[#9aa0ad] flex-shrink-0" />
              <span className="flex-1 text-[12px] text-[#4a4f5c] truncate font-mono">{url}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-[#5a67f2] text-white rounded-lg px-3 py-1.5 text-[12px] font-semibold cursor-pointer border-0 hover:brightness-110 transition-all flex-shrink-0"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <p className="text-[11.5px] text-[#9aa0ad]">
              El enlace contiene los datos comprimidos — no requiere servidor ni cuenta.
            </p>
          </>
        ) : (
          // File mode — too large for URL
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12.5px] text-amber-800 leading-relaxed">
              <strong>El proyecto es demasiado grande para un enlace URL.</strong><br />
              Descarga el archivo y compártelo. El destinatario lo abre con "Importar vista compartida".
            </div>

            <p className="text-[13px] text-[#4a4f5c] leading-relaxed">
              El archivo incluye un snapshot de solo lectura completo (tareas, fases, responsables, fechas).
            </p>

            <button
              type="button"
              onClick={() => { onDownload(); onClose(); }}
              className="flex items-center justify-center gap-2 bg-[#5a67f2] text-white rounded-xl px-4 py-3 text-[13.5px] font-semibold cursor-pointer border-0 hover:brightness-110 transition-all"
            >
              <Download size={16} />
              Descargar archivo de vista compartida
            </button>
          </>
        )}
      </div>
    </div>
  );
}
