import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Connection, NetworkComponentType, NetworkTopology, AnimatedPacket } from '../types';
import NetworkCanvas from './NetworkCanvas';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';
import ConnectionPanel from './ConnectionPanel';
import ReportDashboard from './ReportDashboard';
import { networkAnalysisService } from '../services/networkAnalysisService';
import { geminiService } from '../services/geminiService';
import { pathfindingService } from '../services/pathfindingService';
import AIInsightsPanel from './AIInsightsPanel';

const WEAK_NODE_EFFICIENCY_THRESHOLD = 85;
const PACKET_ANIMATION_DURATION_AI = 4000; // ms
const PACKET_ANIMATION_DURATION_TRADITIONAL = 5500; // ms
const PACKET_SIMULATION_DURATION = 20000; // 20s

interface VisualBuilderWorkspaceProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
}

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

const VisualBuilderWorkspace: React.FC<VisualBuilderWorkspaceProps> = ({ nodes, setNodes, connections, setConnections }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<{ topology: string; description: string } | null>(null);
  const [simulationParams, setSimulationParams] = useState<any | null>(null);
  const [insights, setInsights] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const [isPacketSimulationMode, setIsPacketSimulationMode] = useState(false);
  const [packetSimSourceNode, setPacketSimSourceNode] = useState<string | null>(null);
  const [animatedPackets, setAnimatedPackets] = useState<AnimatedPacket[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setSimulationParams(null);
    setInsights(null);
    setAnimatedPackets([]);
    setSelectedConnectionId(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const deleteSelectedConnection = useCallback(() => {
    if (selectedConnectionId) {
        setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
        setSelectedConnectionId(null);
        clearAnalysis();
    }
  }, [selectedConnectionId, setConnections, clearAnalysis]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.key === 'Delete' || event.key === 'Backspace') && selectedConnectionId) {
            deleteSelectedConnection();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedConnectionId, deleteSelectedConnection]);


  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const animationLoop = useCallback(() => {
    setAnimatedPackets(prevPackets => {
      const now = performance.now();
      const updatedPackets = prevPackets.map(p => {
        const elapsedTime = now - p.startTime;
        const progress = Math.min(elapsedTime / p.duration, 1);
        return { ...p, progress };
      }).filter(p => p.progress < 1); // Remove completed packets

      if (updatedPackets.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animationLoop);
      } else {
        animationFrameRef.current = null;
      }
      return updatedPackets;
    });
  }, []);

  const ensureAnimationLoop = useCallback(() => {
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    }
  }, [animationLoop]);

  const startAnalysisPacketAnimation = (path: string[]) => {
    const startTime = performance.now();
    const newPackets: AnimatedPacket[] = [
      { id: 'packet-ai', path, progress: 0, color: '#22d3ee', startTime, duration: PACKET_ANIMATION_DURATION_AI },
      { id: 'packet-trad', path, progress: 0, color: '#f97316', startTime, duration: PACKET_ANIMATION_DURATION_TRADITIONAL },
    ];
    setAnimatedPackets(prev => [...prev, ...newPackets]);
    ensureAnimationLoop();
  };


  const toggleConnectionMode = () => {
    setIsConnectionMode(prev => {
        const isEntering = !prev;
        if (isEntering) {
            setIsPacketSimulationMode(false);
            setPacketSimSourceNode(null);
        }
        setSelectedNodeId(null);
        setSelectedConnectionId(null);
        return isEntering;
    });
  };

  const togglePacketSimulationMode = () => {
    setIsPacketSimulationMode(prev => {
        const isEntering = !prev;
        if (isEntering) {
            setIsConnectionMode(false);
            setSelectedNodeId(null);
            setSelectedConnectionId(null);
        }
        setPacketSimSourceNode(null);
        return isEntering;
    });
  };

  const handleNodeClickForSimulation = (nodeId: string) => {
    if (!packetSimSourceNode) {
        setPacketSimSourceNode(nodeId);
        return;
    }

    if (packetSimSourceNode === nodeId) return;

    const path = pathfindingService.findShortestPath(packetSimSourceNode, nodeId, nodes, connections);
    if (path) {
        const newPacket: AnimatedPacket = {
            id: `sim-packet-${Date.now()}`,
            path,
            progress: 0,
            color: '#facc15', // Yellow
            startTime: performance.now(),
            duration: PACKET_SIMULATION_DURATION,
        };
        setAnimatedPackets(prev => [...prev, newPacket]);
        ensureAnimationLoop();
    } else {
        alert("No path found between the selected nodes.");
    }
    
    setPacketSimSourceNode(null);
    setIsPacketSimulationMode(false);
  };


  const addNode = (type: NetworkComponentType, x: number, y: number) => {
    const baseNode = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      x,
      y,
      ipAddress: `192.168.1.${nodes.length + 1}`,
    };

    let newNode: Node;

    switch (type) {
      case NetworkComponentType.ROUTER:
        newNode = {
          ...baseNode,
          energyEfficiency: 100, // Assumed to be stable/mains-powered
          energySpent: 25,       // Higher power consumption
          packetForwardingCapacity: 5000,
        };
        break;
      case NetworkComponentType.SWITCH:
        newNode = {
          ...baseNode,
          energyEfficiency: 100,
          energySpent: 10,
          portCount: 16,
        };
        break;
      case NetworkComponentType.BASE_STATION:
        newNode = {
          ...baseNode,
          energyEfficiency: 100,
          energySpent: 50, // Very high power
        };
        break;
      case NetworkComponentType.NODE:
      default:
        newNode = {
          ...baseNode,
          energyEfficiency: Math.round(80 + Math.random() * 20), // Represents battery life
          energySpent: Math.round(Math.random() * 10) + 5,      // Lower consumption
        };
        break;
    }
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
        energySpent: Math.round(Math.random() * 10) + 5,
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
    clearAnalysis();
    setIsConnectionMode(false);
  }, [setNodes, setConnections, clearAnalysis]);

  const updateNode = useCallback((updatedNode: Node) => {
    setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
  }, [setNodes]);

  const updateNodeIp = useCallback((nodeId: string, ipAddress: string) => {
    setNodes(prev => prev.map(n => (n.id === nodeId ? { ...n, ipAddress } : n)));
  }, [setNodes]);

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
    clearAnalysis();
  }, [nodes, setConnections, clearAnalysis]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setIsGeneratingInsights(true);
    clearAnalysis();
    setIsConnectionMode(false);
    setIsPacketSimulationMode(false);
    setPacketSimSourceNode(null);
    try {
      const topology = networkAnalysisService.identifyTopology(nodes, connections);
      
      const descriptionPromise = geminiService.getTopologyDescription(topology);
      const insightsPromise = (async () => {
        const networkData = networkAnalysisService.getNetworkStats(nodes, connections);
        return await geminiService.getNetworkInsights({ ...networkData, topology });
      })();

      const params = networkAnalysisService.simulatePerformance(topology, nodes, connections);
      setSimulationParams(params);

      const description = await descriptionPromise;
      setAnalysisResult({ topology, description });
      
      const generatedInsights = await insightsPromise;
      setInsights(generatedInsights);
      
      const farthestNodes = pathfindingService.findFarthestNodes(nodes);
      if (farthestNodes) {
        const path = pathfindingService.findShortestPath(farthestNodes[0], farthestNodes[1], nodes, connections);
        if (path) {
          startAnalysisPacketAnimation(path);
        }
      }

    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisResult({ topology: 'Error', description: 'Failed to analyze network. Please check console.' });
      setInsights('**Error:** Could not generate network insights.');
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingInsights(false);
    }
  };

  const handleReconstruct = useCallback(async () => {
    const weakNodeIds = nodes
      .filter(n => n.type === NetworkComponentType.NODE && n.energyEfficiency < WEAK_NODE_EFFICIENCY_THRESHOLD)
      .map(n => n.id);

    if (weakNodeIds.length === 0) return;

    const newNodes = nodes.filter(n => !weakNodeIds.includes(n.id));
    const newConnections = connections.filter(c => !weakNodeIds.includes(c.from) && !weakNodeIds.includes(c.to));
    
    setNodes(newNodes);
    setConnections(newConnections);
    setSelectedNodeId(null);
    setInsights(null);
    setAnimatedPackets([]);
    
    alert(`Removed ${weakNodeIds.length} weaker node(s). The network report will now be updated.`);
    
    if (newNodes.length >= 2) {
      setIsGeneratingInsights(true);
      try {
        const topology = networkAnalysisService.identifyTopology(newNodes, newConnections);
        
        const descriptionPromise = geminiService.getTopologyDescription(topology);
        const insightsPromise = (async () => {
            const networkData = networkAnalysisService.getNetworkStats(newNodes, newConnections);
            return await geminiService.getNetworkInsights({ ...networkData, topology });
        })();
        
        setAnalysisResult({ topology, description: "Loading..." });
        const params = networkAnalysisService.simulatePerformance(topology, newNodes, newConnections);
        setSimulationParams(params);

        const description = await descriptionPromise;
        setAnalysisResult({ topology, description });

        const newInsights = await insightsPromise;
        setInsights(newInsights);

      } catch (error) {
        console.error("Re-analysis failed after reconstruction:", error);
        setAnalysisResult({ topology: 'Error', description: 'Failed to re-analyze network.' });
        setInsights('**Error:** Could not regenerate insights after reconstruction.');
      } finally {
        setIsGeneratingInsights(false);
      }
    } else {
        clearAnalysis();
    }
  }, [nodes, connections, setNodes, setConnections, clearAnalysis]);
  
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedConnection = connections.find(c => c.id === selectedConnectionId) || null;
  const weakNodes = nodes.filter(n => n.type === NetworkComponentType.NODE && n.energyEfficiency < WEAK_NODE_EFFICIENCY_THRESHOLD);

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
                isPacketSimulationMode={isPacketSimulationMode}
                onTogglePacketSimulationMode={togglePacketSimulationMode}
                onAutoConnect={handleAutoConnect}
            />
            {selectedNode && !isConnectionMode && !isPacketSimulationMode && <PropertiesPanel node={selectedNode} onUpdate={updateNode} />}
            {selectedConnection && !isConnectionMode && !isPacketSimulationMode && <ConnectionPanel connection={selectedConnection} nodes={nodes} onDelete={deleteSelectedConnection} />}
            {analysisResult && (
                <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4">
                    <h3 className="text-lg font-bold text-cyan-300 mb-2">Topology Analysis: <strong className="text-white">{analysisResult.topology}</strong></h3>
                    <FormattedDescription text={analysisResult.description} />
                </div>
            )}
            {(isAnalyzing || insights) && (
              <AIInsightsPanel isLoading={isGeneratingInsights} insights={insights} />
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
                selectedConnectionId={selectedConnectionId}
                setSelectedConnectionId={setSelectedConnectionId}
                onAddComponent={addNode}
                isConnectionMode={isConnectionMode}
                isPacketSimulationMode={isPacketSimulationMode}
                onNodeClickForSimulation={handleNodeClickForSimulation}
                packetSimSourceNode={packetSimSourceNode}
                animatedPackets={animatedPackets}
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