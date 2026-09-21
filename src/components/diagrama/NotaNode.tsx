import React, { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { StickyNote } from 'lucide-react';

export interface NotaNodeData {
  texto: string;
  colorFondo?: string;
}

const NotaNode: React.FC<NodeProps<NotaNodeData>> = ({ data, selected }) => {
  const colorFondo = data.colorFondo || '#fef08a';
  const texto = data.texto || 'Anotación técnica de arquitectura...';

  return (
    <div
      style={{ backgroundColor: colorFondo }}
      className={`p-3 rounded-sm shadow-md min-w-[190px] max-w-[320px] font-mono text-slate-900 border transition-all duration-100 relative select-none ${
        selected
          ? 'border-indigo-600 ring-2 ring-indigo-500/40 shadow-xl'
          : 'border-black/20 hover:border-black/35 shadow-black/40'
      }`}
    >
      {/* ── Encabezado Sobrio de la Nota ─────────────────────────────── */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-800/80 mb-2 pb-1 border-b border-black/10 uppercase tracking-wider select-none">
        <div className="flex items-center gap-1.5 font-bold">
          <StickyNote className="w-3.5 h-3.5 text-slate-800" />
          <span>Nota Técnica</span>
        </div>
        <div className="w-1.5 h-1.5 rounded-none bg-black/30" />
      </div>

      {/* ── Contenido de la Nota ─────────────────────────────────────── */}
      <div className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-900 select-text">
        {texto}
      </div>
    </div>
  );
};

export default memo(NotaNode);


