import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Workflow,
  Plus,
  ArrowLeft,
  RefreshCw,
  Search,
  Trash2,
  X,
  AlertCircle,
  FolderKanban,
  Maximize2,
  Layers,
} from 'lucide-react';
import api from '../api/api';

export interface DiagramaItem {
  id: string;
  nombre: string;
  proyectoId: string;
  fechaCreacion?: string;
  version?: number;
}

interface ProyectoInfo {
  id: string;
  nombre: string;
  paqueteBase: string;
}

const DiagramasPage: React.FC = () => {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const navigate = useNavigate();

  const [proyecto, setProyecto] = useState<ProyectoInfo | null>(null);
  const [diagramas, setDiagramas] = useState<DiagramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Field
  const [nombre, setNombre] = useState('');

  const fetchDiagramas = useCallback(async () => {
    if (!proyectoId) return;

    try {
      setLoading(true);
      setError(null);

      const [projRes, diagRes] = await Promise.all([
        api.get<ProyectoInfo>(`/proyectos/${proyectoId}`).catch(() => null),
        api.get<DiagramaItem[]>(`/diagramas/proyecto/${proyectoId}`),
      ]);

      if (projRes) {
        setProyecto(projRes.data);
      }
      setDiagramas(diagRes.data || []);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'No se pudo cargar la lista de diagramas del proyecto.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [proyectoId]);

  useEffect(() => {
    fetchDiagramas();
  }, [fetchDiagramas]);

  const handleCrearDiagrama = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setModalError('El nombre del diagrama es obligatorio.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      await api.post('/diagramas', {
        nombre: nombre.trim(),
        proyectoId,
      });

      setNombre('');
      setIsModalOpen(false);
      await fetchDiagramas();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { detail?: string } } })?.response?.data;
      setModalError(res?.detail ?? 'Error al crear el diagrama.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarDiagrama = async (id: string, nombreD: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el diagrama "${nombreD}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await api.delete(`/diagramas/${id}`);
      await fetchDiagramas();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Error al eliminar el diagrama.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDiagramas = diagramas.filter((d) =>
    d.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-100">
      {/* ── Breadcrumb & Encabezado ─────────────────────────────────── */}
      <div className="space-y-3">
        <Link
          to="/dashboard/proyectos"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Proyectos</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <Workflow className="w-4 h-4" />
              </div>
              <span>Diagramas de Clases UML</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
              <span>Proyecto:</span>
              <span className="text-white font-medium">
                {proyecto ? proyecto.nombre : proyectoId?.substring(0, 8)}
              </span>
              {proyecto && (
                <span className="text-xs font-mono text-slate-500">({proyecto.paqueteBase})</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchDiagramas}
              disabled={loading}
              className="p-2.5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
              title="Refrescar diagramas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              id="btn-nuevo-diagrama"
              onClick={() => {
                setNombre('');
                setModalError(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2.5 bg-white text-slate-950 hover:bg-slate-200 font-medium text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Diagrama</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Barra de Búsqueda ───────────────────────────────────────── */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar diagramas por nombre..."
          className="w-full bg-slate-900/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
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
            onClick={fetchDiagramas}
            className="underline hover:text-rose-200 font-medium cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Grilla de Diagramas (Cards) ─────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-800 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-800/60 rounded w-1/3" />
                </div>
              </div>
              <div className="h-28 bg-slate-950/60 rounded-xl" />
              <div className="h-9 bg-slate-800/40 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredDiagramas.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center shadow-2xl shadow-black/40">
          <div className="w-12 h-12 bg-white/5 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Workflow className="w-6 h-6" />
          </div>
          <h3 className="text-white font-semibold text-base mb-1">
            {search ? 'No se encontraron diagramas' : 'Aún no hay diagramas en este proyecto'}
          </h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-6">
            {search
              ? 'Prueba con otro término de búsqueda.'
              : 'Crea tu primer diagrama de clases UML para modelar la arquitectura del software.'}
          </p>
          {!search && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-white text-slate-950 hover:bg-slate-200 font-medium text-xs sm:text-sm rounded-xl inline-flex items-center gap-2 transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>Crear mi primer diagrama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDiagramas.map((d) => (
            <div
              key={d.id}
              className="bg-slate-900/50 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all duration-200 shadow-xl shadow-black/40 flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                {/* Header de la Tarjeta */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-white/5 text-white border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Workflow className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white group-hover:text-slate-200 transition-colors truncate">
                        {d.nombre}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">
                        {d.id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-300 border border-white/10">
                      <Layers className="w-3 h-3" />
                      UML
                    </span>
                    <button
                      onClick={() => handleEliminarDiagrama(d.id, d.nombre)}
                      disabled={deletingId === d.id}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Eliminar diagrama"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Área de Vista Previa (Simulación UML Minimalista) */}
                <div
                  onClick={() => navigate(`/editor/${d.id}`)}
                  className="my-3 h-28 rounded-xl bg-slate-950/60 border border-white/10 relative overflow-hidden flex items-center justify-center cursor-pointer group/canvas bg-[radial-gradient(#ffffff15_1px,transparent_1px)] bg-[size:12px_12px] transition-all hover:border-white/20"
                  title="Clic para abrir el editor UML"
                >
                  {/* Simulación abstracta de nodos UML */}
                  <div className="flex items-center gap-3 select-none pointer-events-none transform scale-90 group-hover/canvas:scale-95 transition-transform duration-200">
                    {/* Nodo 1: Entidad Clase */}
                    <div className="w-24 bg-slate-900/90 border border-white/20 rounded-lg p-2 shadow-lg space-y-1.5 backdrop-blur-sm">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                        <div className="h-1.5 w-12 bg-white/40 rounded-full" />
                      </div>
                      <div className="border-t border-white/10 pt-1 space-y-1">
                        <div className="h-1 w-16 bg-white/20 rounded-full" />
                        <div className="h-1 w-10 bg-white/20 rounded-full" />
                      </div>
                    </div>

                    {/* Conector / Relación UML */}
                    <div className="w-7 h-[1px] bg-white/30 relative flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rotate-45 border-t border-r border-white/50 bg-slate-900" />
                    </div>

                    {/* Nodo 2: Entidad Relacionada */}
                    <div className="w-24 bg-slate-900/90 border border-white/20 rounded-lg p-2 shadow-lg space-y-1.5 backdrop-blur-sm">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                        <div className="h-1.5 w-14 bg-white/40 rounded-full" />
                      </div>
                      <div className="border-t border-white/10 pt-1 space-y-1">
                        <div className="h-1 w-14 bg-white/20 rounded-full" />
                        <div className="h-1 w-8 bg-white/20 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de acción: Abrir Lienzo Glassmorphism */}
              <div className="pt-2">
                <button
                  onClick={() => navigate(`/editor/${d.id}`)}
                  className="w-full px-3.5 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white text-xs font-medium rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Abrir Lienzo</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Crear Diagrama ─────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white">
                  <Workflow className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nuevo Diagrama UML</h3>
                  <p className="text-xs text-slate-400">Crear lienzo de arquitectura</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
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

            <form onSubmit={handleCrearDiagrama} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre del Diagrama
                </label>
                <div className="relative">
                  <Workflow className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Diagrama de Dominio Principal"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Identifica las entidades y relaciones que diseñarás en este lienzo.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-guardar-diagrama"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-white text-slate-950 hover:bg-slate-200 font-medium text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all duration-150 shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{submitting ? 'Creando...' : 'Crear Diagrama'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagramasPage;

