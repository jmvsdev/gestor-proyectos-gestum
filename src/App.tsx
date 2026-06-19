import { useEffect, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ReadOnlyShell } from './components/layout/ReadOnlyShell';
import { useProjectData } from './hooks/useProjectData';
import { decompressFromBase64, type SharePayload } from './utils/share';

export default function App() {
  const { data, loading, error } = useProjectData();

  // #shared= URL hash → read-only client view (unchanged)
  const [readOnlyPayload, setReadOnlyPayload] = useState<SharePayload | null>(null);
  const [readOnlyError, setReadOnlyError]     = useState<string | null>(null);

  // File import → create a new project in the store (new behaviour)
  const [pendingImport, setPendingImport]     = useState<SharePayload | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // Detect #shared=<base64> hash on mount → open ReadOnlyShell
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#shared=')) return;
    const encoded = hash.slice('#shared='.length);
    decompressFromBase64(encoded)
      .then(json => setReadOnlyPayload(JSON.parse(json) as SharePayload))
      .catch(() => setReadOnlyError('El enlace no es válido o está dañado.'));
  }, []);

  // "Importar vista compartida" file handler — imports as new project
  function handleShareFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      try {
        const payload = JSON.parse(text) as SharePayload;
        if (!payload.version || !payload.tasks) throw new Error('formato inválido');
        setPendingImport(payload);
      } catch {
        // Show a brief error toast via the AppShell — not possible directly,
        // so just alert for now (rare path; file usually valid)
        alert('El archivo no tiene el formato esperado.');
      }
    });
    e.target.value = '';
  }

  if (readOnlyError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f6f7f9] gap-3">
        <p className="text-red-500 text-sm">{readOnlyError}</p>
        <button
          type="button"
          onClick={() => { setReadOnlyError(null); window.location.hash = ''; }}
          className="text-[#5a67f2] text-sm underline cursor-pointer bg-transparent border-0"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  if (readOnlyPayload) {
    return <ReadOnlyShell payload={readOnlyPayload} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f7f9] text-[#9aa0ad] text-sm">
        Cargando...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f7f9] text-red-500 text-sm">
        {error ?? 'Error al cargar los datos del proyecto.'}
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        aria-label="Importar vista compartida"
        onChange={handleShareFile}
      />
      <AppShell
        data={data}
        onImportSharedView={() => fileRef.current?.click()}
        pendingImport={pendingImport}
        onPendingImportDone={() => setPendingImport(null)}
      />
    </>
  );
}
