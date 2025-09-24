import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Connection, NetworkComponentType, NetworkTopology, AnimatedPacket, DeliveredPacketInfo } from '../types';
import NetworkCanvas from './NetworkCanvas';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';
import ConnectionPanel from './ConnectionPanel';
import ReportDashboard from './ReportDashboard';
import { networkAnalysisService } from '../services/networkAnalysisService';
import { geminiService } from '../services/geminiService';
import { pathfindingService } from '../services/pathfindingService';
import AIInsightsPanel from './AIInsightsPanel';
import PacketDeliveryLog from './PacketDeliveryLog';

const WEAK_NODE_EFFICIENCY_THRESHOLD = 85;
const PACKET_ANIMATION_DURATION_AI = 4000; // ms
const PACKET_ANIMATION_DURATION_TRADITIONAL = 5500; // ms
const PACKET_SIMULATION_DURATION = 8000; // 8s
const JIGGLE_AMPLITUDE = 2; // Pixels for node movement in simulation

const SaveNetworkModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    initialContent: string;
    onSave: (fileName: string, content: string) => void;
}> = ({ isOpen, onClose, initialContent, onSave }) => {
    const [fileName, setFileName] = useState('network-config.json');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (isOpen) {
            setContent(initialContent);
            setFileName('network-config.json');
        }
    }, [isOpen, initialContent]);

    if (!isOpen) return null;

    const handleSaveClick = () => {
        onSave(fileName, content);
    };

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={handleContainerClick}>
            <div className="bg-gray-800 rounded-lg shadow-xl border border-cyan-500/20 w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-cyan-500/20 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-cyan-300">Save Network Configuration</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    <div>
                        <label htmlFor="save-filename" className="block text-sm font-medium text-gray-300 mb-1">File Name</label>
                        <input
                            id="save-filename"
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="save-content" className="block text-sm font-medium text-gray-300 mb-1">Network Data (JSON) - Editable</label>
                        <textarea
                            id="save-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-64 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white font-mono text-sm resize-y focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                            spellCheck="false"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-cyan-500/20 flex justify-end items-center space-x-3 bg-gray-800/50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">Cancel</button>
                    <button onClick={handleSaveClick} className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">Save to File</button>
                </div>
            </div>
        </div>
    );
};

interface VisualBuilderWorkspaceProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    saveSnapshot: () => void;
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
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
};

