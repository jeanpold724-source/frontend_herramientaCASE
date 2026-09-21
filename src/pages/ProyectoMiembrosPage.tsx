import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  ArrowLeft,
  RefreshCw,
  Search,
  Trash2,
  X,
  AlertCircle,
  FolderKanban,
  Shield,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import api from '../api/api';

export interface ProyectoMiembroItem {
  proyectoId: string;
  usuarioId: string;
  nombreUsuario: string;
  correoUsuario: string;
  colorCursorUsuario: string;
  rolId: number;
  codigoRol: string;
  nombreRol: string;
}

interface ProyectoInfo {
  id: string;
  nombre: string;
  paqueteBase: string;
  versionSpringBoot: string;
}

interface UsuarioOption {
  id: string;
  nombreCompleto: string;
  correo: string;
  colorCursor: string;
  activo: boolean;
}

interface RolOption {
  id: number;
  codigo: string;
  nombre: string;
}

const ProyectoMiembrosPage: React.FC = () => {
  const { proyectoId } = useParams<{ proyectoId: string }>();

  const [proyecto, setProyecto] = useState<ProyectoInfo | null>(null);
  const [miembros, setMiembros] = useState<ProyectoMiembroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Select Options
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<UsuarioOption[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<RolOption[]>([]);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState('');
  const [selectedRolId, setSelectedRolId] = useState<number | ''>('');

  const fetchData = useCallback(async () => {
    if (!proyectoId) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar info del proyecto y miembros en paralelo
      const [projRes, miembrosRes] = await Promise.all([
        api.get<ProyectoInfo>(`/proyectos/${proyectoId}`).catch(() => null),
        api.get<ProyectoMiembroItem[]>(`/proyectos/${proyectoId}/miembros`),
      ]);

      if (projRes) {
        setProyecto(projRes.data);
      }
      setMiembros(miembrosRes.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'No se pudo cargar el equipo del proyecto.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cargar usuarios y roles al abrir el modal con prevención de fuga de roles
  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setModalError(null);
    setModalLoading(true);

    try {
      const [uRes, rRes] = await Promise.all([
        api.get<UsuarioOption[]>('/usuarios'),
        api.get<RolOption[]>('/roles'),
      ]);

      // Filtrar usuarios activos que NO sean ya miembros
      const existingUserIds = new Set(miembros.map((m) => m.usuarioId));
      const candidates = uRes.data.filter((u) => u.activo && !existingUserIds.has(u.id));

      // ── PREVENCIÓN CRÍTICA DE FUGA DE ROLES: ─────────────────────────
      // Excluir roles de administración global (ADMIN) y el rol creador (PROPIETARIO).
      // Los invitados solo pueden ser asignados como EDITOR o LECTOR.
      const rolesProyectoValidos = rRes.data.filter((r) => {
        const cod = (r.codigo || '').toUpperCase();
        const nom = (r.nombre || '').toUpperCase();
        return (
          !cod.includes('ADMIN') &&
          !nom.includes('ADMIN') &&
          !cod.includes('PROPIETARIO') &&
          !nom.includes('PROPIETARIO')
        );
      });

      setUsuariosDisponibles(candidates);
      setRolesDisponibles(rolesProyectoValidos);

      if (candidates.length > 0) {
        setSelectedUsuarioId(candidates[0].id);
      } else {
        setSelectedUsuarioId('');
      }

      if (rolesProyectoValidos.length > 0) {
        setSelectedRolId(rolesProyectoValidos[0].id);
      } else {
        setSelectedRolId('');
      }
    } catch {
      setModalError('No se pudieron cargar los usuarios o roles disponibles.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleInvitarMiembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsuarioId || selectedRolId === '') {
      setModalError('Debes seleccionar un ingeniero y un rol.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      await api.post(`/proyectos/${proyectoId}/miembros`, {
        usuarioId: selectedUsuarioId,
        rolId: Number(selectedRolId),
      });

      setIsModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { detail?: string } } })?.response?.data;
      setModalError(res?.detail ?? 'Error al invitar al ingeniero al proyecto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpulsarMiembro = async (usuarioId: string, nombreUsuario: string) => {
    if (!window.confirm(`¿Estás seguro de expulsar a "${nombreUsuario}" de este proyecto?`)) {
      return;
    }

    try {
      setDeletingId(usuarioId);
      await api.delete(`/proyectos/${proyectoId}/miembros/${usuarioId}`);
      await fetchData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Error al expulsar al miembro.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMiembros = miembros.filter(
    (m) =>
      m.nombreUsuario.toLowerCase().includes(search.toLowerCase()) ||
      m.correoUsuario.toLowerCase().includes(search.toLowerCase()) ||
      m.codigoRol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb & Encabezado ─────────────────────────────────── */}
      <div className="space-y-2">
        <Link
          to="/dashboard/proyectos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Proyectos</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-indigo-400" />
              <span>Equipo del Proyecto</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 flex items-center gap-2 flex-wrap">
              <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
              <span>Proyecto:</span>
              <span className="text-white font-semibold">
                {proyecto ? proyecto.nombre : proyectoId?.substring(0, 8)}
              </span>
              {proyecto && (
                <span className="text-xs font-mono text-slate-500">({proyecto.paqueteBase})</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-all flex items-center justify-center cursor-pointer shadow-sm"
              title="Refrescar miembros"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              id="btn-invitar-ingeniero"
              onClick={handleOpenModal}
              className="px-4 py-2.5 bg-white text-slate-950 hover:bg-slate-200 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invitar Ingeniero</span>
            </button>
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
          placeholder="Buscar miembros por nombre, correo o rol..."
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
            onClick={fetchData}
            className="underline hover:text-white transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Tabla de Miembros (Estilo Cristal Oscuro) ───────────────── */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-5">Ingeniero</th>
                <th className="py-3.5 px-5">Correo Electrónico</th>
                <th className="py-3.5 px-5">Rol Asignado</th>
                <th className="py-3.5 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Cargando colaboradores del equipo...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMiembros.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-300">No hay miembros en este proyecto</p>
                      <p className="text-xs text-slate-500">
                        {search
                          ? 'No hay miembros que coincidan con el término de búsqueda.'
                          : 'Haz clic en "Invitar Ingeniero" para agregar colaboradores al equipo.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMiembros.map((m) => (
                  <tr key={m.usuarioId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                          style={{ backgroundColor: m.colorCursorUsuario || '#6366f1' }}
                        >
                          {m.nombreUsuario.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{m.nombreUsuario}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {m.usuarioId.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-slate-300 font-mono text-xs">
                      {m.correoUsuario}
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-200 text-xs font-medium">
                        <Shield className="w-3 h-3 text-slate-400" />
                        <span className="font-mono text-[11px] font-semibold">{m.codigoRol}</span>
                        {m.nombreRol && (
                          <span className="text-slate-400 font-normal text-[11px]">
                            ({m.nombreRol})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleExpulsarMiembro(m.usuarioId, m.nombreUsuario)}
                        disabled={deletingId === m.usuarioId}
                        className="text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg border border-transparent hover:border-rose-500/20 transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Expulsar del proyecto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{deletingId === m.usuarioId ? 'Expulsando...' : 'Expulsar'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Invitar Ingeniero (Sin Fuga de Roles) ─────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/80 relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Invitar Ingeniero
                  </h3>
                  <p className="text-xs text-slate-400">
                    Asigna un rol de proyecto a un colaborador
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

            {modalError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalLoading ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Cargando catálogo de ingenieros y roles...</span>
              </div>
            ) : usuariosDisponibles.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <UserCheck className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="font-semibold text-white text-sm">No hay ingenieros disponibles</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Todos los ingenieros activos ya forman parte de este proyecto o no hay usuarios registrados.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvitarMiembro} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Seleccionar Ingeniero
                  </label>
                  <div className="relative">
                    <select
                      value={selectedUsuarioId}
                      onChange={(e) => setSelectedUsuarioId(e.target.value)}
                      required
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 pr-9 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                    >
                      {usuariosDisponibles.map((u) => (
                        <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                          {u.nombreCompleto} ({u.correo})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Rol en el Proyecto
                  </label>
                  <div className="relative">
                    <select
                      value={selectedRolId}
                      onChange={(e) => setSelectedRolId(Number(e.target.value))}
                      required
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 pr-9 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer font-mono"
                    >
                      {rolesDisponibles.map((r) => (
                        <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                          {r.codigo} - {r.nombre}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">

                  </p>
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
                    id="btn-confirmar-invitar"
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-white text-slate-950 hover:bg-slate-200 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>{submitting ? 'Invitando...' : 'Invitar al Proyecto'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProyectoMiembrosPage;
