import React, { useState, useEffect } from 'react';
import { Node, NetworkComponentType } from '../types';

interface PropertiesPanelProps {
  node: Node;
  onUpdate: (node: Node) => void;
  onRouterAutoConnect: (routerId: string) => void;
  onDeleteNode: () => void;
}

const ToggleSwitch: React.FC<{ labelId: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ labelId, checked, onChange }) => (
    <label htmlFor={labelId} className="relative inline-flex items-center cursor-pointer">
        <input 
            type="checkbox" 
            id={labelId} 
            className="sr-only peer" 
            checked={checked} 
            onChange={e => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
    </label>
);

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ node, onUpdate, onRouterAutoConnect, onDeleteNode }) => {
  const [ipAddress, setIpAddress] = useState(node.ipAddress);
  const [energyEfficiency, setEnergyEfficiency] = useState(node.energyEfficiency.toString());
  const [energySpent, setEnergySpent] = useState(node.energySpent.toString());
  const [packetForwardingCapacity, setPacketForwardingCapacity] = useState(node.packetForwardingCapacity?.toString() || '');
  const [portCount, setPortCount] = useState(node.portCount?.toString() || '');
  
  useEffect(() => {
    setIpAddress(node.ipAddress);
    setEnergyEfficiency(node.energyEfficiency.toString());
    setEnergySpent(node.energySpent.toString());
    setPacketForwardingCapacity(node.packetForwardingCapacity?.toString() || '');
    setPortCount(node.portCount?.toString() || '');
  }, [node]);

  const handleUpdate = (field: keyof Node, value: any) => {
    const updatedNode = { ...node, [field]: value };
    onUpdate(updatedNode);
  };

  const createNumericHandler = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    fieldName: keyof Node
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setter(val);
    const numVal = parseInt(val, 10);
    if (!isNaN(numVal)) {
      handleUpdate(fieldName, numVal);
    }
  };

  return (
    <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 space-y-4 animate-fadeIn">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-bold text-cyan-300">Properties: <span className='text-sm text-white capitalize'>{node.type.replace('_', ' ').toLowerCase()}</span></h3>
        <button 
            onClick={onDeleteNode}
            title="Delete Node"
            className="text-gray-400 hover:text-red-400 transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">IP Address</label>
          <input
            type="text"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            onBlur={() => handleUpdate('ipAddress', ipAddress)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Energy Efficiency (%)</label>
          <input
            type="number"
            value={energyEfficiency}
            onChange={createNumericHandler(setEnergyEfficiency, 'energyEfficiency')}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            disabled={node.type !== NetworkComponentType.NODE} // Only editable for standard nodes
          />
          {node.type !== NetworkComponentType.NODE && <p className="text-xs text-gray-400 mt-1">Efficiency is fixed for infrastructure components.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Energy Spent (J)</label>
          <input
            type="number"
            value={energySpent}
            onChange={createNumericHandler(setEnergySpent, 'energySpent')}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>
        {node.type === NetworkComponentType.ROUTER && (
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Packet Forwarding Capacity (pps)</label>
                <input
                    type="number"
                    value={packetForwardingCapacity}
                    onChange={createNumericHandler(setPacketForwardingCapacity, 'packetForwardingCapacity')}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
            </div>
        )}
        {node.type === NetworkComponentType.SWITCH && (
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Port Count</label>
                <input
                    type="number"
                    value={portCount}
                    onChange={createNumericHandler(setPortCount, 'portCount')}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
            </div>
        )}
      </div>

      {node.type === NetworkComponentType.NODE && (
         <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
            <label htmlFor={`malicious-status-${node.id}`} className="text-sm font-medium text-red-400">Malicious Status</label>
            <ToggleSwitch 
                labelId={`malicious-status-${node.id}`}
                checked={node.isMalicious ?? false} 
                onChange={(checked) => onUpdate({...node, isMalicious: checked })}
            />
        </div>
      )}
      {node.type === NetworkComponentType.ROUTER && (
        <div className="pt-4 border-t border-cyan-500/20">
             <h4 className="text-sm font-semibold text-gray-300 mb-2">Router Actions</h4>
             <button onClick={() => onRouterAutoConnect(node.id)} className="w-full px-4 py-2 bg-purple-500 text-white font-bold text-sm rounded-lg hover:bg-purple-600 transition-all duration-300">
                Connect 3 Nearest Nodes
             </button>
        </div>
      )}
      {node.type === NetworkComponentType.SWITCH && (
        <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
            <label htmlFor={`switch-enabled-${node.id}`} className="text-sm font-medium text-gray-300">Enabled</label>
            <ToggleSwitch 
                labelId={`switch-enabled-${node.id}`}
                checked={node.isEnabled ?? true} 
                onChange={(checked) => onUpdate({...node, isEnabled: checked })}
            />
        </div>
      )}
      {node.type === NetworkComponentType.BASE_STATION && (
        <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
            <label htmlFor={`station-receiver-${node.id}`} className="text-sm font-medium text-gray-300">Can Receive Packets</label>
            <ToggleSwitch 
                labelId={`station-receiver-${node.id}`}
                checked={node.isReceiver ?? true} 
                onChange={(checked) => onUpdate({...node, isReceiver: checked })}
            />
        </div>
      )}
      <div className="pt-4 border-t border-cyan-500/20">
        <button 
            onClick={onDeleteNode}
            className="w-full px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all duration-300 flex items-center justify-center space-x-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <span>Delete Node</span>
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;