const VisualBuilderWorkspace: React.FC<VisualBuilderWorkspaceProps> = ({ nodes, setNodes, connections, setConnections, saveSnapshot }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<{ topology: string; description: string } | null>(null);
  const [simulationParams, setSimulationParams] = useState<any | null>(null);
  const [insights, setInsights] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const [isPacketSimulationMode, setIsPacketSimulationMode] = useState(false);
  const [packetSimSourceNodes, setPacketSimSourceNodes] = useState<string[]>([]);
  const [animatedPackets, setAnimatedPackets] = useState<AnimatedPacket[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mobilityFrameRef = useRef<number | null>(null);

  // New states for real-time updates and message simulation
  const [hasAnalyzedOnce, setHasAnalyzedOnce] = useState(false);
  const [isReportUpdating, setIsReportUpdating] = useState(false);
  const [packetMessage, setPacketMessage] = useState('This is a test packet transmission. Data integrity check: SUCCESS.');
  const [deliveredPackets, setDeliveredPackets] = useState<DeliveredPacketInfo[]>([]);
  const analysisDownloadRef = useRef<HTMLDivElement>(null);
  const reportDashboardRef = useRef<HTMLDivElement>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [nodeInitialPositions, setNodeInitialPositions] = useState<Map<string, {x: number, y: number}> | null>(null);

  // State for new features
  const [isolatedMaliciousNodeIds, setIsolatedMaliciousNodeIds] = useState<string[]>([]);
  const [droppedPacketEvents, setDroppedPacketEvents] = useState<{ id: string, x: number, y: number }[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [networkDataToSave, setNetworkDataToSave] = useState('');
  const [clusterHeadIds, setClusterHeadIds] = useState<string[]>([]);

  const stopMobility = useCallback(() => {
    if (mobilityFrameRef.current) {
        cancelAnimationFrame(mobilityFrameRef.current);
        mobilityFrameRef.current = null;
    }
    if (nodeInitialPositions) {
        setNodes(prevNodes => prevNodes.map(n => {
            const initialPos = nodeInitialPositions.get(n.id);
            const { vx, vy, ...rest } = n;
            if (initialPos) {
                return { ...rest, x: initialPos.x, y: initialPos.y };
            }
            return rest;
        }));
    }
    setNodeInitialPositions(null);
  }, [setNodes, nodeInitialPositions]);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setSimulationParams(null);
    setInsights(null);
    setAnimatedPackets([]);
    setSelectedConnectionId(null);
    setHasAnalyzedOnce(false);
    setIsolatedMaliciousNodeIds([]);
    // Do not clear clusterHeadIds here, it's needed for reconstruction
    stopMobility();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [stopMobility]);

  // Effect for real-time report updates
  useEffect(() => {
    if (!hasAnalyzedOnce || nodes.length < 2) {
        if (nodes.length < 2) setSimulationParams(null);
        return;
    };

    setIsReportUpdating(true);
    const handler = setTimeout(() => {
        const maliciousNodes = nodes.filter(n => n.isMalicious).map(n => n.id);
        const topology = networkAnalysisService.identifyTopology(nodes, connections);
        const params = networkAnalysisService.simulatePerformance(topology, nodes, connections, maliciousNodes);
        setSimulationParams(params);
        setIsReportUpdating(false);
    }, 300); // Debounce for 300ms for snappier updates

    return () => {
        clearTimeout(handler);
        setIsReportUpdating(false);
    };
  }, [nodes, connections, hasAnalyzedOnce]);

  const deleteSelectedConnection = useCallback(() => {
    if (selectedConnectionId) {
        saveSnapshot();
        setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
        setSelectedConnectionId(null);
    }
  }, [selectedConnectionId, setConnections, saveSnapshot]);

    const deleteSelectedNode = useCallback(() => {
        if (selectedNodeId) {
            saveSnapshot();
            setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
            setConnections(prev => prev.filter(c => c.from !== selectedNodeId && c.to !== selectedNodeId));
            setSelectedNodeId(null);
        }
    }, [selectedNodeId, setNodes, setConnections, saveSnapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.key === 'Delete' || event.key === 'Backspace')) {
            if (selectedConnectionId) {
                deleteSelectedConnection();
            } else if (selectedNodeId) {
                deleteSelectedNode();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedConnectionId, selectedNodeId, deleteSelectedConnection, deleteSelectedNode]);


  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mobilityFrameRef.current) {
        cancelAnimationFrame(mobilityFrameRef.current);
      }
    };
  }, []);

  const animationLoop = useCallback(() => {
    const maliciousNodes = nodes.filter(n => n.isMalicious).map(n => n.id);

    setAnimatedPackets(prevPackets => {
        const now = performance.now();
        const completedPackets: AnimatedPacket[] = [];
        const updatedPackets = prevPackets.map(p => {
            const elapsedTime = now - p.startTime;
            let progress = Math.min(elapsedTime / p.duration, 1);

            // Check for packet drop with traditional protocol
            if (p.id.startsWith('packet-trad') || p.id.startsWith('sim-packet-trad-')) {
                 const currentSegmentIndex = Math.min(Math.floor(progress * (p.path.length - 1)), p.path.length - 2);
                 const nextNodeId = p.path[currentSegmentIndex + 1];
                 if (maliciousNodes.includes(nextNodeId)) {
                     const fromNode = nodes.find(n => n.id === p.path[currentSegmentIndex]);
                     const toNode = nodes.find(n => n.id === nextNodeId);
                     if (fromNode && toNode) {
                         const dropX = fromNode.x + (toNode.x - fromNode.x) * 0.5;
                         const dropY = fromNode.y + (toNode.y - fromNode.y) * 0.5;
                         setDroppedPacketEvents(prev => [...prev, {id: `drop-${p.id}`, x: dropX, y: dropY}]);
                         setTimeout(() => setDroppedPacketEvents(prev => prev.filter(e => e.id !== `drop-${p.id}`)), 1000);
                     }
                     progress = 1; // Mark for completion/removal
                 }
            }

            if (progress >= 1) {
                completedPackets.push(p);
            }
            return { ...p, progress };
        }).filter(p => p.progress < 1);

        completedPackets.forEach(p => {
            if ((p.id.startsWith('sim-packet-ai-') || p.id.startsWith('packet-ai')) && p.message) {
                const fromNode = nodes.find(n => n.id === p.path[0]);
                const toNode = nodes.find(n => n.id === p.path[p.path.length - 1]);
                if(fromNode && toNode) {
                    const fromNodeIndex = nodes.findIndex(n => n.id === fromNode.id) + 1;
                    const toNodeIndex = nodes.findIndex(n => n.id === toNode.id) + 1;
                    const fullPath = p.path.map(nodeId => `Node ${nodes.findIndex(n => n.id === nodeId) + 1}`);
                    
                    const isDropped = p.path.some(nodeId => maliciousNodes.includes(nodeId));

                    setDeliveredPackets(prev => [...prev, {
                        id: `log-${p.id}-${Date.now()}`,
                        from: `Node ${fromNodeIndex}`, to: `Node ${toNodeIndex}`,
                        message: p.message!, path: fullPath, status: isDropped ? 'dropped' : 'delivered',
                        transmissionTime: p.duration
                    }]);
                }
            }
        });

        if (updatedPackets.length > 0) {
            animationFrameRef.current = requestAnimationFrame(animationLoop);
        } else {
            animationFrameRef.current = null;
        }
        return updatedPackets;
    });
  }, [nodes]);

  const ensureAnimationLoop = useCallback(() => {
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    }
  }, [animationLoop]);

  const startAnalysisPacketAnimation = (path: string[], pathTrad: string[]) => {
    const startTime = performance.now();
    const newPackets: AnimatedPacket[] = [];

    if (path) newPackets.push({ id: 'packet-ai', path, progress: 0, color: '#22d3ee', startTime, duration: PACKET_ANIMATION_DURATION_AI, message: "AI protocol test packet." });
    if (pathTrad) newPackets.push({ id: 'packet-trad', path: pathTrad, progress: 0, color: '#f97316', startTime, duration: PACKET_ANIMATION_DURATION_TRADITIONAL, message: "Traditional protocol test packet." });
    
    setAnimatedPackets(prev => [...prev, ...newPackets]);
    ensureAnimationLoop();
  };

  const mobilityLoop = useCallback(() => {
    if (!nodeInitialPositions) {
      mobilityFrameRef.current = null;
      return;
    }

    setNodes(prevNodes => prevNodes.map(node => {
      const initialPos = nodeInitialPositions.get(node.id);
      if (!initialPos) return node;

      const x = initialPos.x + (Math.random() - 0.5) * JIGGLE_AMPLITUDE;
      const y = initialPos.y + (Math.random() - 0.5) * JIGGLE_AMPLITUDE;
      
      return { ...node, x, y };
    }));

    mobilityFrameRef.current = requestAnimationFrame(mobilityLoop);
  }, [setNodes, nodeInitialPositions]);

  const startMobility = useCallback(() => {
    if (!mobilityFrameRef.current) {
        const initialPositions = new Map<string, { x: number, y: number }>();
        nodes.forEach(n => initialPositions.set(n.id, { x: n.x, y: n.y }));
        setNodeInitialPositions(initialPositions);
        mobilityFrameRef.current = requestAnimationFrame(mobilityLoop);
    }
  }, [mobilityLoop, nodes]);

  const toggleConnectionMode = () => {
    setIsConnectionMode(prev => {
        const isEntering = !prev;
        if (isEntering) {
            setIsPacketSimulationMode(false);
            setPacketSimSourceNodes([]);
            stopMobility();
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
        } else {
            stopMobility();
        }
        setPacketSimSourceNodes([]);
        return isEntering;
    });
  };

  const handleNodeClickForSimulation = (nodeId: string) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode || targetNode.type === NetworkComponentType.BASE_STATION) {
        return; // Can't select base stations as source
    }

    const baseStation = nodes.find(n => n.type === NetworkComponentType.BASE_STATION);
    if (!baseStation) {
        alert("A Base Station is required to act as the destination for packet simulations.");
        return;
    }
    const destinationNodeId = baseStation.id;

    const isAlreadySource = packetSimSourceNodes.includes(nodeId);

    if (isAlreadySource) {
        // Deselecting node
        const newSourceNodes = packetSimSourceNodes.filter(id => id !== nodeId);
        setPacketSimSourceNodes(newSourceNodes);
        if (newSourceNodes.length === 0) {
            stopMobility();
        }
    } else {
        // Selecting new source node
        if (packetSimSourceNodes.length >= 15) {
            alert("You can select a maximum of 15 source nodes for simulation.");
            return;
        }

        const newSourceNodes = [...packetSimSourceNodes, nodeId];
        
        if (packetSimSourceNodes.length === 0) {
            startMobility();
        }

        setPacketSimSourceNodes(newSourceNodes);

        const maliciousNodeIds = nodes.filter(n => n.isMalicious).map(n => n.id);
        const newPackets: AnimatedPacket[] = [];
        const sourceNodeId = nodeId;

        const pathAI = pathfindingService.findShortestPath(sourceNodeId, destinationNodeId, nodes, connections, maliciousNodeIds);
        const pathTrad = pathfindingService.findShortestPath(sourceNodeId, destinationNodeId, nodes, connections);

        if (pathAI) {
            newPackets.push({
                id: `sim-packet-ai-${sourceNodeId}-${Date.now()}`, path: pathAI, progress: 0, color: '#22d3ee',
                startTime: performance.now(), duration: PACKET_SIMULATION_DURATION, message: packetMessage
            });
        }
        if (pathTrad) {
                newPackets.push({
                id: `sim-packet-trad-${sourceNodeId}-${Date.now()}`, path: pathTrad, progress: 0, color: '#f97316',
                startTime: performance.now(), duration: PACKET_SIMULATION_DURATION, message: packetMessage
            });
        }
        
        if (newPackets.length > 0) {
            setAnimatedPackets(prev => [...prev, ...newPackets]);
            ensureAnimationLoop();
        } else {
            alert(`No path found from the selected node to the Base Station. A switch may be disabled or the network may be disconnected.`);
        }
    }
  };


  const addNode = (type: NetworkComponentType, x: number, y: number) => {
    saveSnapshot();
    const baseNode = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      x,
      y,
      ipAddress: `192.168.1.${nodes.length + 1}`,
      isMalicious: false,
    };

    let newNode: Node;

    switch (type) {
      case NetworkComponentType.ROUTER:
        newNode = { ...baseNode, energyEfficiency: 100, energySpent: 25, packetForwardingCapacity: 5000 };
        break;
      case NetworkComponentType.SWITCH:
        newNode = { ...baseNode, energyEfficiency: 100, energySpent: 10, portCount: 16, isEnabled: true };
        break;
      case NetworkComponentType.BASE_STATION:
        newNode = { ...baseNode, energyEfficiency: 100, energySpent: 50, isReceiver: true };
        break;
      case NetworkComponentType.NODE:
      default:
        newNode = { ...baseNode, energyEfficiency: Math.round(80 + Math.random() * 20), energySpent: Math.round(Math.random() * 10) + 5 };
        break;
    }
    setNodes((prev) => [...prev, newNode]);
  };

  const generateNetwork = useCallback((
    count: number, 
    topology: NetworkTopology,
    includeRouters: boolean,
    includeSwitches: boolean,
    numClusterHeads: number
  ) => {
    if (count <= 0) return;
    if (count > 450) {
      alert('The maximum number of nodes is 450.');
      return;
    }
    saveSnapshot();
    clearAnalysis();
    setClusterHeadIds([]);
    let newNodes: Node[] = [];
    let newConnections: Connection[] = [];
    const canvasEl = canvasRef.current;
    const padding = 40;
    const canvasWidth = canvasEl ? canvasEl.clientWidth - padding : 800;
    const canvasHeight = canvasEl ? canvasEl.clientHeight - padding : 600;

    const createNode = (i: number, x: number, y: number, type: NetworkComponentType = NetworkComponentType.NODE): Node => {
        const base = {
            id: `${type.toLowerCase()}-${Date.now()}-${i}`, type, x, y,
            ipAddress: `192.168.1.${i + 1}`, isMalicious: false,
        };
        switch (type) {
            case NetworkComponentType.ROUTER: return { ...base, energyEfficiency: 100, energySpent: 25, packetForwardingCapacity: 5000 };
            case NetworkComponentType.SWITCH: return { ...base, energyEfficiency: 100, energySpent: 10, portCount: 16, isEnabled: true };
            case NetworkComponentType.BASE_STATION: return { ...base, energyEfficiency: 100, energySpent: 50, isReceiver: true };
            default: return { ...base, energyEfficiency: Math.round(80 + Math.random() * 20), energySpent: Math.round(Math.random() * 10) + 5 };
        }
    };
    
    if (topology === 'cluster' || topology === 'cluster-mesh') {
        // This topology already includes a Base Station by design.
        const actualNumClusterHeads = Math.max(1, numClusterHeads);
        if (count <= actualNumClusterHeads) {
            alert('Node count must be greater than the number of cluster heads.');
            return;
        }

        const numEndNodes = count - actualNumClusterHeads;
        const clusterHubs: Node[] = [];

        // Add Base Station
        const baseStation = createNode(count, canvasWidth / 2, padding / 2, NetworkComponentType.BASE_STATION);
        newNodes.push(baseStation);
        
        const clusterHeadType = includeRouters ? NetworkComponentType.ROUTER : NetworkComponentType.NODE;

        // Create cluster heads
        for (let c = 0; c < actualNumClusterHeads; c++) {
            const angle = (c / actualNumClusterHeads) * 2 * Math.PI;
            const radius = Math.min(canvasWidth, canvasHeight) / 3.5;
            const hubX = canvasWidth / 2 + radius * Math.cos(angle);
            const hubY = canvasHeight / 2 + radius * Math.sin(angle);
            const clusterHub = createNode(numEndNodes + c, hubX, hubY, clusterHeadType);
            newNodes.push(clusterHub);
            clusterHubs.push(clusterHub);
        }
        setClusterHeadIds(clusterHubs.map(hub => hub.id));

        const allClusterNodes: Node[][] = Array.from({ length: clusterHubs.length }, () => []);
        let nodesPlaced = 0;

        for (let c = 0; c < clusterHubs.length; c++) {
            const clusterHub = clusterHubs[c];
            allClusterNodes[c].push(clusterHub);
            const clusterRadius = Math.min(canvasWidth, canvasHeight) / (clusterHubs.length * 1.8);
            const nodesInThisCluster = c === clusterHubs.length - 1 ? numEndNodes - nodesPlaced : Math.floor(numEndNodes / clusterHubs.length);

            for (let i = 0; i < nodesInThisCluster; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * clusterRadius;
                const node = createNode(nodesPlaced, clusterHub.x + Math.cos(angle) * radius, clusterHub.y + Math.sin(angle) * radius);
                newNodes.push(node);
                allClusterNodes[c].push(node);
                // For 'cluster' topology, connect directly to hub
                if (topology === 'cluster') {
                    newConnections.push({ id: `${node.id}-${clusterHub.id}-${Date.now()}`, from: node.id, to: clusterHub.id });
                }
                nodesPlaced++;
            }
        }
        
        if (topology === 'cluster-mesh') {
            const K_NEAREST_IN_CLUSTER = 3;
            allClusterNodes.forEach(cluster => {
                if(cluster.length < 2) return;
                cluster.forEach(sourceNode => {
                    const distances = cluster
                        .filter(n => n.id !== sourceNode.id)
                        .map(targetNode => ({ id: targetNode.id, dist: Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y) }))
                        .sort((a, b) => a.dist - b.dist);
                    
                    for (let k = 0; k < Math.min(K_NEAREST_IN_CLUSTER, distances.length); k++) {
                        const targetNodeId = distances[k].id;
                        const exists = newConnections.some(c => (c.from === sourceNode.id && c.to === targetNodeId) || (c.from === targetNodeId && c.to === sourceNode.id));
                        if (!exists) {
                            newConnections.push({ id: `${sourceNode.id}-${targetNodeId}-${Date.now()}`, from: sourceNode.id, to: targetNodeId });
                        }
                    }
                });
            });
        }
        
        // Connect cluster hubs to each other and to the base station
        for(let i = 0; i < clusterHubs.length; i++) {
            newConnections.push({ id: `${clusterHubs[i].id}-${baseStation.id}-${Date.now()}`, from: clusterHubs[i].id, to: baseStation.id });
            for (let j = i + 1; j < clusterHubs.length; j++) {
                newConnections.push({ id: `${clusterHubs[i].id}-${clusterHubs[j].id}-${Date.now()}`, from: clusterHubs[i].id, to: clusterHubs[j].id });
            }
        }

    } else if (topology === 'random' || topology === 'mesh') {
        const baseStation = createNode(count, canvasWidth / 2, padding, NetworkComponentType.BASE_STATION);
        newNodes.push(baseStation);

        const numRouters = includeRouters ? Math.max(1, Math.floor(count / 25)) : 0;
        const numSwitches = includeSwitches ? Math.max(1, Math.floor(count / 30)) : 0;
        const numEndNodes = count - numRouters - numSwitches;

        for (let i = 0; i < numEndNodes; i++) newNodes.push(createNode(i, Math.random() * canvasWidth + padding / 2, Math.random() * canvasHeight + padding / 2));
        for (let i = 0; i < numRouters; i++) newNodes.push(createNode(numEndNodes + i, Math.random() * canvasWidth + padding / 2, Math.random() * canvasHeight + padding / 2, NetworkComponentType.ROUTER));
        for (let i = 0; i < numSwitches; i++) newNodes.push(createNode(numEndNodes + numRouters + i, Math.random() * canvasWidth + padding / 2, Math.random() * canvasHeight + padding / 2, NetworkComponentType.SWITCH));
        
        const infraNodes = newNodes.filter(n => n.type !== NetworkComponentType.NODE);
        const endNodes = newNodes.filter(n => n.type === NetworkComponentType.NODE);

        for (let i = 0; i < infraNodes.length; i++) {
            for (let j = i + 1; j < infraNodes.length; j++) {
                newConnections.push({ id: `${infraNodes[i].id}-${infraNodes[j].id}-${Date.now()}`, from: infraNodes[i].id, to: infraNodes[j].id });
            }
        }
        
        endNodes.forEach(node => {
            const potentialTargets = [...infraNodes, ...endNodes.filter(n => n.id !== node.id)];
            if(potentialTargets.length === 0) return;
            potentialTargets.sort((a, b) => (Math.hypot(a.x - node.x, a.y - node.y) - Math.hypot(b.x - node.x, b.y - node.y)));
            const target = potentialTargets[0];
            newConnections.push({ id: `${node.id}-${target.id}-${Date.now()}`, from: node.id, to: target.id });
        });

        if (topology === 'mesh') {
            const K_NEAREST = 3;
            const meshableNodes = newNodes.filter(n => n.type !== NetworkComponentType.BASE_STATION);
            meshableNodes.forEach(sourceNode => {
                const distances = meshableNodes
                    .filter(n => n.id !== sourceNode.id)
                    .map(targetNode => ({ id: targetNode.id, dist: Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y) }))
                    .sort((a, b) => a.dist - b.dist);
                
                for (let k = 0; k < Math.min(K_NEAREST, distances.length); k++) {
                    const targetNodeId = distances[k].id;
                    const exists = newConnections.some(c => (c.from === sourceNode.id && c.to === targetNodeId) || (c.from === targetNodeId && c.to === sourceNode.id));
                    if (!exists) {
                       newConnections.push({ id: `${sourceNode.id}-${targetNodeId}-${Date.now()}`, from: sourceNode.id, to: targetNodeId });
                    }
                }
            });
        }
    } else if (topology === 'grid') {
        const baseStation = createNode(count, canvasWidth / 2, padding, NetworkComponentType.BASE_STATION);
        newNodes.push(baseStation);
        
        const numRouters = includeRouters ? Math.max(1, Math.floor(count / 25)) : 0;
        const cols = Math.ceil(Math.sqrt(count * (canvasWidth / canvasHeight)));
        const rows = Math.ceil(count / cols);
        const xSpacing = canvasWidth / (cols + 1);
        const ySpacing = canvasHeight / (rows + 1);
        let routerPlaced = 0;
        const gridNodes: Node[] = [];

        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = (col + 1) * xSpacing;
            const y = (row + 1) * ySpacing;

            if (includeRouters && routerPlaced < numRouters && row > 0 && col > 0 && row < rows -1 && col < cols - 1 && (row % 3 === 1 && col % 3 === 1)) {
                 gridNodes.push(createNode(i, x, y, NetworkComponentType.ROUTER));
                 routerPlaced++;
            } else {
                 gridNodes.push(createNode(i, x, y));
            }
        }
        newNodes.push(...gridNodes);

        if (gridNodes.length > 0) {
            gridNodes.sort((a,b) => Math.hypot(a.x - baseStation.x, a.y - baseStation.y) - Math.hypot(b.x - baseStation.x, b.y - baseStation.y));
            const closestNode = gridNodes[0];
            newConnections.push({ id: `${baseStation.id}-${closestNode.id}-${Date.now()}`, from: baseStation.id, to: closestNode.id });
        }
    } else if (topology === 'ring' || topology === 'bus') {
        const centerX = canvasWidth / 2 + padding / 2;
        const centerY = canvasHeight / 2 + padding / 2;
        const baseStation = createNode(count, centerX, padding, NetworkComponentType.BASE_STATION);
        
        const topologyNodes: Node[] = [];

        if (topology === 'ring') {
            const radius = Math.min(canvasWidth, canvasHeight) / 2 - padding;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * 2 * Math.PI;
                topologyNodes.push(createNode(i, centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)));
            }
            for (let i = 0; i < count; i++) {
                newConnections.push({ id: `conn-${i}-${Date.now()}`, from: topologyNodes[i].id, to: topologyNodes[(i + 1) % count].id });
            }
        } else { // Bus
            const xSpacing = canvasWidth / (count + 1);
            for (let i = 0; i < count; i++) {
                topologyNodes.push(createNode(i, (i + 1) * xSpacing + padding / 2, centerY));
            }
            for (let i = 0; i < count - 1; i++) {
                newConnections.push({ id: `conn-${i}-${Date.now()}`, from: topologyNodes[i].id, to: topologyNodes[i + 1].id });
            }
        }
        
        if (topologyNodes.length > 0) {
            topologyNodes.sort((a,b) => Math.hypot(a.x - baseStation.x, a.y - baseStation.y) - Math.hypot(b.x - baseStation.x, b.y - baseStation.y));
            newConnections.push({ id: `${baseStation.id}-${topologyNodes[0].id}-${Date.now()}`, from: baseStation.id, to: topologyNodes[0].id });
        }
        
        newNodes.push(baseStation, ...topologyNodes);

    } else if (topology === 'star') {
        // Star topology already uses a Base Station as its central hub.
        const centerX = canvasWidth / 2 + padding / 2;
        const centerY = canvasHeight / 2 + padding / 2;
        const hubNode = createNode(0, centerX, centerY, NetworkComponentType.BASE_STATION);
        newNodes.push(hubNode);
    
        if (count > 1) {
            const peripheralCount = count - 1;
            const radius = Math.min(canvasWidth, canvasHeight) / 2 - padding;
            for (let i = 0; i < peripheralCount; i++) {
                const angle = (i / peripheralCount) * 2 * Math.PI;
                const pNode = createNode(i + 1, centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
                newNodes.push(pNode);
                newConnections.push({ id: `${hubNode.id}-${pNode.id}-${Date.now()}`, from: pNode.id, to: hubNode.id });
            }
        }
    }
    
    setNodes(newNodes);
    setConnections(newConnections);
    setSelectedNodeId(null);
    setIsConnectionMode(false);
  }, [setNodes, setConnections, clearAnalysis, saveSnapshot]);

  const updateNode = useCallback((updatedNode: Node) => {
    setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
  }, [setNodes]);

  const updateNodeIp = useCallback((nodeId: string, ipAddress: string) => {
    setNodes(prev => prev.map(n => (n.id === nodeId ? { ...n, ipAddress } : n)));
  }, [setNodes]);

  const handleAutoConnect = useCallback((k: number) => {
    if (nodes.length < 2 || k <= 0) return;
    saveSnapshot();
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
  }, [nodes, setConnections, saveSnapshot]);

  const handleRouterAutoConnect = useCallback((routerId: string) => {
        saveSnapshot();
        const routerNode = nodes.find(n => n.id === routerId);
        if (!routerNode) return;

        const connectedNodeIds = new Set(
            connections
                .filter(c => c.from === routerId || c.to === routerId)
                .flatMap(c => [c.from, c.to])
        );

        const unconnectedNodes = nodes.filter(n => n.id !== routerId && !connectedNodeIds.has(n.id));

        const distances = unconnectedNodes.map(targetNode => {
            const dist = Math.sqrt(Math.pow(routerNode.x - targetNode.x, 2) + Math.pow(routerNode.y - targetNode.y, 2));
            return { id: targetNode.id, dist };
        }).sort((a, b) => a.dist - b.dist);

        const K_NEAREST = 3;
        const newConnections = distances.slice(0, K_NEAREST).map(target => ({
            id: `${routerId}-${target.id}-${Date.now()}`,
            from: routerId,
            to: target.id,
        }));

        if (newConnections.length > 0) {
            setConnections(prev => [...prev, ...newConnections]);
            alert(`Connected router to ${newConnections.length} nearest node(s).`);
        } else {
            alert('Router is already connected to all available nodes.');
        }
    }, [nodes, connections, setConnections, saveSnapshot]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setIsGeneratingInsights(true);
    setAnalysisResult(null);
    setSimulationParams(null);
    setInsights(null);
    setAnimatedPackets([]);
    setIsConnectionMode(false);
    setIsPacketSimulationMode(false);
    setPacketSimSourceNodes([]);
    
    startMobility();

    try {
      const maliciousNodeIds = nodes.filter(n => n.isMalicious).map(n => n.id);
      setIsolatedMaliciousNodeIds(maliciousNodeIds); // Simulate AI isolating the nodes

      const topology = networkAnalysisService.identifyTopology(nodes, connections);
      
      const descriptionPromise = geminiService.getTopologyDescription(topology);
      const insightsPromise = (async () => {
        const networkData = networkAnalysisService.getNetworkStats(nodes, connections);
        const insights = await geminiService.getNetworkInsights({ ...networkData, topology });
        if (maliciousNodeIds.length > 0) {
            return `${insights}\n\n**Security Alert:**\n* ${maliciousNodeIds.length} malicious node(s) detected. The AI protocol will attempt to mitigate the threat by isolating them and re-routing traffic. Expect a significant performance drop for traditional protocols.`;
        }
        return insights;
      })();

      const params = networkAnalysisService.simulatePerformance(topology, nodes, connections, maliciousNodeIds);
      setSimulationParams(params);
      setHasAnalyzedOnce(true);

      const description = await descriptionPromise;
      setAnalysisResult({ topology, description });
      
      const generatedInsights = await insightsPromise;
      setInsights(generatedInsights);
      
      const farthestNodes = pathfindingService.findFarthestNodes(nodes, maliciousNodeIds);
      if (farthestNodes) {
        const path = pathfindingService.findShortestPath(farthestNodes[0], farthestNodes[1], nodes, connections, maliciousNodeIds);
        const pathTrad = pathfindingService.findShortestPath(farthestNodes[0], farthestNodes[1], nodes, connections);
        startAnalysisPacketAnimation(path, pathTrad);
      }

    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisResult({ topology: 'Error', description: 'Failed to analyze network. Please check console.' });
      setInsights('**Error:** Could not generate network insights.');
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingInsights(false);
      stopMobility();
    }
  };

  const handleDownloadFullReport = async () => {
    const canvasEl = canvasRef.current;
    const reportEl = reportDashboardRef.current;
  
    if (!canvasEl || !reportEl || !analysisResult || !insights) {
      alert("Please run an analysis first to generate all report components.");
      return;
    }
  
    setIsDownloadingReport(true);
  
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
  
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pdfWidth - margin * 2;
  
      const addImageToPdf = (canvas: HTMLCanvasElement, pdfInstance: typeof pdf) => {
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdfInstance.getImageProperties(imgData);
        const ratio = imgProps.height / imgProps.width;
        let imgHeight = contentWidth * ratio;
        
        pdfInstance.addImage(imgData, 'PNG', margin, 80, contentWidth, imgHeight);
      };
      
      const renderFormattedText = (text: string, initialY: number, pdfInstance: typeof pdf) => {
          let y = initialY;
          const lines = text.replace(/\*\*/g, '').split('\n').filter(line => line.trim() !== '');
  
          lines.forEach(line => {
              if (y > pdfHeight - margin * 2) {
                  pdfInstance.addPage();
                  y = margin;
              }
              const isHeader = ["Definition:", "Protocols:", "Mechanism:"].some(h => line.startsWith(h));
              
              pdfInstance.setFont('helvetica', isHeader ? 'bold' : 'normal');
              const textLines = pdfInstance.splitTextToSize(line, contentWidth);
              pdfInstance.text(textLines, margin, y);
              y += (textLines.length * pdfInstance.getLineHeight()) / pdfInstance.internal.scaleFactor + 5;
          });
          return y;
      };
      
      const renderInsights = (text: string, initialY: number, pdfInstance: typeof pdf) => {
          let y = initialY;
          const sections: { [key: string]: string[] } = {};
          let currentSection = '';
  
          text.split('\n').forEach(line => {
              line = line.trim();
              if (line.startsWith('**') && line.endsWith('**')) {
                  currentSection = line.substring(2, line.length - 2);
                  sections[currentSection] = [];
              } else if (currentSection && line) {
                  const content = line.startsWith('*') ? line.substring(1).trim() : line;
                  if (content) sections[currentSection].push(content);
              }
          });
  
          Object.entries(sections).forEach(([title, content]) => {
              if (y > pdfHeight - margin * 2) {
                  pdfInstance.addPage();
                  y = margin;
              }
              pdfInstance.setFont('helvetica', 'bold');
              pdfInstance.setFontSize(12);
              const titleLines = pdfInstance.splitTextToSize(title, contentWidth);
              pdfInstance.text(titleLines, margin, y);
              y += (titleLines.length * pdfInstance.getLineHeight()) / pdfInstance.internal.scaleFactor + 5;
  
              pdfInstance.setFont('helvetica', 'normal');
              pdfInstance.setFontSize(10);
              content.forEach(item => {
                  if (y > pdfHeight - margin * 2) {
                      pdfInstance.addPage();
                      y = margin;
                  }
                  const itemText = `• ${item}`;
                  const itemLines = pdfInstance.splitTextToSize(itemText, contentWidth - 10); // Indent
                  pdfInstance.text(itemLines, margin + 10, y);
                  y += (itemLines.length * pdfInstance.getLineHeight()) / pdfInstance.internal.scaleFactor + 2;
              });
              y += 10;
          });
          return y;
      };
  
      // --- PDF Header ---
      pdf.setFontSize(20);
      pdf.text('Full Network Simulation Report', pdfWidth / 2, margin, { align: 'center' });
  
      // --- Section 1: Network Canvas ---
      pdf.setFontSize(16);
      pdf.text('1. Network Topology Visualization', margin, margin + 20);
      const canvasImage = await html2canvas(canvasEl, { backgroundColor: '#1f2937', useCORS: true, logging: false, scale: 2 });
      addImageToPdf(canvasImage, pdf);
  
      // --- Section 2: Topology Analysis & AI Insights (Native Text) ---
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('2. Topology Analysis & AI Insights', margin, margin);
      let currentY = margin + 30;
      
      // Analysis Part
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Identified Topology: ${analysisResult.topology}`, margin, currentY);
      currentY += 20;
      pdf.setFontSize(10);
      currentY = renderFormattedText(analysisResult.description, currentY, pdf);
      
      currentY += 20; // Spacing
      
      // Insights Part
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text("AI-Powered Insights", margin, currentY);
      currentY += 25;
      renderInsights(insights, currentY, pdf);
  
      // --- Section 3: Detailed Performance Report ---
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('3. Detailed Performance Report', margin, margin);
      const reportImage = await html2canvas(reportEl, { backgroundColor: '#111827', useCORS: true, logging: false, scale: 2 });
      addImageToPdf(reportImage, pdf);
  
      pdf.save("full-network-report.pdf");
    } catch (error) {
      console.error("Failed to generate PDF report:", error);
      alert("An error occurred while generating the PDF report. Please check the console for details.");
    } finally {
      setIsDownloadingReport(false);
    }
  };


  const handleReconstruct = useCallback(async () => {
    saveSnapshot();
    const weakNodeIds = nodes
      .filter(n => n.type === NetworkComponentType.NODE && n.energyEfficiency < WEAK_NODE_EFFICIENCY_THRESHOLD)
      .map(n => n.id);

    if (weakNodeIds.length === 0) return;

    const newNodes = nodes.filter(n => !weakNodeIds.includes(n.id));
    let newConnections: Connection[] = [];

    const topology = networkAnalysisService.identifyTopology(newNodes, connections);
    const isClusterTopology = topology.toLowerCase().includes('cluster');

    if (isClusterTopology) {
        // Advanced reconstruction for cluster topologies
        const remainingClusterHeads = newNodes.filter(n => clusterHeadIds.includes(n.id) && !weakNodeIds.includes(n.id));
        const baseStation = newNodes.find(n => n.type === NetworkComponentType.BASE_STATION);
        const endNodes = newNodes.filter(n => n.type === NetworkComponentType.NODE && !remainingClusterHeads.some(h => h.id === n.id));

        if (remainingClusterHeads.length > 0 && baseStation) {
            // 1. Reconnect end nodes to their nearest cluster head
            endNodes.forEach(endNode => {
                let closestHead = remainingClusterHeads[0];
                let minDistance = Infinity;
                remainingClusterHeads.forEach(head => {
                    const distance = Math.hypot(endNode.x - head.x, endNode.y - head.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestHead = head;
                    }
                });
                newConnections.push({ id: `re-${endNode.id}-${closestHead.id}`, from: endNode.id, to: closestHead.id });
            });

            // 2. Connect cluster heads to each other (e.g., nearest 2)
            remainingClusterHeads.forEach(head => {
                const otherHeads = remainingClusterHeads.filter(h => h.id !== head.id);
                if (otherHeads.length === 0) return;
                
                otherHeads.sort((a, b) => Math.hypot(head.x - a.x, head.y - a.y) - Math.hypot(head.x - b.x, head.y - b.y));

                const neighborsToConnect = Math.min(2, otherHeads.length);
                for(let i=0; i < neighborsToConnect; i++){
                    const neighbor = otherHeads[i];
                    const exists = newConnections.some(c => (c.from === head.id && c.to === neighbor.id) || (c.from === neighbor.id && c.to === head.id));
                    if (!exists) {
                       newConnections.push({ id: `re-${head.id}-${neighbor.id}`, from: head.id, to: neighbor.id });
                    }
                }
            });

            // 3. Connect the closest cluster head to the base station
            let closestHeadToBase = remainingClusterHeads[0];
            let minDistanceToBase = Infinity;
             remainingClusterHeads.forEach(head => {
                const distance = Math.hypot(head.x - baseStation.x, head.y - baseStation.y);
                if (distance < minDistanceToBase) {
                    minDistanceToBase = distance;
                    closestHeadToBase = head;
                }
            });
            newConnections.push({ id: `re-ch-bs-${closestHeadToBase.id}`, from: closestHeadToBase.id, to: baseStation.id });

        } else {
             // Fallback if no heads or base station left, just connect everything
             const components = networkAnalysisService.findNetworkComponents(newNodes, []);
             if (components.length > 1) { /* ... use generic logic ... */ }
        }

    } else {
        // Generic Graph-based Reconnection for non-cluster topologies
        newConnections = connections.filter(c => !weakNodeIds.includes(c.from) && !weakNodeIds.includes(c.to));
        if (newNodes.length >= 2) {
            const components = networkAnalysisService.findNetworkComponents(newNodes, newConnections);
            if (components.length > 1) {
                components.sort((a, b) => b.length - a.length);
                const mainComponent = components.shift()!;
                for (const isolatedComponent of components) {
                    let minDistance = Infinity;
                    let bestConnection: { from: string; to: string } | null = null;
                    for (const sourceNode of isolatedComponent) {
                        for (const targetNode of mainComponent) {
                            const distance = Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y);
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestConnection = { from: sourceNode.id, to: targetNode.id };
                            }
                        }
                    }
                    if (bestConnection) {
                        newConnections.push({ id: `${bestConnection.from}-${bestConnection.to}-${Date.now()}`, from: bestConnection.from, to: bestConnection.to });
                        mainComponent.push(...isolatedComponent);
                    }
                }
            }
        }
    }

    setNodes(newNodes);
    setConnections(newConnections);
    const remainingClusterHeadIds = clusterHeadIds.filter(id => !weakNodeIds.includes(id));
    setClusterHeadIds(remainingClusterHeadIds);
    setSelectedNodeId(null);
    setInsights(null);
    setAnimatedPackets([]);
    
    alert(`Removed ${weakNodeIds.length} weaker node(s). The network has been reconnected and the report will now be updated.`);
    
    if (newNodes.length >= 2) {
      setIsGeneratingInsights(true);
      try {
        const newTopology = networkAnalysisService.identifyTopology(newNodes, newConnections);
        const descriptionPromise = geminiService.getTopologyDescription(newTopology);
        const insightsPromise = (async () => {
            const networkData = networkAnalysisService.getNetworkStats(newNodes, newConnections);
            return await geminiService.getNetworkInsights({ ...networkData, topology: newTopology });
        })();
        
        setAnalysisResult({ topology: newTopology, description: "Loading..." });
        const params = networkAnalysisService.simulatePerformance(newTopology, newNodes, newConnections);
        setSimulationParams(params);

        const description = await descriptionPromise;
        setAnalysisResult({ topology: newTopology, description });

        const newInsights = await insightsPromise;
        setInsights(newInsights);

      } catch (error) {
        console.error("Re-analysis failed after reconstruction:", error);
        setAnalysisResult({ topology: 'Error', description: 'Failed to re-analyze network.' });
        setInsights('**Error:** Could not regenerate insights after reconstruction.');
      } finally {
        setIsGeneratingInsights(false);
        startMobility(); // Keep the network "live" after reconstruction
      }
    } else {
        clearAnalysis();
    }
  }, [nodes, connections, setNodes, setConnections, clearAnalysis, startMobility, saveSnapshot, clusterHeadIds]);
  
  const handleSaveNetwork = useCallback(() => {
    if (nodes.length === 0) {
        return; // Button is disabled, but this is a safeguard
    }
    const dataToSave = {
        nodes,
        connections,
    };
    const jsonString = JSON.stringify(dataToSave, null, 2);
    setNetworkDataToSave(jsonString);
    setIsSaveModalOpen(true);
  }, [nodes, connections]);

  const performSave = useCallback((fileName: string, content: string) => {
    let parsedContent;
    try {
        parsedContent = JSON.parse(content);
    } catch (error) {
        alert("The content is not valid JSON. Please correct it before saving.");
        return;
    }

    if (!parsedContent.nodes || !parsedContent.connections || !Array.isArray(parsedContent.nodes) || !Array.isArray(parsedContent.connections)) {
        alert("Invalid network structure. The JSON must contain 'nodes' and 'connections' arrays.");
        return;
    }

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsSaveModalOpen(false);
  }, []);

  const handleLoadNetwork = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('Invalid file type. Please select a valid network configuration file (.json).');
      if (event.target) {
        event.target.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Failed to read file content.");
        }
        const data = JSON.parse(text);

        // Basic validation
        if (Array.isArray(data.nodes) && Array.isArray(data.connections)) {
          saveSnapshot();
          clearAnalysis();
          setNodes(data.nodes);
          setConnections(data.connections);
          alert(`Successfully loaded network from ${file.name}`);
        } else {
          throw new Error("Invalid network file format. 'nodes' and 'connections' arrays are required.");
        }
      } catch (error) {
        console.error("Failed to load network file:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Error loading file: ${file.name}.\n\nPlease ensure the file is a valid JSON network configuration.\n\nDetails: ${errorMessage}`);
      } finally {
        // Reset file input value to allow loading the same file again
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.onerror = () => {
      alert(`Failed to read the file: ${reader.error}`);
      if (event.target) {
        event.target.value = '';
      }
    };
    reader.readAsText(file);

  }, [setNodes, setConnections, clearAnalysis, saveSnapshot]);


  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedConnection = connections.find(c => c.id === selectedConnectionId) || null;
  const weakNodes = nodes.filter(n => n.type === NetworkComponentType.NODE && n.energyEfficiency < WEAK_NODE_EFFICIENCY_THRESHOLD);

  return (
    <>
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
                  onDownloadReport={handleDownloadFullReport}
                  analysisPerformed={!!analysisResult}
                  isDownloadingReport={isDownloadingReport}
                  onSaveNetwork={handleSaveNetwork}
                  onLoadNetwork={handleLoadNetwork}
              />
              {isPacketSimulationMode && (
                  <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 animate-fadeIn">
                      <h3 className="text-lg font-bold text-cyan-300 mb-2">Packet Message</h3>
                      <p className="text-xs text-gray-400 mb-2">Edit the message for the AI (blue) and Traditional (orange) packets.</p>
                      <textarea 
                          value={packetMessage}
                          onChange={(e) => setPacketMessage(e.target.value)}
                          className="w-full h-28 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          aria-label="Packet message editor"
                      />
                  </div>
              )}
              {selectedNode && !isConnectionMode && !isPacketSimulationMode && (
                  <PropertiesPanel 
                      node={selectedNode} 
                      onUpdate={updateNode} 
                      onRouterAutoConnect={handleRouterAutoConnect}
                      onDeleteNode={deleteSelectedNode}
                  />
              )}
              {selectedConnection && !isConnectionMode && !isPacketSimulationMode && <ConnectionPanel connection={selectedConnection} nodes={nodes} onDelete={deleteSelectedConnection} />}
              
              {deliveredPackets.length > 0 && (
                <PacketDeliveryLog
                  packets={deliveredPackets}
                  onClear={() => setDeliveredPackets([])}
                />
              )}

              <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20">
                  <div ref={analysisDownloadRef}>
                      {analysisResult && (
                          <div className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold text-cyan-300">Topology Analysis</h3>
                              </div>
                              <p className="mb-2 text-cyan-100">Identified Topology: <strong className="text-white">{analysisResult.topology}</strong></p>
                              <FormattedDescription text={analysisResult.description} />
                          </div>
                      )}
                      {(isAnalyzing || insights) && (
                        <div className={`${analysisResult ? 'border-t border-cyan-500/20' : ''}`}>
                          <AIInsightsPanel isLoading={isGeneratingInsights} insights={insights} />
                        </div>
                      )}
                  </div>
              </div>

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
                  packetSimSourceNodes={packetSimSourceNodes}
                  animatedPackets={animatedPackets}
                  isolatedMaliciousNodeIds={isolatedMaliciousNodeIds}
                  droppedPacketEvents={droppedPacketEvents}
                  weakNodeIds={weakNodes.map(n => n.id)}
                  clusterHeadIds={clusterHeadIds}
                  saveSnapshot={saveSnapshot}
              />
          </div>
        </div>
        {simulationParams && (
          <div className="mt-4">
              <ReportDashboard
                ref={reportDashboardRef}
                simulationData={simulationParams}
                nodes={nodes}
                weakNodes={weakNodes}
                onReconstruct={handleReconstruct}
                onUpdateNodeIp={updateNodeIp}
                isUpdating={isReportUpdating}
              />
          </div>
          )}
      </div>
      <SaveNetworkModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          initialContent={networkDataToSave}
          onSave={performSave}
      />
    </>
  );
};

export default VisualBuilderWorkspace;