import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export interface RelacionAnchorNodeData {
  nombre?: string;
  label?: string;
}

const RelacionAnchorNode: React.FC<NodeProps<RelacionAnchorNodeData>> = ({ data, selected }) => {
  const nombre = data?.nombre || data?.label || 'Relación';

  return (
    <div className="relative select-none group" style={{ position: 'relative' }}>
      {/* Handles ocultos en el centro */}
      <Handle
        type="target"
        position={Position.Top}
        id="t"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: 0, position: 'absolute', width: '1px', height: '1px', zIndex: -1 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="s"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: 0, position: 'absolute', width: '1px', height: '1px', zIndex: -1 }}
      />

      {/* Renderizado de la etiqueta estilo Enterprise Architect */}
      <div
        className={`px-2 py-0.5 rounded-sm bg-slate-900 border text-[10px] font-mono text-slate-200 shadow-md backdrop-blur select-none cursor-pointer transition-all ${
          selected
            ? 'border-indigo-400 ring-1 ring-indigo-400/50 shadow-indigo-950/40 text-white'
            : 'border-slate-700 hover:border-slate-500'
        }`}
        title={`Relación M:N: ${nombre}`}
      >
        {nombre}
      </div>
    </div>
  );
};

export default memo(RelacionAnchorNode);
