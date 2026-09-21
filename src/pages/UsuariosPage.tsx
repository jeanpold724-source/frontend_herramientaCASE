import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Lock,
  Mail,
  User,
  Palette,
  AlertCircle,
  ShieldCheck,
  Shield,
  ChevronDown,
} from 'lucide-react';
import api from '../api/api';

export interface UsuarioItem {
  id: string;
  nombreCompleto: string;
  correo: string;
  colorCursor: string;
  activo: boolean;
  esAdministrador?: boolean;
}

const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
];

const UsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [colorCursor, setColorCursor] = useState('#3B82F6');
  const [tipoCuenta, setTipoCuenta] = useState<'ESTANDAR' | 'ADMINISTRADOR'>('ESTANDAR');

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<UsuarioItem[]>('/usuarios');
      setUsuarios(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'No se pudo cargar la lista de usuarios.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleToggleEstado = async (u: UsuarioItem) => {
    try {
      setActionLoading(u.id);
      const endpoint = u.activo
        ? `/usuarios/${u.id}/desactivar`
        : `/usuarios/${u.id}/activar`;
      await api.patch(endpoint);
      await fetchUsuarios();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Error al actualizar el estado del usuario.';
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    const esAdmin = tipoCuenta === 'ADMINISTRADOR';

    try {
      await api.post('/usuarios', {
        nombreCompleto: nombreCompleto.trim(),
        correo: correo.trim(),
        password,
        colorCursor,
        activo: true,
        esAdministrador: esAdmin,
      });

      // Reset form
      setNombreCompleto('');
      setCorreo('');
      setPassword('');
      setColorCursor('#3B82F6');
      setTipoCuenta('ESTANDAR');
      setIsModalOpen(false);

      // Recargar lista
      await fetchUsuarios();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { detail?: string; errores?: Record<string, string> } } })?.response?.data;
      if (res?.errores) {
        const firstError = Object.values(res.errores)[0];
        setModalError(firstError);
      } else {
        setModalError(res?.detail ?? 'Error al registrar el nuevo usuario.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
      u.correo.toLowerCase().includes(search.toLowerCase())
  );

  const totalActivos = usuarios.filter((u) => u.activo).length;
  const totalInactivos = usuarios.length - totalActivos;

  return (
    <div className="space-y-6">
      {/* ── Encabezado & Acciones ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Gestión de Usuarios</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Administra los ingenieros de software y accesos al sistema Nexus CASE
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsuarios}
            disabled={loading}
            className="p-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-nuevo-usuario"
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white text-slate-950 hover:bg-slate-200 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* ── Tarjetas de Métricas (Estilo Linear) ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
              Total Usuarios
            </p>
            <p className="text-2xl font-bold text-white mt-1">{usuarios.length}</p>
          </div>
          <div className="w-10 h-10 bg-white/5 border border-white/10 text-slate-300 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
              Activos
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{totalActivos}</p>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
              Inactivos
            </p>
            <p className="text-2xl font-bold text-slate-400 mt-1">{totalInactivos}</p>
          </div>
          <div className="w-10 h-10 bg-slate-800/40 border border-white/10 text-slate-400 rounded-xl flex items-center justify-center">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── Barra de Búsqueda ───────────────────────────────────────── */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="w-full bg-slate-900/40 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
        />
      </div>

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchUsuarios}
            className="underline hover:text-white transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Tabla de Usuarios (Fondo sutil, bordes finos) ───────────── */}
      <div className="bg-slate-900/30 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-5">Usuario</th>
                <th className="py-3.5 px-5">Correo Electrónico</th>
                <th className="py-3.5 px-5">Color de Cursor</th>
                <th className="py-3.5 px-5">Estado</th>
                <th className="py-3.5 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Cargando directorio de usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="font-medium text-slate-300">No se encontraron usuarios</p>
                      <p className="text-xs text-slate-500">
                        {search
                          ? 'No hay resultados que coincidan con la búsqueda.'
                          : 'Haz clic en "Nuevo Usuario" para registrar el primero.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u) => {
                  const esAdmin =
                    u.correo.toLowerCase().includes('admin') ||
                    u.correo.toLowerCase().includes('administrador') ||
                    u.correo.toLowerCase() === 'jeanpold724@gmail.com';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                            style={{ backgroundColor: u.colorCursor || '#6366f1' }}
                          >
                            {u.nombreCompleto.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">
                                {u.nombreCompleto}
                              </span>
                              {esAdmin ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                  Admin
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white/5 text-slate-400 border border-white/5">
                                  Ingeniero
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {u.id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-300 font-mono text-xs">
                        {u.correo}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-950/40 border border-white/10 text-xs">
                          <div
                            className="w-3 h-3 rounded-full border border-white/20"
                            style={{ backgroundColor: u.colorCursor }}
                          />
                          <span className="font-mono text-slate-300 text-xs">
                            {u.colorCursor}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {u.activo ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleToggleEstado(u)}
                          disabled={actionLoading === u.id}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            u.activo
                              ? 'border-transparent text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20'
                              : 'border-transparent text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                          } disabled:opacity-50`}
                        >
                          {actionLoading === u.id
                            ? 'Actualizando...'
                            : u.activo
                            ? 'Desactivar'
                            : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Registrar Ingeniero / Administrador ─────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/80 relative">
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Registrar Usuario
                  </h3>
                  <p className="text-xs text-slate-400">
                    Crea una nueva cuenta con credenciales y permisos de acceso
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error dentro del modal */}
            {modalError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleCrearUsuario} className="mt-5 space-y-4">
              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    placeholder="Ej. Ing. Laura Ramírez"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="ingeniero@empresa.com"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>
              </div>

              {/* Contraseña Inicial */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Contraseña Inicial (mínimo 8 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>
              </div>

              {/* NUEVO CAMPO: Tipo de Cuenta */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tipo de Cuenta
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="select-tipo-cuenta"
                    value={tipoCuenta}
                    onChange={(e) =>
                      setTipoCuenta(e.target.value as 'ESTANDAR' | 'ADMINISTRADOR')
                    }
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="ESTANDAR" className="bg-slate-900 text-white">
                      Ingeniero de Software (Estándar)
                    </option>
                    <option value="ADMINISTRADOR" className="bg-slate-900 text-white">
                      Administrador del Sistema
                    </option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {tipoCuenta === 'ADMINISTRADOR' && (
                  <p className="text-[11px] text-indigo-300 mt-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <span>
                      Tendrá acceso total a la gestión de usuarios y catálogo de roles.
                    </span>
                  </p>
                )}
              </div>

              {/* Color de Cursor Colaborativo */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Color de Cursor Colaborativo
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Palette className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      pattern="^#[0-9A-Fa-f]{6}$"
                      value={colorCursor}
                      onChange={(e) => setColorCursor(e.target.value)}
                      placeholder="#3B82F6"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                    />
                  </div>
                  <input
                    type="color"
                    value={colorCursor}
                    onChange={(e) => setColorCursor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>

                {/* Paleta rápida de colores */}
                <div className="flex items-center gap-2 mt-2.5">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColorCursor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        colorCursor.toUpperCase() === color.toUpperCase()
                          ? 'scale-110 border-white ring-2 ring-indigo-500/50'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-usuario"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-white text-slate-950 hover:bg-slate-200 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>{submitting ? 'Registrando...' : 'Registrar Ingeniero'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosPage;
