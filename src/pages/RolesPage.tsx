import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldPlus,
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import api from '../api/api';

export interface RolPermisos {
  recursos: string[];
  acciones: string[];
}

export interface RolItem {
  id: number;
  codigo: string;
  nombre: string;
  permisos: RolPermisos;
}

const AVAILABLE_RECURSOS = ['PROYECTO', 'DIAGRAMA', 'MIEMBRO', 'ROL', 'CODIGO'];
const AVAILABLE_ACCIONES = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

const ACCION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  READ:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  UPDATE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [selectedRecursos, setSelectedRecursos] = useState<string[]>(['DIAGRAMA', 'PROYECTO']);
  const [selectedAcciones, setSelectedAcciones] = useState<string[]>(['READ']);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<RolItem[]>('/roles');
      setRoles(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'No se pudo cargar la lista de roles.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const toggleRecurso = (r: string) => {
    setSelectedRecursos((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const toggleAccion = (a: string) => {
    setSelectedAcciones((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const selectAllRecursos = () => setSelectedRecursos([...AVAILABLE_RECURSOS]);
  const selectAllAcciones = () => setSelectedAcciones([...AVAILABLE_ACCIONES]);

  const handleCrearRol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecursos.length === 0) {
      setModalError('Debes seleccionar al menos un recurso.');
      return;
    }
    if (selectedAcciones.length === 0) {
      setModalError('Debes seleccionar al menos una acción.');
      return;
    }

    setModalError(null);
    setSubmitting(true);

    try {
      await api.post('/roles', {
        codigo: codigo.toUpperCase().trim(),
        nombre: nombre.trim(),
        permisos: {
          recursos: selectedRecursos,
          acciones: selectedAcciones,
        },
      });

      // Reset
      setCodigo('');
      setNombre('');
      setSelectedRecursos(['DIAGRAMA', 'PROYECTO']);
      setSelectedAcciones(['READ']);
      setIsModalOpen(false);

      await fetchRoles();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { detail?: string; errores?: Record<string, string> } } })?.response?.data;
      if (res?.errores) {
        setModalError(Object.values(res.errores)[0]);
      } else {
        setModalError(res?.detail ?? 'Error al registrar el nuevo rol.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.nombre.toLowerCase().includes(search.toLowerCase()) ||
      r.codigo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Encabezado & Acciones ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-400" />
            Gestión de Roles (CU-05)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Administra los roles del sistema y sus permisos JSONB (recursos y acciones)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRoles}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all flex items-center justify-center cursor-pointer"
            title="Refrescar roles"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-nuevo-rol"
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <ShieldPlus className="w-4 h-4" />
            <span>Nuevo Rol</span>
          </button>
        </div>
      </div>

      {/* ── Barra de Búsqueda ───────────────────────────────────────── */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código (ej. PROPIETARIO) o nombre..."
          className="w-full bg-slate-900/70 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-red-400 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchRoles}
            className="underline hover:text-red-300 text-xs font-medium cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Tabla de Roles ───────────────────────────────────────────── */}
      <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="py-4 px-6">ID & Código</th>
                <th className="py-4 px-6">Nombre del Rol</th>
                <th className="py-4 px-6">Recursos Permitidos</th>
                <th className="py-4 px-6">Acciones (CRUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Cargando roles...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Shield className="w-8 h-8 text-slate-500" />
                      <p className="font-medium">No se encontraron roles</p>
                      <p className="text-xs text-slate-500">
                        {search
                          ? 'No hay roles que coincidan con la búsqueda.'
                          : 'Crea roles como PROPIETARIO, EDITOR o LECTOR.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoles.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-mono font-bold flex items-center justify-center">
                          {r.id}
                        </span>
                        <span className="font-mono font-bold text-white bg-slate-800/80 px-2.5 py-1 rounded-md text-xs border border-white/5 tracking-wide">
                          {r.codigo}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-semibold text-white">{r.nombre}</p>
                    </td>

                    {/* Badges de Recursos */}
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {r.permisos?.recursos?.length ? (
                          r.permisos.recursos.map((rec) => (
                            <span
                              key={rec}
                              className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-white/5"
                            >
                              {rec}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs italic">Ninguno</span>
                        )}
                      </div>
                    </td>

                    {/* Badges de Acciones */}
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {r.permisos?.acciones?.length ? (
                          r.permisos.acciones.map((acc) => (
                            <span
                              key={acc}
                              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                                ACCION_COLORS[acc] || 'bg-slate-800 text-slate-300 border-white/10'
                              }`}
                            >
                              {acc}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs italic">Ninguna</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Crear Rol (CU-05) ─────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <ShieldPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Crear Nuevo Rol</h3>
                  <p className="text-xs text-slate-400">CU-05: Definir rol con permisos JSONB</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCrearRol} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Código del Rol (Mayúsculas y guiones)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    pattern="^[A-Z_]+$"
                    maxLength={30}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="EJ: PROPIETARIO, EDITOR, LECTOR"
                    className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Solo mayúsculas y guiones bajos (sin espacios).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre Descriptivo
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Editor de Arquitectura"
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Checkboxes de Recursos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Recursos Permitidos
                  </label>
                  <button
                    type="button"
                    onClick={selectAllRecursos}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Seleccionar todos
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_RECURSOS.map((rec) => {
                    const isChecked = selectedRecursos.includes(rec);
                    return (
                      <button
                        key={rec}
                        type="button"
                        onClick={() => toggleRecurso(rec)}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-medium border flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-slate-800/40 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        <span>{rec}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checkboxes de Acciones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Acciones Permitidas
                  </label>
                  <button
                    type="button"
                    onClick={selectAllAcciones}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Seleccionar todas
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AVAILABLE_ACCIONES.map((acc) => {
                    const isChecked = selectedAcciones.includes(acc);
                    return (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => toggleAccion(acc)}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold border flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? `${ACCION_COLORS[acc] || 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'}`
                            : 'bg-slate-800/40 text-slate-400 border-white/5 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        <span>{acc}</span>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-rol"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ShieldPlus className="w-4 h-4" />
                  )}
                  <span>{submitting ? 'Creando...' : 'Crear Rol'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
