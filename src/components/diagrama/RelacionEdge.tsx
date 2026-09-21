import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  EdgeProps,
  useStore,
} from 'reactflow';

export type TipoRelacionUml = 'ASOCIACION' | 'HERENCIA' | 'AGREGACION' | 'COMPOSICION' | 'DEPENDENCIA' | 'CLASE_ASOCIACION';

export interface RelacionEdgeData {
  tipoRelacion?: TipoRelacionUml;
  multiplicidadOrigen?: string;
  multiplicidadDestino?: string;
  nombre?: string;
  edgeBaseId?: string;
  nombreBase?: string;
}

const RelacionEdge: React.FC<EdgeProps<RelacionEdgeData>> = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
  selected,
}) => {
  const tipoRelacion: TipoRelacionUml = data?.tipoRelacion || 'ASOCIACION';
  const multiplicidadOrigen = data?.multiplicidadOrigen || '';
  const multiplicidadDestino = data?.multiplicidadDestino || '';
  const nombre = data?.nombre || '';

  // ── Selectores granulares y reactivos: se re-renderizan solos cuando el store carga ──
  // Nodos origen/destino de esta propia arista
  const sourceNode = useStore((state: any) =>
    (state.nodes ?? (state.nodeInternals ? Array.from(state.nodeInternals.values()) : []))
      .find((n: any) => n.id === source) ?? null
  );
  const targetNode = useStore((state: any) =>
    (state.nodes ?? (state.nodeInternals ? Array.from(state.nodeInternals.values()) : []))
      .find((n: any) => n.id === target) ?? null
  );

  // Selector reactivo de la arista base (CLASE_ASOCIACION): null si aún no ha cargado
  const baseEdge = useStore((state: any) =>
    (tipoRelacion === 'CLASE_ASOCIACION' && data?.edgeBaseId)
      ? (state.edges ?? []).find((e: any) => e.id === data.edgeBaseId) ?? null
      : null
  );

  // Nodos de la arista base: se resuelven automáticamente cuando baseEdge exista
  const baseSourceNode = useStore((state: any) =>
    baseEdge
      ? (state.nodes ?? (state.nodeInternals ? Array.from(state.nodeInternals.values()) : []))
          .find((n: any) => n.id === baseEdge.source) ?? null
      : null
  );
  const baseTargetNode = useStore((state: any) =>
    baseEdge
      ? (state.nodes ?? (state.nodeInternals ? Array.from(state.nodeInternals.values()) : []))
          .find((n: any) => n.id === baseEdge.target) ?? null
      : null
  );

  // 1. Calcular coordenadas desde el centro geométrico de cada nodo
  //    (el Handle fuente está en la esquina por usabilidad, ignoramos esa posición)
  let finalSourceX = sourceX;
  let finalSourceY = sourceY;
  let finalTargetX = targetX;
  let finalTargetY = targetY;

  if (sourceNode) {
    const wSource = sourceNode.width ?? (sourceNode as any).measured?.width ?? 250;
    const hSource = sourceNode.height ?? (sourceNode as any).measured?.height ?? 150;
    finalSourceX = sourceNode.position.x + wSource / 2;
    finalSourceY = sourceNode.position.y + hSource / 2;
  }

  if (targetNode) {
    const wTarget = targetNode.width ?? (targetNode as any).measured?.width ?? 250;
    const hTarget = targetNode.height ?? (targetNode as any).measured?.height ?? 150;
    finalTargetX = targetNode.position.x + wTarget / 2;
    finalTargetY = targetNode.position.y + hTarget / 2;
  }

  // 2. Lógica especial para CLASE_ASOCIACION: apuntar al punto medio de la arista base.
  //    Gracias a los selectores reactivos, si el store aún no había cargado baseEdge,
  //    este bloque se ejecutará correctamente en el re-render siguiente.
  if (tipoRelacion === 'CLASE_ASOCIACION' && baseEdge && baseSourceNode && baseTargetNode) {
    const wSource = baseSourceNode.width ?? (baseSourceNode as any).measured?.width ?? 250;
    const hSource = baseSourceNode.height ?? (baseSourceNode as any).measured?.height ?? 150;
    const wTarget = baseTargetNode.width ?? (baseTargetNode as any).measured?.width ?? 250;
    const hTarget = baseTargetNode.height ?? (baseTargetNode as any).measured?.height ?? 150;

    const bsX = baseSourceNode.position.x + wSource / 2;
    const bsY = baseSourceNode.position.y + hSource / 2;
    const btX = baseTargetNode.position.x + wTarget / 2;
    const btY = baseTargetNode.position.y + hTarget / 2;
    finalTargetX = (bsX + btX) / 2;
    finalTargetY = (bsY + btY) / 2;
  }

  // 3. Trazar la recta exacta usando las coordenadas corregidas
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: finalSourceX,
    sourceY: finalSourceY,
    targetX: finalTargetX,
    targetY: finalTargetY,
  });

  // Color del trazo y de los marcadores UML
  const strokeColor = selected ? '#a5b4fc' : '#818cf8';
  const strokeWidth = selected ? 2.5 : 2;

  // IDs únicos para los marcadores SVG por cada arista
  const markerId = `marker-${tipoRelacion.toLowerCase()}-${id}`;

  // Sin puntas de flecha por defecto si es 'ASOCIACION', 'CLASE_ASOCIACION' o no está definido
  const hasMarker = tipoRelacion !== 'ASOCIACION' && tipoRelacion !== 'CLASE_ASOCIACION';
  const markerEnd = hasMarker ? `url(#${markerId})` : undefined;

  // 4. Posiciones de etiquetas de multiplicidad al 25% y 75% sobre la línea corregida
  const sourceLabelX = finalSourceX + (finalTargetX - finalSourceX) * 0.25;
  const sourceLabelY = finalSourceY + (finalTargetY - finalSourceY) * 0.25;

  const targetLabelX = finalSourceX + (finalTargetX - finalSourceX) * 0.75;
  const targetLabelY = finalSourceY + (finalTargetY - finalSourceY) * 0.75;

  return (
    <>
      <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: 0, height: 0 }}>
        <defs>
          {/* HERENCIA: Triángulo cerrado con fondo oscuro/vacío y borde del color de la relación */}
          {tipoRelacion === 'HERENCIA' && (
            <marker
              id={markerId}
              viewBox="0 0 14 14"
              refX="13"
              refY="7"
              markerWidth="14"
              markerHeight="14"
              orient="auto-start-reverse"
            >
              <polygon
                points="1,1 13,7 1,13"
                fill="#090d16"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </marker>
          )}

          {/* DEPENDENCIA: Flecha abierta para líneas punteadas */}
          {tipoRelacion === 'DEPENDENCIA' && (
            <marker
              id={markerId}
              viewBox="0 0 12 12"
              refX="11"
              refY="6"
              markerWidth="12"
              markerHeight="12"
              orient="auto-start-reverse"
            >
              <polyline
                points="1,1 11,6 1,11"
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          )}

          {/* AGREGACIÓN: Diamante hueco/vacío con fondo oscuro */}
          {tipoRelacion === 'AGREGACION' && (
            <marker
              id={markerId}
              viewBox="0 0 16 12"
              refX="15"
              refY="6"
              markerWidth="16"
              markerHeight="12"
              orient="auto-start-reverse"
            >
              <polygon
                points="1,6 8,1 15,6 8,11"
                fill="#090d16"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </marker>
          )}

          {/* COMPOSICIÓN: Diamante relleno sólido */}
          {tipoRelacion === 'COMPOSICION' && (
            <marker
              id={markerId}
              viewBox="0 0 16 12"
              refX="15"
              refY="6"
              markerWidth="16"
              markerHeight="12"
              orient="auto-start-reverse"
            >
              <polygon
                points="1,6 8,1 15,6 8,11"
                fill={strokeColor}
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </marker>
          )}
        </defs>
      </svg>

      {/* Trazo de la relación con el marcador correspondiente y estilo punteado para dependencia */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: (tipoRelacion === 'DEPENDENCIA' || tipoRelacion === 'CLASE_ASOCIACION') ? '6,4' : undefined,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />

      {/* ── Etiquetas usando EdgeLabelRenderer ──────────────────────── */}
      <EdgeLabelRenderer>
        {/* Nombre de la Relación en el centro exacto al 50% */}
        {Boolean(nombre && nombre.trim() !== '') && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan px-2 py-0.5 rounded-sm bg-slate-900/95 text-slate-200 border border-slate-700 text-[10px] font-mono shadow-md backdrop-blur select-none cursor-pointer hover:border-slate-500 transition-all"
            title={`Relación: ${nombre}`}
          >
            {nombre}
          </div>
        )}

        {/* Multiplicidad Origen: solo renderiza si NO está vacía */}
        {Boolean(multiplicidadOrigen && multiplicidadOrigen.trim() !== '') && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${sourceLabelX}px, ${sourceLabelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan px-1.5 py-0.5 rounded-sm bg-slate-900/90 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold shadow-md backdrop-blur select-none cursor-pointer hover:border-indigo-400 hover:text-white transition-all"
            title="Multiplicidad Origen"
          >
            {multiplicidadOrigen}
          </div>
        )}

        {/* Multiplicidad Destino: solo renderiza si NO está vacía */}
        {Boolean(multiplicidadDestino && multiplicidadDestino.trim() !== '') && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${targetLabelX}px, ${targetLabelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan px-1.5 py-0.5 rounded-sm bg-slate-900/90 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold shadow-md backdrop-blur select-none cursor-pointer hover:border-indigo-400 hover:text-white transition-all"
            title="Multiplicidad Destino"
          >
            {multiplicidadDestino}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(RelacionEdge);

