import React, { useState } from 'react';
import { NetworkComponentType, NetworkTopology } from '../types';
import { NodeIcon } from './NodeIcon';

interface ToolbarProps {
  onAnalyze: () => void;
  isAnalyzing: boolean;
  nodeCount: number;
  onGenerateNetwork: (count: number, topology: NetworkTopology, includeRouters: boolean, includeSwitches: boolean) => void;
  isConnectionMode: boolean;
  onToggleConnectionMode: () => void;
  isPacketSimulationMode: boolean;
  onTogglePacketSimulationMode: () => void;
  onAutoConnect: (k: number) => void;
  onDownloadReport: () => void;
  analysisPerformed: boolean;
  isDownloadingReport: boolean;
}

const Tool: React.FC<{ type: NetworkComponentType, onDragStart: (e: React.DragEvent, type: NetworkComponentType) => void }> = ({ type, onDragStart }) => {
  const typeName = type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className="flex items-center space-x-3 p-2 bg-gray-700 rounded-lg cursor-grab hover:bg-cyan-500/30 transition-all duration-200 border border-transparent hover:border-cyan-400"
    >
      <div className="w-8 h-8 flex items-center justify-center">
        <NodeIcon type={type} />
      </div>
      <span className="font-medium text-sm">{typeName}</span>
    </div>
  );
};

const TOPOLOGY_INFO: Record<NetworkTopology, string> = {
  cluster: 'Groups of nodes. Efficient for scalability. (e.g., ZRP, LEACH)',
  mesh: 'Highly connected nodes. Robust and reliable. (e.g., AODV, DSR)',
  ring: 'Nodes in a loop. Orderly but single point of failure. (e.g., Token Ring)',
  bus: 'Nodes on a shared line. Simple but can have collisions. (e.g., CSMA/CD)',
  grid: 'Nodes in a uniform grid layout. Structured and predictable.',
  random: 'Nodes placed randomly. Simulates unpredictable environments.',
  star: 'All nodes connect to a central hub. Simple but has a single point of failure.',
};


