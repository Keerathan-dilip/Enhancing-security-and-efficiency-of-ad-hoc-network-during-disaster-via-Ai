import React, { useState, MouseEvent, forwardRef } from 'react';
import { Node, Connection, NetworkComponentType, AnimatedPacket } from '../types';
import { NodeIcon } from './NodeIcon';

interface NetworkCanvasProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  selectedConnectionId: string | null;
  setSelectedConnectionId: (id: string | null) => void;
  onAddComponent: (type: NetworkComponentType, x: number, y: number) => void;
  isConnectionMode: boolean;
  isPacketSimulationMode: boolean;
  onNodeClickForSimulation: (id: string) => void;
  packetSimSourceNodes: string[];
  animatedPackets: AnimatedPacket[];
  isolatedMaliciousNodeIds: string[];
  droppedPacketEvents: { id: string, x: number, y: number }[];
  weakNodeIds: string[];
  clusterHeadIds: string[];
  saveSnapshot: () => void;
  zoom: number;
}

const NetworkCanvas = forwardRef<HTMLDivElement, NetworkCanvasProps>(({
  nodes,
  setNodes,
  connections,
  setConnections,
  selectedNodeIds,
  setSelectedNodeIds,
  selectedConnectionId,
  setSelectedConnectionId,
  onAddComponent,
  isConnectionMode,
  isPacketSimulationMode,
  onNodeClickForSimulation,
  packetSimSourceNodes,
  animatedPackets,
  isolatedMaliciousNodeIds,
  droppedPacketEvents,
  weakNodeIds,
  clusterHeadIds,
  saveSnapshot,
  zoom,
}, ref) => {
  const [dragOffsets, setDragOffsets] = useState<Map<string, {offsetX: number, offsetY: number}>>(new Map());
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectingLine, setConnectingLine] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPacketId, setHoveredPacketId] = useState<string | null>(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);

  const canvasStyle = {
    width: '3000px',
    height: '2000px',
    backgroundColor: '#111827', // bg-gray-900
    backgroundImage: 'radial-gradient(rgba(55, 65, 81, 0.5) 1px, transparent 0)', // gray-600 with opacity
    backgroundSize: '25px 25px',
    transform: `scale(${zoom})`,
    transformOrigin: 'top left',
    transition: 'transform 0.1s ease-out',
  };

  const handleConnectionClick = (e: MouseEvent, connectionId: string) => {
    e.stopPropagation();
    setSelectedConnectionId(connectionId);
    setSelectedNodeIds([]);
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    if (isPacketSimulationMode) {
      onNodeClickForSimulation(id);
      return;
    }

    const canvasEl = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    if (isConnectionMode) {
        if (isConnecting) {
            if(isConnecting !== id) {
                const exists = connections.some(c => (c.from === isConnecting && c.to === id) || (c.from === id && c.to === isConnecting));
                if (!exists) {
                    saveSnapshot();
                    setConnections(prev => [...prev, { id: `${isConnecting}-${id}-${Date.now()}`, from: isConnecting, to: id }]);
                }
            }
            setIsConnecting(null);
            setConnectingLine(null);
        } else {
            setIsConnecting(id);
            setSelectedNodeIds([]);
            setSelectedConnectionId(null);
        }
    } else {
        setSelectedConnectionId(null);
        
        const isAlreadySelected = selectedNodeIds.includes(id);
        let newSelection = selectedNodeIds;

        if (e.shiftKey) {
            newSelection = isAlreadySelected 
                ? selectedNodeIds.filter(nid => nid !== id) 
                : [...selectedNodeIds, id];
            setSelectedNodeIds(newSelection);
        } else if (!isAlreadySelected) {
            newSelection = [id];
            setSelectedNodeIds(newSelection);
        }

        const newOffsets = new Map<string, {offsetX: number, offsetY: number}>();
        nodes.forEach(n => {
            if (newSelection.includes(n.id)) {
                newOffsets.set(n.id, { offsetX: mouseX - n.x, offsetY: mouseY - n.y });
            }
        });
        setDragOffsets(newOffsets);
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const canvasEl = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;

    if (dragOffsets.size > 0) {
      setNodes(prevNodes => prevNodes.map(n => {
        if (dragOffsets.has(n.id)) {
          const offset = dragOffsets.get(n.id)!;
          let x = mouseX - offset.offsetX;
          let y = mouseY - offset.offsetY;
          
          const nodeSize = 40;
          x = Math.max(nodeSize / 2, Math.min(x, 3000 - nodeSize / 2));
          y = Math.max(nodeSize / 2, Math.min(y, 2000 - nodeSize / 2));

          return { ...n, x, y };
        }
        return n;
      }));
    }

    if (isConnecting) {
        setConnectingLine({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUp = () => {
    setDragOffsets(new Map());
  };
  
  const handleMouseLeave = () => {
    setDragOffsets(new Map());
    if (isConnecting) {
      setIsConnecting(null);
      setConnectingLine(null);
    }
  };
  
  const handleCanvasClick = () => {
    if (!isConnectionMode && !isPacketSimulationMode) {
        setSelectedNodeIds([]);
        setSelectedConnectionId(null);
    }
    setIsConnecting(null);
    setConnectingLine(null);
  }
  
  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow') as NetworkComponentType;
    const canvasEl = (ref as React.RefObject<HTMLDivElement>)?.current;
    
    if (typeof type === 'undefined' || !type || !canvasEl) {
      return;
    }

    const rect = canvasEl.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    onAddComponent(type, x, y);
    setSelectedNodeIds([]);
    setSelectedConnectionId(null);
  };

  const getPacketPosition = (packet: AnimatedPacket) => {
    const totalSegments = packet.path.length - 1;
    if (totalSegments <= 0) return null;

    const progressPerSegment = 1 / totalSegments;
    const currentSegmentIndex = Math.min(Math.floor(packet.progress / progressPerSegment), totalSegments - 1);
    const progressInSegment = (packet.progress % progressPerSegment) / progressPerSegment;

    const fromNodeId = packet.path[currentSegmentIndex];
    const toNodeId = packet.path[currentSegmentIndex + 1];

    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode = nodes.find(n => n.id === toNodeId);

    if (!fromNode || !toNode) return null;

    const x = fromNode.x + (toNode.x - fromNode.x) * progressInSegment;
    const y = fromNode.y + (toNode.y - fromNode.y) * progressInSegment;

    return { x, y };
  };

  return (
    <div
      ref={ref}
      className="relative"
      style={canvasStyle}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleCanvasClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
        {isConnectionMode && (
            <div className='absolute top-2 left-3 text-sm text-yellow-300 bg-gray-900/70 backdrop-blur-sm px-3 py-1 rounded-lg animate-pulse z-10'
                 aria-live="polite" style={{ transform: `scale(${1/zoom})`, transformOrigin: 'top left'}}>
                Connection Mode Active: Click two nodes to connect them.
            </div>
        )}
        {isPacketSimulationMode && (
            <div className='absolute top-2 left-3 text-sm text-yellow-300 bg-gray-900/70 backdrop-blur-sm px-3 py-1 rounded-lg z-10'
                    aria-live="polite" style={{ transform: `scale(${1/zoom})`, transformOrigin: 'top left'}}>
                Click a node to send a packet to the Base Station. Click again to deselect.
            </div>
        )}
      <svg className="absolute top-0 left-0 w-full h-full">
         <style>{`
          @keyframes pulse {
            0%, 100% { stroke-opacity: 1; }
            50% { stroke-opacity: 0.7; }
          }
          .connection-selected {
            animation: pulse 2s infinite ease-in-out;
          }
          @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
          .dropped-packet-indicator {
            animation: fadeInOut 1s ease-in-out;
          }
        `}</style>
        {/* Render connection preview line */}
        {isConnecting && connectingLine && (() => {
            const fromNode = nodes.find(n => n.id === isConnecting);
            if (!fromNode) return null;
            return (
                <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={connectingLine.x}
                    y2={connectingLine.y}
                    stroke="#22d3ee"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                    className="pointer-events-none"
                />
            );
        })()}
        {/* Render established connections */}
        {connections.map(conn => {
          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          if (!fromNode || !toNode) return null;
          
          const isFromSwitchDisabled = fromNode.type === NetworkComponentType.SWITCH && fromNode.isEnabled === false;
          const isToSwitchDisabled = toNode.type === NetworkComponentType.SWITCH && toNode.isEnabled === false;
          const isMaliciouslyIsolated = isolatedMaliciousNodeIds.includes(conn.from) || isolatedMaliciousNodeIds.includes(conn.to);
          const isDisabled = isFromSwitchDisabled || isToSwitchDisabled || isMaliciouslyIsolated;

          const isSelected = conn.id === selectedConnectionId;
          const isHovered = conn.id === hoveredConnectionId && !isSelected;
          const strokeColor = isDisabled ? '#6b7280' : (isSelected ? '#fde047' : '#67e8f9');
          const strokeOpacity = isDisabled ? 0.4 : (isSelected || isHovered ? 1 : 0.5);
          const strokeDash = isDisabled ? "5, 5" : undefined;
          const strokeWidth = isSelected ? 5 : (isHovered ? 4 : 2);

          return (
             <g key={conn.id} 
                onClick={(e) => handleConnectionClick(e, conn.id)} 
                onMouseEnter={() => setHoveredConnectionId(conn.id)}
                onMouseLeave={() => setHoveredConnectionId(null)}
                className="cursor-pointer">
                <line // Invisible thicker line for easier clicking
                    x1={fromNode.x} y1={fromNode.y}
                    x2={toNode.x} y2={toNode.y}
                    stroke="transparent"
                    strokeWidth="12"
                />
                <line // Visible line
                    x1={fromNode.x} y1={fromNode.y}
                    x2={toNode.x} y2={toNode.y}
                    stroke={strokeColor}
                    strokeOpacity={strokeOpacity}
                    strokeDasharray={strokeDash}
                    strokeWidth={strokeWidth}
                    className={`transition-all duration-150 ${isSelected ? 'connection-selected' : ''}`}
                />
            </g>
          );
        })}

        {/* Render animated packets */}
        {animatedPackets.map(packet => {
          const pos = getPacketPosition(packet);
          if (!pos) return null;
          return (
            <g key={packet.id} onMouseEnter={() => setHoveredPacketId(packet.id)} onMouseLeave={() => setHoveredPacketId(null)}>
              <circle cx={pos.x} cy={pos.y} r="10" fill="transparent" className="cursor-pointer" />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={packet.isAttackPacket ? 3 : 6}
                fill={packet.color}
                stroke="white"
                strokeWidth={packet.isAttackPacket ? 0.5 : 1}
                className="pointer-events-none"
              >
                {!packet.isAttackPacket && <animate attributeName="r" values="6;8;6" dur="1s" repeatCount="indefinite" />}
              </circle>
            </g>
          );
        })}
        {/* Dropped packet indicators */}
        {droppedPacketEvents.map(event => (
            <text key={event.id} x={event.x} y={event.y} fill="#ef4444" fontSize="24" textAnchor="middle" dominantBaseline="middle" className="dropped-packet-indicator pointer-events-none">
                ✕
            </text>
        ))}
        {/* Tooltip for hovered packet */}
        {animatedPackets.map(packet => {
            if (packet.id !== hoveredPacketId || packet.isAttackPacket) return null;
            const pos = getPacketPosition(packet);
            if (!pos) return null;
            
            const fromNode = nodes.find(n => n.id === packet.path[0]);
            const toNode = nodes.find(n => n.id === packet.path[packet.path.length - 1]);
            const fromNodeIndex = fromNode ? nodes.indexOf(fromNode) + 1 : '?';
            const toNodeIndex = toNode ? nodes.indexOf(toNode) + 1 : '?';
            const durationInSeconds = (packet.duration / 1000).toFixed(1);

            const pathString = packet.path.map(nodeId => {
                const node = nodes.find(n => n.id === nodeId);
                const nodeIndex = node ? nodes.indexOf(node) + 1 : '?';
                return `Node ${nodeIndex}`;
            }).join(' → ');

            return (
                <foreignObject key={`tooltip-${packet.id}`} x={pos.x + 10} y={pos.y + 10} width="250" height="150" className="pointer-events-none">
                    <div className="bg-gray-900/80 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-2 text-white text-xs shadow-lg">
                        <p className="font-bold text-cyan-400">Packet In Transit</p>
                        <p><span className="font-semibold">From:</span> Node {fromNodeIndex}</p>
                        <p><span className="font-semibold">To:</span> Node {toNodeIndex}</p>
                        <p><span className="font-semibold">Est. Time:</span> {durationInSeconds}s</p>
                        <p><span className="font-semibold">Full Path:</span> {pathString}</p>
                        <p className="mt-1 font-semibold">Message:</p>
                        <p className="whitespace-pre-wrap break-words max-h-16 overflow-y-auto font-mono text-gray-300 text-[11px] bg-black/20 p-1 rounded">
                          {packet.message}
                        </p>
                    </div>
                </foreignObject>
            );
        })}
      </svg>
      {nodes.map((node, index) => {
        const isSelected = selectedNodeIds.includes(node.id) && !isConnectionMode && !isPacketSimulationMode;
        const isConnSource = isConnecting === node.id;
        const isSimSource = packetSimSourceNodes.includes(node.id);
        const isWeak = weakNodeIds.includes(node.id);
        const isClusterHead = clusterHeadIds.includes(node.id);
        return (
            <div
            key={node.id}
            className={`absolute w-10 h-10 transition-all duration-100 ${
                isConnectionMode || isPacketSimulationMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
            } ${
                isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-800' : ''
            } ${
                isConnSource ? 'animate-pulse ring-2 ring-green-400' : ''
            } ${
                isSimSource ? 'animate-pulse ring-2 ring-purple-400' : ''
            } rounded-full flex items-center justify-center`}
            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
            onMouseDown={e => handleMouseDown(e, node.id)}
            >
             {isClusterHead && (
                <div className="absolute inset-[-4px] rounded-full border-2 border-yellow-300 animate-pulse" title="Cluster Head"></div>
             )}
             {node.isMalicious && (
                <div className="absolute inset-0 rounded-full bg-red-500/50 animate-pulse"></div>
              )}
             {isWeak && !node.isMalicious && (
                <div className="absolute -inset-1 rounded-full border-2 border-orange-500 animate-pulse" title="Low Energy Efficiency"></div>
             )}
            <NodeIcon type={node.type} />
            <span 
                className={`absolute text-white text-xs font-bold pointer-events-none ${isClusterHead ? 'text-yellow-300' : ''}`} 
                style={{ textShadow: '0 0 3px black' }}>
                {index + 1}
            </span>
            </div>
        );
      })}
    </div>
  );
});

export default NetworkCanvas;