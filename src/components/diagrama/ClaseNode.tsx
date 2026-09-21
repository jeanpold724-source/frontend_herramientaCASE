import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { SquareMenu, Code } from 'lucide-react';

export interface AtributoUml {
  id: string;
  visibilidad: string; // '+', '-', '#'
  nombre: string;
  tipoDato: string;
}

export interface MetodoUml {
  id: string;
  visibilidad: string; // '+', '-', '#'
  nombre: string;
  tipoRetorno: string;
}

export interface ClaseNodeData {
  nombre: string;
  atributos: AtributoUml[];
  metodos: MetodoUml[];
  esInterface?: boolean;
}

const getVisibilidadColor = (vis: string) => {
  switch (vis) {
    case '+':
      return 'text-emerald-400 font-bold';
    case '-':
      return 'text-rose-400 font-bold';
    case '#':
      return 'text-amber-400 font-bold';
    default:
      return 'text-slate-400';
  }
};

const ClaseNode: React.FC<NodeProps<ClaseNodeData>> = ({ data, selected }) => {
  const atributos: AtributoUml[] = Array.isArray(data.atributos) ? data.atributos : [];
  const metodos: MetodoUml[] = Array.isArray(data.metodos) ? data.metodos : [];
  const esInterface = !!data.esInterface;

  return (
    <div
      style={{ position: 'relative' }}
      className={`relative bg-[#0b0f19] border rounded-sm shadow-xl min-w-[230px] max-w-[340px] text-xs font-mono transition-all duration-100 ${selected
          ? 'border-sky-400 ring-1 ring-sky-400/50 shadow-sky-950/40'
          : 'border-slate-700 hover:border-slate-500 shadow-black/80'
        }`}
    >
      {/* ── Handle de Recepción (Target - Invisible al centro) ── */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: 0, position: 'absolute', width: '1px', height: '1px', zIndex: -1 }}
      />

      {/* ── Handle de Creación (Source - Visible arriba a la izquierda) ── */}
      <Handle
        type="source"
        position={Position.Left}
        title="Arrastra para conectar con otra clase"
        style={{
          top: '16px',
          left: '-6px',
          width: '12px',
          height: '12px',
          background: '#818cf8',
          border: '2px solid #0f172a',
          borderRadius: '50%',
          cursor: 'crosshair',
          zIndex: 20,
        }}
      />

      {/* ── Encabezado Sobrio Enterprise Architect (Drag Handle) ──────── */}
      <div className="relative z-20 bg-[#131b2e] px-3 py-2 border-b border-slate-700 text-center select-none cursor-move">
        <span className="text-[10px] text-slate-400 font-mono tracking-wider block leading-tight">
          {esInterface ? '«interface»' : '«class»'}
        </span>
        <span className="text-slate-100 font-bold text-xs tracking-wide block truncate">
          {data.nombre || 'ClaseSinNombre'}
        </span>
      </div>

      {/* ── Compartimento de Atributos ───────────────────────────────── */}
      <div className="p-2.5 border-b border-slate-800 bg-[#0b0f19] space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold mb-1 select-none">
          <SquareMenu className="w-3 h-3 text-slate-400" />
          <span>Atributos</span>
        </div>

        {atributos.length > 0 ? (
          atributos.map((attr) => {
            const tieneTipo = Boolean(attr.tipoDato && attr.tipoDato.trim() !== '' && attr.tipoDato !== '<none>');
            return (
              <div
                key={attr.id}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors truncate text-[11px] font-mono leading-tight"
                title={`${attr.visibilidad} ${attr.nombre}${tieneTipo ? `: ${attr.tipoDato}` : ''}`}
              >
                <span className={getVisibilidadColor(attr.visibilidad)}>
                  {attr.visibilidad}
                </span>
                <span className="text-slate-200 truncate">{attr.nombre}</span>
                {tieneTipo && <span className="text-slate-400">: {attr.tipoDato}</span>}
              </div>
            );
          })
        ) : (
          <div className="text-[10px] text-slate-600 font-mono italic">Sin atributos</div>
        )}
      </div>

      {/* ── Compartimento de Operaciones ─────────────────────────────── */}
      <div className="p-2.5 bg-[#0b0f19] space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold mb-1 select-none">
          <Code className="w-3.5 h-3.5 text-slate-400" />
          <span>Operaciones</span>
        </div>

        {metodos.length > 0 ? (
          metodos.map((met) => {
            const tieneRetorno = Boolean(met.tipoRetorno && met.tipoRetorno.trim() !== '' && met.tipoRetorno !== '<none>');
            return (
              <div
                key={met.id}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors truncate text-[11px] font-mono leading-tight"
                title={`${met.visibilidad} ${met.nombre}()${tieneRetorno ? `: ${met.tipoRetorno}` : ''}`}
              >
                <span className={getVisibilidadColor(met.visibilidad)}>
                  {met.visibilidad}
                </span>
                <span className="text-slate-200 truncate">{met.nombre}()</span>
                {tieneRetorno && <span className="text-slate-400">: {met.tipoRetorno}</span>}
              </div>
            );
          })
        ) : (
          <div className="text-[10px] text-slate-600 font-mono italic">Sin métodos</div>
        )}
      </div>
    </div>
  );
};

export default memo(ClaseNode);
