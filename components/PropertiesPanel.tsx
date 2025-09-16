import React, { useState, useEffect } from 'react';
import { Node, NetworkComponentType } from '../types';

interface PropertiesPanelProps {
  node: Node;
  onUpdate: (node: Node) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ node, onUpdate }) => {
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
      <h3 className="text-lg font-bold text-cyan-300">Properties: <span className='text-sm text-white capitalize'>{node.type.replace('_', ' ').toLowerCase()}</span></h3>
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
    </div>
  );
};

export default PropertiesPanel;