const Toolbar: React.FC<ToolbarProps> = ({ 
    onAnalyze, 
    isAnalyzing, 
    nodeCount, 
    onGenerateNetwork, 
    isConnectionMode, 
    onToggleConnectionMode, 
    isPacketSimulationMode,
    onTogglePacketSimulationMode,
    onAutoConnect,
    onDownloadReport,
    analysisPerformed,
    isDownloadingReport,
}) => {
  const [generateCount, setGenerateCount] = useState(50);
  const [topology, setTopology] = useState<NetworkTopology>('cluster');
  const [kNeighbors, setKNeighbors] = useState(2);
  const [includeRouters, setIncludeRouters] = useState(true);
  const [includeSwitches, setIncludeSwitches] = useState(false);
    
  const handleDragStart = (e: React.DragEvent, type: NetworkComponentType) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGenerate = () => {
      if(generateCount > 450) {
          alert('Maximum number of nodes is 450.');
          return;
      }
      onGenerateNetwork(generateCount, topology, includeRouters, includeSwitches);
  }

  return (
    <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-cyan-300">Components</h3>
        <p className="text-xs text-gray-400 mb-2">Drag to canvas to add</p>
        <div className="space-y-2">
            <Tool type={NetworkComponentType.NODE} onDragStart={handleDragStart}/>
            <Tool type={NetworkComponentType.ROUTER} onDragStart={handleDragStart}/>
            <Tool type={NetworkComponentType.SWITCH} onDragStart={handleDragStart}/>
            <Tool type={NetworkComponentType.BASE_STATION} onDragStart={handleDragStart}/>
        </div>
      </div>
      
      <div className="pt-4 border-t border-cyan-500/20">
        <h3 className="text-lg font-bold text-cyan-300 mb-2">Network Generator</h3>
        <div className="space-y-3">
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Number of Nodes (max 450)</label>
                <input
                    type="number"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(Math.max(0, parseInt(e.target.value, 10)))}
                    max="450"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    aria-label="Number of nodes to generate"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Topology</label>
                <select 
                    value={topology}
                    onChange={(e) => setTopology(e.target.value as NetworkTopology)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    aria-label="Network topology for generation"
                >
                    <option value="cluster">Cluster</option>
                    <option value="mesh">Mesh</option>
                    <option value="star">Star</option>
                    <option value="ring">Ring</option>
                    <option value="bus">Bus</option>
                    <option value="grid">Grid</option>
                    <option value="random">Random</option>
                </select>
                <p className="text-xs text-gray-400 mt-1 h-10">{TOPOLOGY_INFO[topology]}</p>
             </div>
             <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={includeRouters} onChange={e => setIncludeRouters(e.target.checked)} className="form-checkbox h-4 w-4 text-cyan-600 bg-gray-700 border-gray-500 rounded focus:ring-cyan-500" />
                    <span className="text-sm text-gray-300">Include Routers</span>
                </label>
                 <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={includeSwitches} onChange={e => setIncludeSwitches(e.target.checked)} className="form-checkbox h-4 w-4 text-cyan-600 bg-gray-700 border-gray-500 rounded focus:ring-cyan-500" />
                    <span className="text-sm text-gray-300">Include Switches</span>
                </label>
             </div>
             <button
                onClick={handleGenerate}
                className="w-full px-5 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-all duration-300 flex items-center justify-center space-x-2"
             >
                <span>Generate Network</span>
             </button>
        </div>
      </div>

       <div className="pt-4 border-t border-cyan-500/20">
        <h3 className="text-lg font-bold text-cyan-300 mb-2">Actions</h3>
        <div className="space-y-3">
            <button
                onClick={onToggleConnectionMode}
                className={`w-full px-5 py-2.5 font-bold rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
                    isConnectionMode 
                        ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-600' 
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                }`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                </svg>
                <span>{isConnectionMode ? 'Exit Connection Mode' : 'Connect Nodes'}</span>
            </button>
             <button
                onClick={onTogglePacketSimulationMode}
                disabled={nodeCount < 2}
                className={`w-full px-5 py-2.5 font-bold rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 disabled:bg-gray-500 disabled:cursor-not-allowed ${
                    isPacketSimulationMode 
                        ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-600' 
                        : 'bg-teal-500 text-white hover:bg-teal-600'
                }`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                <span>{isPacketSimulationMode ? 'Cancel Simulation' : 'Simulate Packet Flow'}</span>
            </button>
        </div>

        <div className="mt-4">
            <label htmlFor="k-neighbors" className="block text-sm font-medium text-gray-300 mb-1">Auto-Connect Nearest</label>
            <div className="flex items-center space-x-2">
                <input
                    id="k-neighbors"
                    type="number"
                    value={kNeighbors}
                    onChange={(e) => setKNeighbors(Math.max(1, parseInt(e.target.value, 10)) || 1)}
                    min="1"
                    max={nodeCount > 1 ? nodeCount - 1 : 1}
                    className="w-1/3 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    aria-label="Number of nearest neighbors to connect"
                    disabled={nodeCount < 2}
                />
                <button
                    onClick={() => onAutoConnect(kNeighbors)}
                    disabled={nodeCount < 2}
                    className="flex-grow px-4 py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-all duration-300 flex items-center justify-center space-x-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    <span>Connect</span>
                </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Replaces all existing connections.</p>
        </div>
      </div>

      <div className="pt-4 border-t border-cyan-500/20 space-y-3">
         <button
            onClick={onAnalyze}
            disabled={isAnalyzing || nodeCount < 2}
            className="w-full px-5 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
            {isAnalyzing ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
            )}
            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Network'}</span>
        </button>
        <button
            onClick={onDownloadReport}
            disabled={!analysisPerformed || isDownloadingReport}
            className="w-full px-5 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
            {isDownloadingReport ? (
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            )}
            <span>{isDownloadingReport ? 'Generating...' : 'Download Full Report'}</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;