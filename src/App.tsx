import { useEffect, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ReadOnlyShell } from './components/layout/ReadOnlyShell';
import { LoginScreen } from './components/auth/LoginScreen';
import { useProjectData } from './hooks/useProjectData';
import { useAuth } from './hooks/useAuth';
import { useFirebaseProjects } from './hooks/useFirebaseProjects';
import { decompressFromBase64, type SharePayload } from './utils/share';
import type { ProjectData } from './data/types';

export default function App() {
  const { data, loading: dataLoading, error: dataError } = useProjectData();

  // ── Auth ──────────────────────────────────────────────────────────────────────
  const { user, loading: authLoading, error: authError, signIn, signOut } = useAuth();
  const { store: fbStore, loading: fbLoading, ready: fbReady } = useFirebaseProjects(user);

  // ── Share / import state ──────────────────────────────────────────────────────
  const [readOnlyPayload, setReadOnlyPayload] = useState<SharePayload | null>(null);
  const [readOnlyError, setReadOnlyError]     = useState<string | null>(null);
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

  // "Importar vista compartida" file handler
  function handleShareFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      try {
        const payload = JSON.parse(text) as SharePayload;
        if (!payload.version || !payload.tasks) throw new Error('formato inválido');
        setPendingImport(payload);
      } catch {
        alert('El archivo no tiene el formato esperado.');
      }
    });
    e.target.value = '';
  }

  // ── Special views (don't require auth) ───────────────────────────────────────
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

  // ── Loading: waiting for data / auth ─────────────────────────────────────────
  if (dataLoading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f7f9] text-[#9aa0ad] text-sm">
        Cargando...
      </div>
    );
  }

  if (dataError || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f7f9] text-red-500 text-sm">
        {dataError ?? 'Error al cargar los datos del proyecto.'}
      </div>
    );
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────────
  if (!user) {
    return <LoginScreen onSignIn={signIn} loading={authLoading} error={authError} />;
  }

  // Wait for Firebase store to finish loading before mounting AppShell
  // (useState initializer runs only once — store must be final at mount time)
  if (fbLoading || !fbReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f7f9] text-[#9aa0ad] text-sm">
        Cargando proyectos...
      </div>
    );
  }

  // ── Enrich data with Firebase user identity ───────────────────────────────────
  const enrichedData: ProjectData = {
    ...data,
    currentUser: {
      ...data.currentUser,
      name:      user.displayName ?? data.currentUser.name,
      shortName: user.displayName?.split(' ')[0] ?? data.currentUser.shortName,
      initials:  user.displayName
        ? user.displayName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
        : data.currentUser.initials,
      photoURL: user.photoURL ?? null,
    },
  };

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
        data={enrichedData}
        onImportSharedView={() => fileRef.current?.click()}
        pendingImport={pendingImport}
        onPendingImportDone={() => setPendingImport(null)}
        initialStore={fbStore}
        onSignOut={signOut}
      />
    </>
  );
}
