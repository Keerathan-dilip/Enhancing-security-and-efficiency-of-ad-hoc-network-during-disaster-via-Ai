import React from 'react';
import { Connection, Node } from '../types';

interface ConnectionPanelProps {
  connection: Connection;
  nodes: Node[];
  onDelete: () => void;
}

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ connection, nodes, onDelete }) => {
  const fromNode = nodes.find(n => n.id === connection.from);
  const toNode = nodes.find(n => n.id === connection.to);
  
  const fromNodeIndex = fromNode ? nodes.findIndex(n => n.id === fromNode.id) + 1 : '?';
  const toNodeIndex = toNode ? nodes.findIndex(n => n.id === toNode.id) + 1 : '?';

  return (
    <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 space-y-4 animate-fadeIn">
      <h3 className="text-lg font-bold text-cyan-300">Connection Properties</h3>
      <div className="space-y-3 text-sm">
        <p>
          <span className="font-semibold text-gray-300">From:</span>
          <span className="text-white ml-2">Node {fromNodeIndex} ({fromNode?.type.replace('_', ' ').toLowerCase()})</span>
        </p>
        <p>
          <span className="font-semibold text-gray-300">To:</span>
          <span className="text-white ml-2">Node {toNodeIndex} ({toNode?.type.replace('_', ' ').toLowerCase()})</span>
        </p>
      </div>
      <p className="text-xs text-gray-400">Press the 'Delete' key or click the button below to remove this connection.</p>
      <button
        onClick={onDelete}
        className="w-full px-5 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-all duration-300 flex items-center justify-center space-x-2"
        aria-label={`Delete connection between Node ${fromNodeIndex} and Node ${toNodeIndex}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span>Delete Connection</span>
      </button>
    </div>
  );
};

export default ConnectionPanel;
