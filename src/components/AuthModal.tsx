import { AlertCircle, ArrowLeft, Lock, Mail, User, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, setStoredToken } from '../lib/api.ts';
import type { UserProfile } from '../types.ts';
import { NodakLogo } from './NodakLogo.tsx';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: UserProfile, token: string) => void;
}

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ssoPromptProvider, setSsoPromptProvider] = useState<'google' | 'microsoft' | null>(null);
  const [ssoEmail, setSsoEmail] = useState('');
  const [ssoName, setSsoName] = useState('');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token && event.data?.user) {
        setStoredToken(event.data.token);
        onAuthenticated(event.data.user, event.data.token);
        onClose();
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(event.data.error || 'No se pudo completar la autenticación externa.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuthenticated, onClose]);

  useEffect(() => {
    if (!open) {
      setSsoPromptProvider(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleLocalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const body = mode === 'login' ? { email, password } : { email, password, name, company };
      const res = await apiRequest<{ token: string; user: UserProfile }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setStoredToken(res.token);
      onAuthenticated(res.user, res.token);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/api/v1/auth/demo', {
        method: 'POST',
      });
      setStoredToken(res.token);
      onAuthenticated(res.user, res.token);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la vista de prueba.');
    } finally {
      setLoading(false);
    }
  };

  const handleSsoClick = async (provider: 'google' | 'microsoft') => {
    setError(null);
    try {
      const data = await apiRequest<{
        configured: boolean;
        url?: string;
      }>(`/api/v1/auth/${provider}/url`);

      if (data.configured && data.url) {
        const popup = window.open(data.url, `nodak_${provider}_oauth`, 'width=560,height=680');
        if (!popup) {
          setError('El navegador bloqueó la ventana emergente. Habilita popups para continuar.');
        }
        return;
      }

      setSsoPromptProvider(provider);
      setSsoEmail(provider === 'google' ? 'nodakgroup@gmail.com' : '');
      setSsoName('');
    } catch {
      setSsoPromptProvider(provider);
    }
  };

  const handleSsoDirectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ssoPromptProvider) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/api/v1/auth/sso-direct', {
        method: 'POST',
        body: JSON.stringify({
          provider: ssoPromptProvider,
          email: ssoEmail,
          name: ssoName || undefined,
          company: company || undefined,
        }),
      });
      setStoredToken(res.token);
      onAuthenticated(res.user, res.token);
      setSsoPromptProvider(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el acceso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative my-6 w-full max-w-md rounded-2xl border border-white/[0.14] bg-[#080C17] p-7 text-[#F5F7FA] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="absolute right-5 top-5 rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <NodakLogo size="sm" />
          <h2 id="auth-modal-title" className="mt-4 text-xl font-bold tracking-tight text-white">
            {ssoPromptProvider
              ? `Continuar con ${ssoPromptProvider === 'google' ? 'Google' : 'Microsoft Outlook'}`
              : mode === 'login'
                ? 'Entrar a NODAK'
                : 'Registrar tu empresa'}
          </h2>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Acceso unificado para tus aplicaciones en Amazon Web Services.
          </p>
        </div>

        {ssoPromptProvider ? (
          <form onSubmit={handleSsoDirectSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setSsoPromptProvider(null);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FCCB06] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Otros métodos de acceso
            </button>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#CBD5E1]">
                Correo de {ssoPromptProvider === 'google' ? 'Google / Gmail' : 'Outlook / Microsoft 365'}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="email"
                  required
                  value={ssoEmail}
                  onChange={(e) => setSsoEmail(e.target.value)}
                  placeholder={ssoPromptProvider === 'google' ? 'nombre@gmail.com' : 'nombre@outlook.com'}
                  className="w-full rounded-xl border border-white/[0.14] bg-black py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#FCCB06]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#CBD5E1]">Nombre completo</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  value={ssoName}
                  onChange={(e) => setSsoName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-white/[0.14] bg-black py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#FCCB06]"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-[#A50044]/60 bg-[#A50044]/15 px-3 py-2 text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#FCCB06] py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#FDE047] disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSsoClick('google')}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.16] bg-black px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:border-[#FCCB06] whitespace-nowrap"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>

              <button
                type="button"
                onClick={() => handleSsoClick('microsoft')}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.16] bg-black px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:border-[#FCCB06] whitespace-nowrap"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 21 21" aria-hidden="true">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Outlook / MS
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.1]" />
              <span className="text-xs text-[#94A3B8]">o con correo corporativo</span>
              <div className="h-px flex-1 bg-white/[0.1]" />
            </div>

            <form onSubmit={handleLocalSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#CBD5E1]">Nombre Completo</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Valeria Mendoza"
                        className="w-full rounded-xl border border-white/[0.14] bg-black py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors focus:border-[#FCCB06]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#CBD5E1]">Empresa</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Empresa S.A."
                      className="w-full rounded-xl border border-white/[0.14] bg-black px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#FCCB06]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-[#CBD5E1]">Correo Corporativo</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="direccion@empresa.com"
                    className="w-full rounded-xl border border-white/[0.14] bg-black py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors focus:border-[#FCCB06]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#CBD5E1]">Contraseña</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-white/[0.14] bg-black py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors focus:border-[#FCCB06]"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-[#A50044]/60 bg-[#A50044]/15 px-3 py-2 text-xs text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#FCCB06] py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#FDE047] disabled:opacity-50"
              >
                {loading ? 'Ingresando...' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            </form>

            <div className="mt-4 flex flex-col gap-2.5 border-t border-white/[0.08] pt-4">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full rounded-xl border border-white/[0.14] bg-black py-2 text-xs font-bold text-[#CBD5E1] transition-colors hover:border-[#FCCB06] hover:text-white"
              >
                Entrar con cuenta de demostración
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                }}
                className="text-center text-xs font-bold text-[#FCCB06] hover:underline"
              >
                {mode === 'login' ? '¿Aún no tienes cuenta? Registra tu empresa' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
