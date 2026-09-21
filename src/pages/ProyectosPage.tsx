import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  FolderPlus,
  RefreshCw,
  Search,
  Package,
  Layers,
  User,
  Trash2,
  X,
  AlertCircle,
  PlusCircle,
  Users,
  Workflow,
} from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

export interface ProyectoItem {
  id: string;
  propietarioId: string;
  nombrePropietario: string;
  nombre: string;
  paqueteBase: string;
  versionSpringBoot: string;
}

const SPRING_BOOT_VERSIONS = ['3.3.4', '3.3.0', '3.2.5', '3.1.8'];

const ProyectosPage: React.FC = () => {
  const { usuario } = useAuth();
  const [proyectos, setProyectos] = useState<ProyectoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [nombre, setNombre] = useState('');
  const [paqueteBase, setPaqueteBase] = useState('com.empresa.');
  const [versionSpringBoot, setVersionSpringBoot] = useState('3.3.4');

  // ── Carga de Proyectos Propios y Compartidos ────────────────────────
  const fetchProyectos = useCallback(async () => {
    if (!usuario?.id) return;

    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<ProyectoItem[]>(`/proyectos/usuario/${usuario.id}`);
      setProyectos(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'No se pudo cargar la lista de proyectos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [usuario?.id]);

  useEffect(() => {
    fetchProyectos();
  }, [fetchProyectos]);

  const handleCrearProyecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario?.id) {
      setModalError('No se pudo identificar al usuario propietario.');
      return;
    }

    setModalError(null);
    setSubmitting(true);

    try {
      await api.post(
        '/proyectos',
        {
          nombre: nombre.trim(),
          paqueteBase: paqueteBase.trim(),
          versionSpringBoot: versionSpringBoot.trim(),
        },
        {
          params: {
            propietarioId: usuario.id,
          },
        }
      );

      // Reset form
      setNombre('');
      setPaqueteBase('com.empresa.');
      setVersionSpringBoot('3.3.4');
      setIsModalOpen(false);

      // Recargar lista aislada
      await fetchProyectos();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { detail?: string; errores?: Record<string, string> } } })?.response?.data;
      if (res?.errores) {
        const firstError = Object.values(res.errores)[0];
        setModalError(firstError);
      } else {
        setModalError(res?.detail ?? 'Error al crear el proyecto.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarProyecto = async (id: string, nombreP: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el proyecto "${nombreP}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await api.delete(`/proyectos/${id}`);
      await fetchProyectos();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Error al eliminar el proyecto.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProyectos = proyectos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.paqueteBase.toLowerCase().includes(search.toLowerCase()) ||
      (p.nombrePropietario && p.nombrePropietario.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* ── Encabezado & Acciones ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-indigo-400" />
            <span>Proyectos de Software</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Crea y administra proyectos para generación automática de arquitectura en Nexus CASE
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchProyectos}
            disabled={loading}
            className="p-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            title="Refrescar proyectos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-nuevo-proyecto"
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-white text-slate-950 hover:bg-slate-200 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
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
          placeholder="Buscar proyectos por nombre, paquete o propietario..."
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
            onClick={fetchProyectos}
            className="underline hover:text-white transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Grilla de Proyectos (Cards Estilo Linear) ───────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-800/60 rounded w-1/3" />
                </div>
              </div>
              <div className="h-16 bg-slate-800/40 rounded-xl" />
              <div className="h-8 bg-slate-800/60 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredProyectos.length === 0 ? (
        <div className="bg-slate-900/30 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-white/5 border border-white/10 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-3.5">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-white font-semibold text-base mb-1">
            {search ? 'No se encontraron proyectos' : 'No tienes proyectos creados'}
          </h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-5">
            {search
              ? 'Prueba con otro término de búsqueda por nombre o paquete base.'
              : 'Comienza creando tu primer proyecto de arquitectura Spring Boot.'}
          </p>
          {!search && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-white text-slate-950 hover:bg-slate-200 text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Crear mi primer proyecto</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProyectos.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900/50 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all duration-150 shadow-sm flex flex-col justify-between group"
            >
              <div>
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate group-hover:text-slate-200 transition-colors">
                          {p.nombre}
                        </h3>
                        {p.propietarioId !== usuario?.id && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                            Compartido contigo
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {p.id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-white/5 text-slate-300 border border-white/10 flex-shrink-0">
                    <Layers className="w-3 h-3 text-slate-400" />
                    v{p.versionSpringBoot}
                  </span>
                </div>

                {/* Detalles técnicos estructurados */}
                <div className="space-y-2 my-3.5 bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs">
                  <div>
                    <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold block mb-0.5">
                      Paquete Base
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-slate-300 text-xs truncate">
                      <Package className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{p.paqueteBase}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" /> Propietario:
                    </span>
                    <span className="text-slate-300 font-medium truncate max-w-[140px] text-xs">
                      {p.nombrePropietario || 'Ingeniero'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción minimalistas */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/dashboard/proyectos/${p.id}/diagramas`}
                    className="text-xs font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Ver Diagramas del Proyecto"
                  >
                    <Workflow className="w-3.5 h-3.5 text-slate-400" />
                    <span>Diagramas</span>
                  </Link>

                  <Link
                    to={`/dashboard/proyectos/${p.id}/miembros`}
                    className="text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Gestionar Equipo"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Equipo</span>
                  </Link>
                </div>

                <button
                  onClick={() => handleEliminarProyecto(p.id, p.nombre)}
                  disabled={deletingId === p.id}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                  title="Eliminar proyecto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Crear Nuevo Proyecto ───────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/80 relative">
            {/* Header del modal */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Nuevo Proyecto
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configura los parámetros iniciales de tu arquitectura Spring Boot
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
            <form onSubmit={handleCrearProyecto} className="mt-5 space-y-4">
              {/* Nombre del Proyecto */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre del Proyecto
                </label>
                <div className="relative">
                  <FolderKanban className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. SistemaInventario"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  El nombre debe ser único por propietario.
                </p>
              </div>

              {/* Paquete Base Java */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Paquete Base Java (Convención Java)
                </label>
                <div className="relative">
                  <Package className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    pattern="^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$"
                    maxLength={150}
                    value={paqueteBase}
                    onChange={(e) => setPaqueteBase(e.target.value)}
                    placeholder="com.empresa.inventario"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Solo minúsculas separadas por puntos, ej: <code className="font-mono text-slate-300">com.empresa.backend</code>
                </p>
              </div>

              {/* Versión de Spring Boot */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Versión de Spring Boot
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    pattern="^\d+\.\d+\.\d+$"
                    value={versionSpringBoot}
                    onChange={(e) => setVersionSpringBoot(e.target.value)}
                    placeholder="3.3.4"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>

                {/* Versiones recomendadas */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-500">Recomendadas:</span>
                  {SPRING_BOOT_VERSIONS.map((ver) => (
                    <button
                      key={ver}
                      type="button"
                      onClick={() => setVersionSpringBoot(ver)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                        versionSpringBoot === ver
                          ? 'bg-white text-slate-950 border-white font-semibold'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {ver}
                    </button>
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
                  id="btn-guardar-proyecto"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-white text-slate-950 hover:bg-slate-200 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4" />
                  )}
                  <span>{submitting ? 'Creando...' : 'Crear Proyecto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProyectosPage;
