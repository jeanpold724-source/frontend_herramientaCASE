import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Brain,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Tag,
  MessageSquare,
  Shield,
  HelpCircle,
  Mic,
  MicOff,
} from 'lucide-react';
import api from '../api/api';

interface IntencionCatalogo {
  id: number;
  codigo: string;
  descripcion: string;
  requiereConfirmacion: boolean;
  frases: string[];
}

const EntrenamientoIaPage: React.FC = () => {
  const [intenciones, setIntenciones] = useState<IntencionCatalogo[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Formulario
  const [codigoSeleccionado, setCodigoSeleccionado] = useState<string>('CREAR_CLASE');
  const [nuevaFrase, setNuevaFrase] = useState<string>('');

  // ── Reconocimiento de Voz (Web Speech API) ───────────────────────────
  const [grabandoVoz, setGrabandoVoz] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        setGrabandoVoz(true);
      };

      recognition.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          setNuevaFrase(transcript);
        }
        setGrabandoVoz(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Error en SpeechRecognition:', event.error);
        setGrabandoVoz(false);
      };

      recognition.onend = () => {
        setGrabandoVoz(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleGrabacionVoz = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta SpeechRecognition nativo. Usa Google Chrome o Microsoft Edge.');
      return;
    }

    if (grabandoVoz) {
      recognitionRef.current.stop();
      setGrabandoVoz(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Error al iniciar SpeechRecognition:', err);
      }
    }
  };

  const cargarIntenciones = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await api.get<IntencionCatalogo[]>('/ia/intenciones');
      setIntenciones(res.data);
      if (res.data.length > 0 && !codigoSeleccionado) {
        setCodigoSeleccionado(res.data[0].codigo);
      }
    } catch (err: unknown) {
      console.error('Error al cargar catálogo de intenciones:', err);
      setError('No se pudo cargar el catálogo de intenciones desde el backend.');
    } finally {
      setCargando(false);
    }
  }, [codigoSeleccionado]);

  useEffect(() => {
    cargarIntenciones();
  }, [cargarIntenciones]);

  const handleAgregarFrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFrase.trim() || !codigoSeleccionado) return;

    setGuardando(true);
    setError(null);
    setMensajeExito(null);

    try {
      await api.post('/ia/entrenamiento', {
        codigoIntencion: codigoSeleccionado,
        frase: nuevaFrase.trim(),
      });

      setMensajeExito(`¡Frase añadida con éxito a la intención "${codigoSeleccionado}"!`);
      setNuevaFrase('');
      await cargarIntenciones();

      setTimeout(() => {
        setMensajeExito(null);
      }, 4000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })
          ?.response?.data?.detail ||
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        'Error al guardar la frase de entrenamiento.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const totalFrases = intenciones.reduce((acc, curr) => acc + (curr.frases?.length || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Entrenamiento de IA Local
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              Motor NLP
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            Gestiona el catálogo cerrado de intenciones y entrena frases para el modelado UML por voz y chat.
          </p>
        </div>

        <button
          onClick={cargarIntenciones}
          disabled={cargando}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          <span>Actualizar Catálogo</span>
        </button>
      </div>

      {/* ── Banners Notificaciones ───────────────────────────────────── */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/80 border border-red-500/40 rounded-2xl text-red-200 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Métricas Rápidas ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Brain className="w-4 h-4 text-indigo-400" />
            <span>Intenciones Activas</span>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{intenciones.length}</p>
        </div>

        <div className="p-4 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Frases en el Corpus</span>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">{totalFrases}</p>
        </div>

        <div className="p-4 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Control de Acceso</span>
          </div>
          <p className="text-xs font-semibold text-slate-300 mt-1">Solo Administradores</p>
        </div>
      </div>

      {/* ── Formulario de Entrenamiento ──────────────────────────────── */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>Agregar Frase de Entrenamiento al Corpus</span>
        </h2>

        <form onSubmit={handleAgregarFrase} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Intención a Entrenar
              </label>
              <select
                value={codigoSeleccionado}
                onChange={(e) => setCodigoSeleccionado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                {intenciones.map((i) => (
                  <option key={i.codigo} value={i.codigo}>
                    {i.codigo} ({i.descripcion})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Frase de Voz o Texto Ejemplo
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleGrabacionVoz}
                  title={grabandoVoz ? 'Detener dictado por voz' : 'Dictar frase por voz'}
                  className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    grabandoVoz
                      ? 'bg-rose-600/20 text-rose-400 border-rose-500/50 animate-pulse'
                      : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                  }`}
                >
                  {grabandoVoz ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input
                  type="text"
                  placeholder="ej. créame una clase Factura, conectar Cliente con Pedido..."
                  value={nuevaFrase}
                  onChange={(e) => setNuevaFrase(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
                <button
                  type="submit"
                  disabled={guardando || !nuevaFrase.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{guardando ? 'Entrenando...' : 'Entrenar'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── Catálogo de Intenciones y Corpus Actual ─────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-400" />
          <span>Catálogo de Intenciones y Muestras de Lenguaje Natural</span>
        </h2>

        {cargando ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            <span>Cargando intenciones de IA...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {intenciones.map((intencion) => (
              <div
                key={intencion.id}
                className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-white/20 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {intencion.codigo}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {intencion.frases?.length || 0} frases
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                    {intencion.descripcion}
                  </p>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Ejemplos reconocidos:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {(intencion.frases || []).map((frase, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-slate-950/80 border border-white/5 rounded-lg text-[11px] text-slate-300 font-mono"
                        >
                          "{frase}"
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    Requiere confirmación: {intencion.requiereConfirmacion ? 'Sí' : 'No'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntrenamientoIaPage;
