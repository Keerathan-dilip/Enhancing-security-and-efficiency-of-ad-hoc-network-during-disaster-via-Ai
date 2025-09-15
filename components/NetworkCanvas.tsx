import React, { useState, MouseEvent, forwardRef } from 'react';
import { Node, Connection, NetworkComponentType } from '../types';
import { NodeIcon } from './NodeIcon';

interface NetworkCanvasProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  onAddComponent: (type: NetworkComponentType, x: number, y: number) => void;
}

const NetworkCanvas = forwardRef<HTMLDivElement, NetworkCanvasProps>(({
  nodes,
  setNodes,
  connections,
  setConnections,
  selectedNodeId,
  setSelectedNodeId,
  onAddComponent,
}, ref) => {
  const [draggingNode, setDraggingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectingLine, setConnectingLine] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    if (e.shiftKey) {
        if (isConnecting) {
            if(isConnecting !== id) {
                const exists = connections.some(c => (c.from === isConnecting && c.to === id) || (c.from === id && c.to === isConnecting));
                if (!exists) {
                    setConnections(prev => [...prev, { id: `${isConnecting}-${id}-${Date.now()}`, from: isConnecting, to: id }]);
                }
            }
            setIsConnecting(null);
            setConnectingLine(null);
        } else {
            setIsConnecting(id);
        }
    } else {
        setSelectedNodeId(id);
        const node = nodes.find(n => n.id === id);
        const canvasEl = (ref as React.RefObject<HTMLDivElement>)?.current;
        if (node && canvasEl) {
            const rect = canvasEl.getBoundingClientRect();
            setDraggingNode({ id, offsetX: e.clientX - rect.left - node.x, offsetY: e.clientY - rect.top - node.y });
        }
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const canvasEl = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggingNode) {
      let x = mouseX - draggingNode.offsetX;
      let y = mouseY - draggingNode.offsetY;
      
      const nodeSize = 40;
      x = Math.max(nodeSize / 2, Math.min(x, rect.width - nodeSize / 2));
      y = Math.max(nodeSize / 2, Math.min(y, rect.height - nodeSize / 2));

      setNodes(prev => prev.map(n => (n.id === draggingNode.id ? { ...n, x, y } : n)));
    }

    if (isConnecting) {
        setConnectingLine({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };
  
  const handleMouseLeave = () => {
    setDraggingNode(null);
    if (isConnecting) {
      setIsConnecting(null);
      setConnectingLine(null);
    }
  };
  
  const handleCanvasClick = () => {
    setSelectedNodeId(null);
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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onAddComponent(type, x, y);
  };


  return (
    <div
      ref={ref}
      className="w-full h-full bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleCanvasClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
        <div className='absolute top-2 left-3 text-xs text-gray-400'>
           Hold <kbd className='px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg'>Shift</kbd> and click two nodes to create a connection.
        </div>
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
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
                />
            );
        })()}
        {/* Render established connections */}
        {connections.map(conn => {
          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          if (!fromNode || !toNode) return null;
          return (
            <line
              key={conn.id}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="#67e8f9"
              strokeWidth="2"
              strokeOpacity="0.5"
            />
          );
        })}
      </svg>
      {nodes.map((node, index) => (
        <div
          key={node.id}
          className={`absolute w-10 h-10 cursor-grab active:cursor-grabbing transition-all duration-100 ${
            selectedNodeId === node.id ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-800' : ''
          } ${isConnecting === node.id ? 'animate-pulse ring-2 ring-green-400' : ''} rounded-full flex items-center justify-center`}
          style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
          onMouseDown={e => handleMouseDown(e, node.id)}
        >
          <NodeIcon type={node.type} />
          <span className="absolute text-white text-xs font-bold pointer-events-none" style={{ textShadow: '0 0 3px black' }}>
            {index + 1}
          </span>
        </div>
      ))}
    </div>
  );
});

export default NetworkCanvas;