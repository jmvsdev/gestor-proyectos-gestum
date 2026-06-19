import { useEffect, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ReadOnlyShell } from './components/layout/ReadOnlyShell';
import { useProjectData } from './hooks/useProjectData';
import { decompressFromBase64, type SharePayload } from './utils/share';

export default function App() {
  const { data, loading, error } = useProjectData();
  const [readOnlyPayload, setReadOnlyPayload] = useState<SharePayload | null>(null);
  const [readOnlyError, setReadOnlyError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Detect #shared=<base64> hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#shared=')) return;
    const encoded = hash.slice('#shared='.length);
    decompressFromBase64(encoded)
      .then(json => setReadOnlyPayload(JSON.parse(json) as SharePayload))
      .catch(() => setReadOnlyError('El enlace no es válido o está dañado.'));
  }, []);

  // Handle "Importar vista compartida" file
  function handleShareFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      try {
        const payload = JSON.parse(text) as SharePayload;
        if (!payload.version || !payload.tasks) throw new Error('formato inválido');
        setReadOnlyPayload(payload);
      } catch {
        setReadOnlyError('El archivo no tiene el formato esperado.');
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
      {/* Hidden file input for "Importar vista compartida" */}
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        aria-label="Importar vista compartida"
        onChange={handleShareFile}
      />
      <AppShell data={data} onImportSharedView={() => fileRef.current?.click()} />
    </>
  );
}
