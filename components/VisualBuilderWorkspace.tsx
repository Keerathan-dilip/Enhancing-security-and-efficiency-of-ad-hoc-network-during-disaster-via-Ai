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

  // New states for real-time updates and message simulation
  const [hasAnalyzedOnce, setHasAnalyzedOnce] = useState(false);
  const [isReportUpdating, setIsReportUpdating] = useState(false);
  const [packetMessage, setPacketMessage] = useState('This is a test packet transmission. Data integrity check: SUCCESS.');
  const [deliveredPackets, setDeliveredPackets] = useState<DeliveredPacketInfo[]>([]);
  const analysisDownloadRef = useRef<HTMLDivElement>(null);
  const reportDashboardRef = useRef<HTMLDivElement>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  // State for new features
  const [isolatedMaliciousNodeIds, setIsolatedMaliciousNodeIds] = useState<string[]>([]);
  const [droppedPacketEvents, setDroppedPacketEvents] = useState<{ id: string, x: number, y: number }[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [networkDataToSave, setNetworkDataToSave] = useState('');


  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setSimulationParams(null);
    setInsights(null);
    setAnimatedPackets([]);
    setSelectedConnectionId(null);
    setHasAnalyzedOnce(false);
    setIsolatedMaliciousNodeIds([]);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

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
    }, 500); // Debounce for 500ms

    return () => {
        clearTimeout(handler);
        setIsReportUpdating(false);
    };
  }, [nodes, connections, hasAnalyzedOnce]);

  const deleteSelectedConnection = useCallback(() => {
    if (selectedConnectionId) {
        setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
        setSelectedConnectionId(null);
    }
  }, [selectedConnectionId, setConnections]);

    const deleteSelectedNode = useCallback(() => {
        if (selectedNodeId) {
            setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
            setConnections(prev => prev.filter(c => c.from !== selectedNodeId && c.to !== selectedNodeId));
            setSelectedNodeId(null);
        }
    }, [selectedNodeId, setNodes, setConnections]);

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
                    const fromNodeIndex = nodes.indexOf(fromNode) + 1;
                    const toNodeIndex = nodes.indexOf(toNode) + 1;
                    const fullPath = p.path.map(nodeId => `Node ${nodes.findIndex(n => n.id === nodeId) + 1}`);
                    
                    const isDropped = p.path.some(nodeId => maliciousNodes.includes(nodeId));

                    setDeliveredPackets(prev => [...prev, {
                        id: `log-${p.id}-${Date.now()}`,
                        from: `Node ${fromNodeIndex}`, to: `Node ${toNodeIndex}`,
                        message: p.message!, path: fullPath, status: isDropped ? 'dropped' : 'delivered'
                    }]);
                }
            }
            // Removed traditional packet logging as per user request
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
    
    const maliciousNodeIds = nodes.filter(n => n.isMalicious).map(n => n.id);
    const pathAI = pathfindingService.findShortestPath(packetSimSourceNode, nodeId, nodes, connections, maliciousNodeIds);
    const pathTrad = pathfindingService.findShortestPath(packetSimSourceNode, nodeId, nodes, connections);

    const newPackets: AnimatedPacket[] = [];
    if (pathAI) {
        newPackets.push({
            id: `sim-packet-ai-${Date.now()}`, path: pathAI, progress: 0, color: '#22d3ee',
            startTime: performance.now(), duration: PACKET_SIMULATION_DURATION, message: packetMessage
        });
    }
    if (pathTrad) {
         newPackets.push({
            id: `sim-packet-trad-${Date.now()}`, path: pathTrad, progress: 0, color: '#f97316',
            startTime: performance.now(), duration: PACKET_SIMULATION_DURATION, message: packetMessage
        });
    }
    
    if (newPackets.length > 0) {
        setAnimatedPackets(prev => [...prev, ...newPackets]);
        ensureAnimationLoop();
    } else {
        alert("No path found between the selected nodes. A switch may be disabled or the network may be disconnected.");
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
    includeSwitches: boolean
  ) => {
    if (count <= 0) return;
    if (count > 450) {
      alert('The maximum number of nodes is 450.');
      return;
    }

    clearAnalysis();
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
    
    // Generic infrastructure placement
    const numRouters = includeRouters ? Math.max(1, Math.floor(count / 25)) : 0;
    const numSwitches = includeSwitches ? Math.max(1, Math.floor(count / 30)) : 0;
    const numEndNodes = count - numRouters - numSwitches;

    if (topology === 'random' || topology === 'mesh') {
        for (let i = 0; i < numEndNodes; i++) newNodes.push(createNode(i, Math.random() * canvasWidth + padding / 2, Math.random() * canvasHeight + padding / 2));
        for (let i = 0; i < numRouters; i++) newNodes.push(createNode(numEndNodes + i, Math.random() * canvasWidth + padding / 2, Math.random() * canvasHeight + padding / 2, NetworkComponentType.ROUTER));
        for (let i = 0; i < numSwitches; i++) newNodes.push(createNode(numEndNodes + numRouters + i, Math.random() * canvasWidth + padding / 2, Math.random() * canvasHeight + padding / 2, NetworkComponentType.SWITCH));
        
        // Connect infrastructure first, then connect nodes to nearest infra/node
        const infraNodes = newNodes.filter(n => n.type !== NetworkComponentType.NODE);
        const endNodes = newNodes.filter(n => n.type === NetworkComponentType.NODE);

        // Connect infra to each other
        for (let i = 0; i < infraNodes.length; i++) {
            for (let j = i + 1; j < infraNodes.length; j++) {
                newConnections.push({ id: `${infraNodes[i].id}-${infraNodes[j].id}-${Date.now()}`, from: infraNodes[i].id, to: infraNodes[j].id });
            }
        }
        
        // Connect end nodes
        endNodes.forEach(node => {
            const potentialTargets = [...infraNodes, ...endNodes.filter(n => n.id !== node.id)];
            if(potentialTargets.length === 0) return;
            potentialTargets.sort((a, b) => (Math.hypot(a.x - node.x, a.y - node.y) - Math.hypot(b.x - node.x, b.y - node.y)));
            const target = potentialTargets[0];
            newConnections.push({ id: `${node.id}-${target.id}-${Date.now()}`, from: node.id, to: target.id });
        });

        if (topology === 'mesh') { // Add more connections for mesh
            const K_NEAREST = 3;
            newNodes.forEach(sourceNode => {
                const distances = newNodes
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
        const cols = Math.ceil(Math.sqrt(count * (canvasWidth / canvasHeight)));
        const rows = Math.ceil(count / cols);
        const xSpacing = canvasWidth / (cols + 1);
        const ySpacing = canvasHeight / (rows + 1);
        let routerPlaced = 0;

        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = (col + 1) * xSpacing;
            const y = (row + 1) * ySpacing;

            // Place routers at intersections
            if (includeRouters && routerPlaced < numRouters && row > 0 && col > 0 && row < rows -1 && col < cols - 1 && (row % 3 === 1 && col % 3 === 1)) {
                 newNodes.push(createNode(i, x, y, NetworkComponentType.ROUTER));
                 routerPlaced++;
            } else {
                 newNodes.push(createNode(i, x, y));
            }
        }
    } else if (topology === 'cluster') {
        const numClusters = Math.max(2, Math.ceil(count / 50));
        let nodesPlaced = 0;
        
        for (let c = 0; c < numClusters; c++) {
            const clusterCenterX = (Math.random() * 0.6 + 0.2) * canvasWidth;
            const clusterCenterY = (Math.random() * 0.6 + 0.2) * canvasHeight;
            const clusterRadius = Math.min(canvasWidth, canvasHeight) / (numClusters * 1.5);

            let clusterHub: Node | null = null;
            if (includeRouters && numRouters > c) {
                clusterHub = createNode(count + c, clusterCenterX, clusterCenterY, NetworkComponentType.ROUTER);
                newNodes.push(clusterHub);
            }
            
            const nodesInThisCluster = Math.ceil((count - numRouters) / numClusters);
            for (let i = 0; i < nodesInThisCluster && nodesPlaced < (count - numRouters); i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * clusterRadius;
                const node = createNode(nodesPlaced, clusterCenterX + Math.cos(angle) * radius, clusterCenterY + Math.sin(angle) * radius);
                newNodes.push(node);
                if (clusterHub) {
                    newConnections.push({ id: `${node.id}-${clusterHub.id}-${Date.now()}`, from: node.id, to: clusterHub.id });
                }
                nodesPlaced++;
            }
        }
        // Connect routers
        const routers = newNodes.filter(n => n.type === NetworkComponentType.ROUTER);
        for(let i=0; i < routers.length -1; i++) {
            newConnections.push({ id: `${routers[i].id}-${routers[i+1].id}-${Date.now()}`, from: routers[i].id, to: routers[i+1].id });
        }

    } else if (topology === 'cluster-mesh') {
        const numClusters = Math.max(2, Math.ceil(count / 30));
        let nodesPlaced = 0;
        const clusterHubs: Node[] = [];
        const allClusterNodes: Node[][] = [];

        const numEndNodesToPlace = count - (includeRouters ? Math.min(numClusters, numRouters) : 0);

        for (let c = 0; c < numClusters; c++) {
            const clusterCenterX = (Math.random() * 0.6 + 0.2) * canvasWidth;
            const clusterCenterY = (Math.random() * 0.6 + 0.2) * canvasHeight;
            const clusterRadius = Math.min(canvasWidth, canvasHeight) / (numClusters * 1.8);
            
            const nodesInThisCluster: Node[] = [];

            if (includeRouters && clusterHubs.length < numRouters) {
                const clusterHub = createNode(count + c, clusterCenterX, clusterCenterY, NetworkComponentType.ROUTER);
                newNodes.push(clusterHub);
                clusterHubs.push(clusterHub);
                nodesInThisCluster.push(clusterHub);
            }
            
            const nodesForThisCluster = Math.ceil(numEndNodesToPlace / numClusters);
            for (let i = 0; i < nodesForThisCluster && nodesPlaced < numEndNodesToPlace; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * clusterRadius;
                const node = createNode(nodesPlaced, clusterCenterX + Math.cos(angle) * radius, clusterCenterY + Math.sin(angle) * radius);
                newNodes.push(node);
                nodesInThisCluster.push(node);
                nodesPlaced++;
            }
            allClusterNodes.push(nodesInThisCluster);
        }

        // Create intra-cluster mesh connections
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

        // Connect cluster hubs
        for(let i = 0; i < clusterHubs.length; i++) {
            for (let j = i + 1; j < clusterHubs.length; j++) {
                newConnections.push({ id: `${clusterHubs[i].id}-${clusterHubs[j].id}-${Date.now()}`, from: clusterHubs[i].id, to: clusterHubs[j].id });
            }
        }
    } else if (topology === 'ring' || topology === 'bus') {
        const centerX = canvasWidth / 2 + padding / 2;
        const centerY = canvasHeight / 2 + padding / 2;

        if (topology === 'ring') {
            const radius = Math.min(canvasWidth, canvasHeight) / 2 - padding;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * 2 * Math.PI;
                newNodes.push(createNode(i, centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)));
            }
            for (let i = 0; i < count; i++) newConnections.push({ id: `conn-${i}-${Date.now()}`, from: newNodes[i].id, to: newNodes[(i + 1) % count].id });
        } else { // Bus
            const xSpacing = canvasWidth / (count + 1);
            for (let i = 0; i < count; i++) newNodes.push(createNode(i, (i + 1) * xSpacing + padding / 2, centerY));
            for (let i = 0; i < count - 1; i++) newConnections.push({ id: `conn-${i}-${Date.now()}`, from: newNodes[i].id, to: newNodes[i + 1].id });
        }
        // Optionally connect ring/bus to an external router
        if (includeRouters && count > 0) {
            const router = createNode(count, centerX, padding, NetworkComponentType.ROUTER);
            newNodes.push(router);
            newConnections.push({ id: `${router.id}-${newNodes[0].id}-${Date.now()}`, from: router.id, to: newNodes[0].id });
        }

    } else if (topology === 'star') {
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
  }, [nodes, setConnections]);

  const handleRouterAutoConnect = useCallback((routerId: string) => {
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
    }, [nodes, connections, setConnections]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setIsGeneratingInsights(true);
    setAnalysisResult(null);
    setSimulationParams(null);
    setInsights(null);
    setAnimatedPackets([]);
    setIsConnectionMode(false);
    setIsPacketSimulationMode(false);
    setPacketSimSourceNode(null);

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

  }, [setNodes, setConnections, clearAnalysis]);


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
                  packetSimSourceNode={packetSimSourceNode}
                  animatedPackets={animatedPackets}
                  isolatedMaliciousNodeIds={isolatedMaliciousNodeIds}
                  droppedPacketEvents={droppedPacketEvents}
                  weakNodeIds={weakNodes.map(n => n.id)}
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