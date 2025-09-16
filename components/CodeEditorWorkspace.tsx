import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MOCK_CODE_CPP, MOCK_CODE_TCL, MOCK_CODE_AWK, SIMULATION_RESULTS } from '../constants';
import { SimulationParameters } from '../types';

type EditorType = 'cpp' | 'tcl' | 'awk';

const CodeEditorWorkspace: React.FC = () => {
  const [simulationData, setSimulationData] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeEditor, setActiveEditor] = useState<EditorType>('cpp');

  // Code states to make them editable
  const [cppCode, setCppCode] = useState(MOCK_CODE_CPP);
  const [tclCode, setTclCode] = useState(MOCK_CODE_TCL);
  const [awkCode, setAwkCode] = useState(MOCK_CODE_AWK);

  const runSimulation = () => {
    setIsRunning(true);
    setSimulationData(null);
    setTimeout(() => {
      const formattedData = Object.keys(SIMULATION_RESULTS['AI-Based']).map(key => ({
        name: key,
        'AI-Based': SIMULATION_RESULTS['AI-Based'][key as keyof SimulationParameters],
        'Traditional': SIMULATION_RESULTS['Traditional'][key as keyof SimulationParameters],
      }));
      setSimulationData(formattedData);
      setIsRunning(false);
    }, 1500);
  };

  const TabButton: React.FC<{ editorType: EditorType; label: string }> = ({ editorType, label }) => {
    const isActive = activeEditor === editorType;
    return (
      <button
        onClick={() => setActiveEditor(editorType)}
        className={`px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none ${
          isActive
            ? 'border-b-2 border-cyan-400 text-cyan-300'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-pressed={isActive}
      >
        {label}
      </button>
    );
  };


  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-fadeIn">
      <div className="lg:w-2/3 flex flex-col bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-cyan-300">Simulator Suite</h2>
            <button
            onClick={runSimulation}
            disabled={isRunning}
            className="px-5 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center space-x-2"
            >
            {isRunning ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            )}
            <span>{isRunning ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
        </div>
        
        <div className="border-b border-cyan-500/20 flex space-x-2" role="tablist" aria-label="Code Editors">
            <TabButton editorType="cpp" label="NS-3 C++" />
            <TabButton editorType="tcl" label="TCL Script" />
            <TabButton editorType="awk" label="AWK Script" />
        </div>

        <div className="flex-grow bg-gray-900 rounded-b-md overflow-auto font-mono text-sm h-96 lg:h-auto mt-[-1px]" role="tabpanel">
             {activeEditor === 'cpp' && (
                <textarea value={cppCode} onChange={(e) => setCppCode(e.target.value)} className="w-full h-full bg-transparent text-white resize-none focus:outline-none p-4" aria-label="C++ Code Editor" />
            )}
            {activeEditor === 'tcl' && (
                <textarea value={tclCode} onChange={(e) => setTclCode(e.target.value)} className="w-full h-full bg-transparent text-white resize-none focus:outline-none p-4" aria-label="TCL Script Editor" />
            )}
            {activeEditor === 'awk' && (
                <textarea value={awkCode} onChange={(e) => setAwkCode(e.target.value)} className="w-full h-full bg-transparent text-white resize-none focus:outline-none p-4" aria-label="AWK Script Editor" />
            )}
        </div>
      </div>
      <div className="lg:w-1/3 flex flex-col bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4">
        <h2 className="text-xl font-semibold text-cyan-300 mb-4">Simulation Results</h2>
        <div className="flex-grow flex items-center justify-center">
          {isRunning && <div className="text-lg">Running simulation, please wait...</div>}
          {!isRunning && !simulationData && <div className="text-lg text-gray-400">Click 'Run Simulation' to see results.</div>}
          {simulationData && (
             <ResponsiveContainer width="100%" height={500}>
                <BarChart data={simulationData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={200} tick={{ fill: '#d1d5db' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} cursor={{fill: '#374151'}} />
                    <Legend />
                    <Bar dataKey="AI-Based" fill="#22d3ee" />
                    <Bar dataKey="Traditional" fill="#f97316" />
                </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditorWorkspace;