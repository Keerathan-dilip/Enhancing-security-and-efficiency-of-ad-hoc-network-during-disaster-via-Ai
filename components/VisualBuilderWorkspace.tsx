import React, { useState, useCallback, useRef } from 'react';
import { Node, Connection, NetworkComponentType, NetworkTopology } from '../types';
import NetworkCanvas from './NetworkCanvas';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';
import ReportDashboard from './ReportDashboard';
import { networkAnalysisService } from '../services/networkAnalysisService';
import { geminiService } from '../services/geminiService';

const WEAK_NODE_EFFICIENCY_THRESHOLD = 85;

const FormattedDescription: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(/(\*\*.*?\*\*)/g).filter(part => part.length > 0);
  
    return (
      <p className="text-sm text-gray-300 whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={index} className="font-bold text-cyan-400">
                {part.substring(2, part.length - 2)}
              </strong>
            );
          }
          return part;
        })}
      </p>
    );
};

const VisualBuilderWorkspace: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<{ topology: string; description: string } | null>(null);
  const [simulationParams, setSimulationParams] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const toggleConnectionMode = () => {
    setIsConnectionMode(prev => !prev);
    setSelectedNodeId(null); // Deselect nodes when entering/exiting mode
  };

  const addNode = (type: NetworkComponentType, x: number, y: number) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type,
      x,
      y,
      ipAddress: `192.168.1.${nodes.length + 1}`,
      energyEfficiency: Math.round(80 + Math.random() * 20),
      energySpent: Math.round(Math.random() * 10),
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const generateNetwork = useCallback((count: number, topology: NetworkTopology) => {
    if (count <= 0) return;
    if (count > 450) {
      alert('The maximum number of nodes is 450.');
      return;
    }

    let newNodes: Node[] = [];
    let newConnections: Connection[] = [];
    const canvasEl = canvasRef.current;
    const padding = 40;
    const canvasWidth = canvasEl ? canvasEl.clientWidth - padding : 800;
    const canvasHeight = canvasEl ? canvasEl.clientHeight - padding : 600;

    const createNode = (i: number, x: number, y: number): Node => ({
        id: `node-${Date.now()}-${i}`,
        type: NetworkComponentType.NODE,
        x,
        y,
        ipAddress: `192.168.1.${i + 1}`,
        energyEfficiency: Math.round(80 + Math.random() * 20),
        energySpent: Math.round(Math.random() * 10),
    });

    if (topology === 'random') {
      for (let i = 0; i < count; i++) {
        newNodes.push(createNode(i, Math.random() * canvasWidth + padding / 2, Math.random() * canvasHeight + padding / 2));
      }
    } else if (topology === 'grid') {
        const cols = Math.ceil(Math.sqrt(count * (canvasWidth / canvasHeight)));
        const rows = Math.ceil(count / cols);
        const xSpacing = canvasWidth / (cols + 1);
        const ySpacing = canvasHeight / (rows + 1);

        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            newNodes.push(createNode(i, (col + 1) * xSpacing, (row + 1) * ySpacing));
        }
    } else if (topology === 'cluster') {
        const numClusters = Math.max(2, Math.ceil(count / 50));
        const nodesPerCluster = Math.ceil(count / numClusters);
        
        for (let c = 0; c < numClusters; c++) {
            const clusterCenterX = (Math.random() * 0.6 + 0.2) * canvasWidth;
            const clusterCenterY = (Math.random() * 0.6 + 0.2) * canvasHeight;
            const clusterRadius = Math.min(canvasWidth, canvasHeight) / (numClusters * 1.5);

            for (let i = 0; i < nodesPerCluster && (c * nodesPerCluster + i) < count; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * clusterRadius;
                const nodeIndex = c * nodesPerCluster + i;
                newNodes.push(createNode(nodeIndex, clusterCenterX + Math.cos(angle) * radius, clusterCenterY + Math.sin(angle) * radius));
            }
        }
    } else if (topology === 'ring') {
        const centerX = canvasWidth / 2 + padding / 2;
        const centerY = canvasHeight / 2 + padding / 2;
        const radius = Math.min(canvasWidth, canvasHeight) / 2 - padding;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 2 * Math.PI;
            newNodes.push(createNode(i, centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)));
        }
        for (let i = 0; i < count; i++) {
            const fromNodeId = newNodes[i].id;
            const toNodeId = newNodes[(i + 1) % count].id;
            newConnections.push({ id: `${fromNodeId}-${toNodeId}-${Date.now()}`, from: fromNodeId, to: toNodeId });
        }
    } else if (topology === 'bus') {
        const yPos = canvasHeight / 2 + padding / 2;
        const xSpacing = canvasWidth / (count + 1);

        for (let i = 0; i < count; i++) {
            newNodes.push(createNode(i, (i + 1) * xSpacing + padding / 2, yPos));
        }
        for (let i = 0; i < count - 1; i++) {
            const fromNodeId = newNodes[i].id;
            const toNodeId = newNodes[i + 1].id;
            newConnections.push({ id: `${fromNodeId}-${toNodeId}-${Date.now()}`, from: fromNodeId, to: toNodeId });
        }
    } else if (topology === 'mesh') {
        for (let i = 0; i < count; i++) {
            newNodes.push(createNode(i, Math.random() * canvasWidth + padding / 2, Math.random() * canvasHeight + padding / 2));
        }
        
        const K_NEAREST = Math.min(3, count - 1);
        const connectedPairs = new Set<string>();

        if (K_NEAREST > 0) {
            for (let i = 0; i < newNodes.length; i++) {
                const sourceNode = newNodes[i];
                const distances = newNodes
                    .map((targetNode) => {
                        if (sourceNode.id === targetNode.id) return null;
                        const dist = Math.sqrt(Math.pow(sourceNode.x - targetNode.x, 2) + Math.pow(sourceNode.y - targetNode.y, 2));
                        return { id: targetNode.id, dist };
                    })
                    .filter((item): item is { id: string; dist: number } => item !== null)
                    .sort((a, b) => a.dist - b.dist);

                for (let k = 0; k < K_NEAREST; k++) {
                    const targetNodeId = distances[k].id;
                    const pairKey1 = `${sourceNode.id}-${targetNodeId}`;
                    const pairKey2 = `${targetNodeId}-${sourceNode.id}`;

                    if (!connectedPairs.has(pairKey1) && !connectedPairs.has(pairKey2)) {
                        newConnections.push({ id: `${pairKey1}-${Date.now()}`, from: sourceNode.id, to: targetNodeId });
                        connectedPairs.add(pairKey1);
                    }
                }
            }
        }
    }
    
    setNodes(newNodes);
    setConnections(newConnections);
    setSelectedNodeId(null);
    setAnalysisResult(null);
    setSimulationParams(null);
    setIsConnectionMode(false);
  }, []);

  const updateNode = useCallback((updatedNode: Node) => {
    setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
  }, []);

  const updateNodeIp = useCallback((nodeId: string, ipAddress: string) => {
    setNodes(prev => prev.map(n => (n.id === nodeId ? { ...n, ipAddress } : n)));
  }, []);

  const handleAutoConnect = useCallback((k: number) => {
    if (nodes.length < 2 || k <= 0) return;

    const newConnections: Connection[] = [];
    const connectedPairs = new Set<string>();
    const maxNeighbors = Math.min(k, nodes.length - 1);

    for (let i = 0; i < nodes.length; i++) {
        const sourceNode = nodes[i];
        
        const distances = nodes
            .map(targetNode => {
                if (sourceNode.id === targetNode.id) return null;
                const dist = Math.sqrt(Math.pow(sourceNode.x - targetNode.x, 2) + Math.pow(sourceNode.y - targetNode.y, 2));
                return { id: targetNode.id, dist };
            })
            .filter((item): item is { id: string; dist: number } => item !== null)
            .sort((a, b) => a.dist - b.dist);

        for (let j = 0; j < maxNeighbors; j++) {
            const targetNodeId = distances[j].id;

            const pair = [sourceNode.id, targetNodeId].sort();
            const pairKey = `${pair[0]}-${pair[1]}`;

            if (!connectedPairs.has(pairKey)) {
                newConnections.push({
                    id: `${pairKey}-${Date.now()}`,
                    from: sourceNode.id,
                    to: targetNodeId
                });
                connectedPairs.add(pairKey);
            }
        }
    }
    setConnections(newConnections);
    setAnalysisResult(null);
    setSimulationParams(null);
  }, [nodes]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setSimulationParams(null);
    setIsConnectionMode(false);
    try {
      const topology = networkAnalysisService.identifyTopology(nodes, connections);
      const description = await geminiService.getTopologyDescription(topology);
      setAnalysisResult({ topology, description });

      const params = networkAnalysisService.simulatePerformance(topology, nodes, connections);
      setSimulationParams(params);
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisResult({ topology: 'Error', description: 'Failed to analyze network. Please check console.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReconstruct = useCallback(async () => {
    const weakNodeIds = nodes
      .filter(n => n.energyEfficiency < WEAK_NODE_EFFICIENCY_THRESHOLD)
      .map(n => n.id);

    if (weakNodeIds.length === 0) return;

    const newNodes = nodes.filter(n => !weakNodeIds.includes(n.id));
    const newConnections = connections.filter(c => !weakNodeIds.includes(c.from) && !weakNodeIds.includes(c.to));
    
    setNodes(newNodes);
    setConnections(newConnections);
    setSelectedNodeId(null);
    
    alert(`Removed ${weakNodeIds.length} weaker node(s). The network report will now be updated.`);
    
    if (newNodes.length >= 2) {
      try {
        const topology = networkAnalysisService.identifyTopology(newNodes, newConnections);
        const description = await geminiService.getTopologyDescription(topology);
        setAnalysisResult({ topology, description });

        const params = networkAnalysisService.simulatePerformance(topology, newNodes, newConnections);
        setSimulationParams(params);
      } catch (error) {
        console.error("Re-analysis failed after reconstruction:", error);
        setAnalysisResult({ topology: 'Error', description: 'Failed to re-analyze network.' });
      }
    } else {
        setAnalysisResult(null);
        setSimulationParams(null);
    }
  }, [nodes, connections]);
  
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const weakNodes = nodes.filter(n => n.energyEfficiency < WEAK_NODE_EFFICIENCY_THRESHOLD);

  return (
    <div className="h-full flex flex-col gap-4 animate-fadeIn">
      <div className="flex-grow flex flex-col lg:flex-row gap-4">
        <div className="w-full lg:w-1/4 xl:w-1/5 flex flex-col gap-4">
            <Toolbar 
                onAnalyze={handleAnalyze} 
                isAnalyzing={isAnalyzing} 
                nodeCount={nodes.length}
                onGenerateNetwork={generateNetwork}
                isConnectionMode={isConnectionMode}
                onToggleConnectionMode={toggleConnectionMode}
                onAutoConnect={handleAutoConnect}
            />
            {selectedNode && !isConnectionMode && <PropertiesPanel node={selectedNode} onUpdate={updateNode} />}
            {analysisResult && (
                <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 flex-grow">
                    <h3 className="text-lg font-bold text-cyan-300 mb-2">Topology Analysis: <strong className="text-white">{analysisResult.topology}</strong></h3>
                    <FormattedDescription text={analysisResult.description} />
                </div>
            )}
        </div>
        <div className="w-full lg:w-3/4 xl:w-4/5">
            <NetworkCanvas
                ref={canvasRef}
                nodes={nodes}
                setNodes={setNodes}
                connections={connections}
                setConnections={setConnections}
                selectedNodeId={selectedNodeId}
                setSelectedNodeId={setSelectedNodeId}
                onAddComponent={addNode}
                isConnectionMode={isConnectionMode}
            />
        </div>
      </div>
       {simulationParams && (
        <div className="mt-4">
            <ReportDashboard
              simulationData={simulationParams}
              nodes={nodes}
              weakNodes={weakNodes}
              onReconstruct={handleReconstruct}
              onUpdateNodeIp={updateNodeIp}
            />
        </div>
        )}
    </div>
  );
};

export default VisualBuilderWorkspace;