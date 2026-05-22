import { Handle, Position } from '@xyflow/react';

interface InfraNodeData {
  label: string;
  entityType: string;
  id: string;
  color: string;
}

interface InfraNodeProps {
  data: InfraNodeData;
  selected: boolean;
}

export function InfraNode({ data, selected }: InfraNodeProps) {
  const borderColor = selected ? '#fbbf24' : data.color;
  const shadowClass = selected ? 'shadow-lg shadow-amber-500' : 'shadow-md';

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 bg-slate-900 text-white font-semibold text-sm whitespace-nowrap ${shadowClass}`}
      style={{ borderColor }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-xs text-slate-400 mb-1">{data.entityType}</div>
      <div>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
