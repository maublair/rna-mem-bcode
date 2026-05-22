import { InfraGraph } from '../../types/infrastructure';

interface GraphViewProps {
  graph?: InfraGraph;
  isLoading: boolean;
}

export function GraphView({ graph, isLoading }: GraphViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading graph...</div>
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">No infrastructure data</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Infrastructure Graph</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-bold text-slate-400 mb-2">Nodes ({graph.nodes.length})</p>
            <div className="space-y-1">
              {graph.nodes.map((node) => (
                <div key={node.id} className="text-xs text-slate-300 p-2 bg-slate-800 rounded">
                  <span className="font-mono">{node.name}</span>
                  <span className="text-slate-500 ml-2">({node.entityType})</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 mb-2">Relationships ({graph.edges.length})</p>
            <div className="space-y-1">
              {graph.edges.map((edge) => (
                <div key={edge.id} className="text-xs text-slate-300 p-2 bg-slate-800 rounded">
                  <div className="font-mono truncate">{edge.source}</div>
                  <div className="text-center text-slate-500 text-[10px]">{edge.type}</div>
                  <div className="font-mono truncate">{edge.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Interactive graph visualization coming soon (React Flow + dagre layout)
        </p>
      </div>
    </div>
  );
}
