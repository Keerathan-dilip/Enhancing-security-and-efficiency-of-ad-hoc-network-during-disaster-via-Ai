
import React, { useState, useEffect } from 'react';
import { Node } from '../types';

interface PropertiesPanelProps {
  node: Node;
  onUpdate: (node: Node) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ node, onUpdate }) => {
  const [ipAddress, setIpAddress] = useState(node.ipAddress);
  const [energyEfficiency, setEnergyEfficiency] = useState(node.energyEfficiency.toString());
  const [energySpent, setEnergySpent] = useState(node.energySpent.toString());
  
  useEffect(() => {
    setIpAddress(node.ipAddress);
    setEnergyEfficiency(node.energyEfficiency.toString());
    setEnergySpent(node.energySpent.toString());
  }, [node]);

  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIpAddress(e.target.value);
    onUpdate({ ...node, ipAddress: e.target.value });
  };
  
  const handleEnergyEfficiencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEnergyEfficiency(val);
    if (!isNaN(parseInt(val))) {
      onUpdate({ ...node, energyEfficiency: parseInt(val) });
    }
  };

  const handleEnergySpentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEnergySpent(val);
    if (!isNaN(parseInt(val))) {
      onUpdate({ ...node, energySpent: parseInt(val) });
    }
  };

  return (
    <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 space-y-4 animate-fadeIn">
      <h3 className="text-lg font-bold text-cyan-300">Properties: <span className='text-sm text-white'>{node.id}</span></h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">IP Address</label>
          <input
            type="text"
            value={ipAddress}
            onChange={handleIpChange}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Energy Efficiency (%)</label>
          <input
            type="number"
            value={energyEfficiency}
            onChange={handleEnergyEfficiencyChange}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Energy Spent (J)</label>
          <input
            type="number"
            value={energySpent}
            onChange={handleEnergySpentChange}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
