import { getStraightPath, EdgeLabelRenderer, EdgeProps } from '@xyflow/react';

export function InfraEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke="#64748b"
        strokeWidth={2}
        fill="none"
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="text-xs font-semibold bg-slate-800 text-slate-200 px-2 py-1 rounded border border-slate-700">
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
