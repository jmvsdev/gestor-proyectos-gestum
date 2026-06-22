import { useEffect, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ReadOnlyShell } from './components/layout/ReadOnlyShell';
import { LoginScreen } from './components/auth/LoginScreen';
import { useProjectData } from './hooks/useProjectData';
import { useAuth } from './hooks/useAuth';
import { useFirebaseProjects } from './hooks/useFirebaseProjects';
import { acceptInvitation, readInvitationMeta } from './components/ui/InviteModal';
import { decompressFromBase64, type SharePayload } from './utils/share';
import type { ProjectData } from './data/types';

export default function App() {
  const { data, loading: dataLoading, error: dataError } = useProjectData();
  const { user, loading: authLoading, error: authError, signIn, signOut } = useAuth();
  const { store: fbStore, loading: fbLoading, ready: fbReady } = useFirebaseProjects(user);

  // ── Share / import state ──────────────────────────────────────────────────────
  const [readOnlyPayload, setReadOnlyPayload] = useState<SharePayload | null>(null);
  const [readOnlyError, setReadOnlyError]     = useState<string | null>(null);
  const [pendingImport, setPendingImport]     = useState<SharePayload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Join invitation state ─────────────────────────────────────────────────────
  const [joinToken, setJoinToken]       = useState<string | null>(null);
  const [joinMeta, setJoinMeta]         = useState<{ projectId: string; projectName: string } | null>(null);
  const [joinStatus, setJoinStatus]     = useState<'idle' | 'loading' | 'confirm' | 'accepting' | 'done' | 'error'>('idle');
  const [joinError, setJoinError]       = useState<string | null>(null);

  // Detect #shared= hash and ?join= query param on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#shared=')) {
      const encoded = hash.slice('#shared='.length);
      decompressFromBase64(encoded)
        .then(json => setReadOnlyPayload(JSON.parse(json) as SharePayload))
        .catch(() => setReadOnlyError('El enlace no es válido o está dañado.'));
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('join');
    if (token) {
      setJoinToken(token);
      setJoinStatus('loading');
    }
  }, []);

  // Once user is logged in and we have a join token, load invitation meta
  useEffect(() => {
    if (!joinToken || joinStatus !== 'loading') return;
    if (!user) return; // wait for login first

    readInvitationMeta(joinToken)
      .then(meta => {
        if (!meta) {
          setJoinStatus('error');
          setJoinError('La invitación no existe, ya fue usada o expiró.');
          return;
        }
        setJoinMeta(meta);
        setJoinStatus('confirm');
      })
      .catch(() => {
        setJoinStatus('error');
        setJoinError('No se pudo verificar la invitación. Revisa tu conexión.');
      });
  }, [joinToken, joinStatus, user?.uid]);

  async function handleAcceptJoin() {
    if (!joinToken || !user) return;
    setJoinStatus('accepting');
    try {
      const pid = await acceptInvitation(joinToken, user.uid);
      if (!pid) {
        setJoinStatus('error');
        setJoinError('La invitación ya fue usada por otra cuenta.');
        return;
      }
      // Remove ?join= from URL and reload to load the new project
      const url = new URL(window.location.href);
      url.searchParams.delete('join');
      window.history.replaceState({}, '', url.toString());
      // Reload so useFirebaseProjects picks up the new project
      window.location.reload();
    } catch {
      setJoinStatus('error');
      setJoinError('Error al unirse al proyecto. Intenta de nuevo.');
    }
  }

  function handleRejectJoin() {
    const url = new URL(window.location.href);
    url.searchParams.delete('join');
    window.history.replaceState({}, '', url.toString());
    setJoinToken(null);
    setJoinStatus('idle');
    setJoinMeta(null);
  }

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

  // ── Special views ─────────────────────────────────────────────────────────────

  if (readOnlyError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f6f7f9] gap-3">
        <p className="text-red-500 text-sm">{readOnlyError}</p>
        <button type="button" onClick={() => { setReadOnlyError(null); window.location.hash = ''; }}
          className="text-[#5a67f2] text-sm underline cursor-pointer bg-transparent border-0">
          Volver al inicio
        </button>
      </div>
    );
  }

  if (readOnlyPayload) return <ReadOnlyShell payload={readOnlyPayload} />;

  // ── Loading gates ─────────────────────────────────────────────────────────────

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
    return (
      <LoginScreen
        onSignIn={signIn}
        loading={authLoading}
        error={authError}
      />
    );
  }

  // ── Join invitation flow ──────────────────────────────────────────────────────

  if (joinToken && joinStatus !== 'idle' && joinStatus !== 'done') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f7f9] p-4">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#eceef2] px-8 py-8 w-full max-w-[380px] flex flex-col items-center gap-5 text-center">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: '#5a67f2' }}>
            G
          </div>
          {(joinStatus === 'loading' || joinStatus === 'accepting') && (
            <>
              <span className="w-8 h-8 rounded-full border-2 border-[#5a67f2] border-t-transparent animate-spin" />
              <p className="text-[13px] text-[#9aa0ad]">
                {joinStatus === 'accepting' ? 'Uniéndote al proyecto…' : 'Verificando invitación…'}
              </p>
            </>
          )}
          {joinStatus === 'confirm' && joinMeta && (
            <>
              <div>
                <p className="text-[15px] font-semibold text-[#272b36]">Invitación al proyecto</p>
                <p className="text-[22px] font-bold text-[#272b36] mt-1">{joinMeta.projectName}</p>
              </div>
              <p className="text-[12.5px] text-[#9aa0ad]">
                ¿Quieres unirte a este proyecto y colaborar en tiempo real?
              </p>
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={handleRejectJoin}
                  className="flex-1 py-2.5 text-[13px] font-semibold text-[#4a4f5c] bg-[#f3f4f7] rounded-xl border-0 cursor-pointer hover:bg-[#eceef2] transition-colors"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={handleAcceptJoin}
                  className="flex-1 py-2.5 text-[13px] font-semibold text-white rounded-xl border-0 cursor-pointer hover:brightness-110 transition-all"
                  style={{ background: '#5a67f2' }}
                >
                  Aceptar
                </button>
              </div>
            </>
          )}
          {joinStatus === 'error' && (
            <>
              <p className="text-[13px] font-semibold text-[#ef4444]">{joinError}</p>
              <button
                type="button"
                onClick={handleRejectJoin}
                className="w-full py-2.5 text-[13px] font-semibold text-[#4a4f5c] bg-[#f3f4f7] rounded-xl border-0 cursor-pointer"
              >
                Continuar sin unirse
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Wait for Firebase store ───────────────────────────────────────────────────

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
        user={user}
        onImportSharedView={() => fileRef.current?.click()}
        pendingImport={pendingImport}
        onPendingImportDone={() => setPendingImport(null)}
        initialStore={fbStore}
        onSignOut={signOut}
      />
    </>
  );
}
