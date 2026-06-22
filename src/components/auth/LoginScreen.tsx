interface LoginScreenProps {
  onSignIn: () => void;
  loading?: boolean;
  error?: string | null;
}

export function LoginScreen({ onSignIn, loading = false, error }: LoginScreenProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#f6f7f9]">
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#eceef2] px-10 py-10 w-full max-w-[380px] flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm" style={{ background: '#5a67f2' }}>
            G
          </div>
          <span className="text-[22px] font-bold text-[#272b36] tracking-tight">Gestum</span>
          <span className="text-[13px] text-[#9aa0ad] text-center leading-snug">
            Gestión de proyectos para equipos
          </span>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[#eceef2]" />

        {/* Sign-in button */}
        <div className="w-full flex flex-col items-center gap-3">
          <p className="text-[13px] text-[#4a4f5c] font-medium">Inicia sesión para continuar</p>

          <button
            type="button"
            onClick={onSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-[#e0e2e8] rounded-xl px-4 py-[11px] text-[13.5px] font-semibold text-[#272b36] cursor-pointer hover:bg-[#f8f9fb] hover:border-[#c8cad2] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-[18px] h-[18px] rounded-full border-2 border-[#5a67f2] border-t-transparent animate-spin flex-shrink-0" />
            ) : (
              /* Google icon */
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Autenticando...' : 'Entrar con Google'}
          </button>

          {error && (
            <p className="text-[12px] text-[#ef4444] text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <p className="text-[11.5px] text-[#b3b8c2] text-center">
          Tus datos se guardan de forma segura en tu cuenta.
        </p>
      </div>
    </div>
  );
}
