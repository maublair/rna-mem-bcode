import { useMemo, useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { InfraGraph } from '../../types/infrastructure';
import { InfraNode } from './InfraNode';
import { InfraEdge } from './InfraEdge';

interface GraphViewProps {
  graph?: InfraGraph;
  isLoading: boolean;
  onSelectEntity?: (entityType: string, id: string) => void;
}

const nodeTypes = { infra: InfraNode };
const edgeTypes = { infra: InfraEdge };

export function GraphView({ graph, isLoading, onSelectEntity }: GraphViewProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!graph) return { rfNodes: [], rfEdges: [] };

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 200, nodesep: 100 });

    const nodeList: Node[] = graph.nodes.map((node) => {
      const color =
        node.entityType === 'server'
          ? '#4f46e5'
          : node.entityType === 'service'
            ? '#06b6d4'
            : '#10b981';
      return {
        id: `${node.entityType}:${node.id}`,
        data: { label: node.name, entityType: node.entityType, id: node.id, color },
        position: { x: 0, y: 0 },
        type: 'infra',
      } as Node;
    });

    const edgeList: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.type,
      type: 'infra',
    }));

    nodeList.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 150, height: 60 });
    });
    edgeList.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodeList.map((node) => {
      const pos = dagreGraph.node(node.id);
      return { ...node, position: { x: pos.x - 75, y: pos.y - 30 } };
    });

    return { rfNodes: layoutedNodes, rfEdges: edgeList };
  }, [graph]);

  const handleNodeClick = useCallback(
    (_: any, node: Node) => {
      const [type, id] = node.id.split(':');
      onSelectEntity?.(type, id);
    },
    [onSelectEntity]
  );

  useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [rfNodes, rfEdges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950">
        <div className="text-slate-400">Loading graph...</div>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950">
        <div className="text-slate-400">No infrastructure data</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background color="#1e293b" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => (node.data?.color as string) || '#4f46e5'}
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
        />
      </ReactFlow>
    </div>
  );
}
