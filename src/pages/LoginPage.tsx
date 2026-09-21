import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Zap } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

interface LoginResponse {
  token: string;
  tokenType: string;
  id: string;
  nombreCompleto: string;
  correo: string;
  colorCursor?: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        correo,
        password: contrasena,
      });

      const esAdmin =
        correo.toLowerCase().includes('admin') ||
        correo.toLowerCase().includes('administrador') ||
        correo.toLowerCase() === 'jeanpold724@gmail.com';

      login(data.token, {
        id: data.id,
        nombreCompleto: data.nombreCompleto,
        correo: data.correo,
        rol: esAdmin ? 'ADMIN' : 'INGENIERO',
        activo: true,
        colorCursor: data.colorCursor,
        esAdministrador: esAdmin,
      });

      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; title?: string } } })
          ?.response?.data?.detail ??
        (err as { response?: { data?: { title?: string } } })
          ?.response?.data?.title ??
        'Credenciales inválidas. Verifica tu correo y contraseña.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Tarjeta del formulario (Estilo Linear/Vercel) */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-black/80 p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-3 text-white">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Nexus CASE
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Correo */}
            <div>
              <label
                htmlFor="correo"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                placeholder="usuario@empresa.com"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label
                htmlFor="contrasena"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="contrasena"
                  type={showPass ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón protagonista (Blanco / Texto Negro) */}
            <div className="pt-2">
              <button
                id="btn-login"
                type="submit"
                disabled={loading}
                className="w-full bg-white text-slate-950 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar sesión</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer minimalista */}
          <p className="text-center text-slate-600 text-[11px] mt-6">
            Nexus CASE &copy; {new Date().getFullYear()} · Arquitectura de Software
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
