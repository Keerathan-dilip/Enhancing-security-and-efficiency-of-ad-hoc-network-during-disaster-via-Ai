import React, { useRef } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
    LineChart, Line
} from 'recharts';
import { Node, SimulationParameters, NetworkComponentType } from '../types';
import IPConfigurationPanel from './IPConfigurationPanel';

interface ReportDashboardProps {
  simulationData: {
    'AI-Based': SimulationParameters;
    'Traditional': SimulationParameters;
  };
  nodes: Node[];
  weakNodes: Node[];
  onReconstruct: () => void;
  onUpdateNodeIp: (nodeId: string, ipAddress: string) => void;
}

type ChartType = 'pie' | 'line' | 'stat' | 'progress' | 'bar';

const PARAMETER_CONFIG: {
    key: keyof SimulationParameters;
    higherIsBetter: boolean;
    unit: string;
    displayName?: string;
    chartType: ChartType;
}[] = [
  { key: 'Packet Delivery Ratio', higherIsBetter: true, unit: '%', chartType: 'pie' },
  { key: 'End-to-end Delay (ms)', higherIsBetter: false, displayName: 'Responsiveness', unit: '(Higher is better)', chartType: 'line' },
  { key: 'Energy Consumption (J)', higherIsBetter: false, displayName: 'Energy Conservation', unit: '(Higher is better)', chartType: 'line' },
  { key: 'Network Lifetime (days)', higherIsBetter: true, unit: 'days', chartType: 'stat' },
  { key: 'Scalability Index', higherIsBetter: true, unit: '', chartType: 'progress' },
  { key: 'Computational Efficiency (ops/J)', higherIsBetter: true, unit: 'ops/J', chartType: 'bar' },
  { key: 'Energy Efficiency', higherIsBetter: true, unit: '%', chartType: 'pie' },
  { key: 'Robustness Index', higherIsBetter: true, unit: '', chartType: 'progress' },
  { key: 'Adaptability Rate', higherIsBetter: true, unit: '', chartType: 'progress' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-gray-800 border border-cyan-500 rounded-md shadow-lg">
          {payload.map((pld: any, index: number) => {
            const color = pld.stroke || pld.fill;
            const name = pld.name || label;
            return (
             <div key={index} style={{ color }}>{`${name}: ${pld.value.toFixed(2)}`}</div>
            )
          })}
        </div>
      );
    }
    return null;
};

const COLORS_AI = ['#22d3ee', '#374151'];
const COLORS_TRADITIONAL = ['#f97316', '#374151'];

const PieChartComponent: React.FC<{ data: any }> = ({ data }) => {
    const aiValue = data['AI-Based'] * 100;
    const traditionalValue = data['Traditional'] * 100;

    const aiPieData = [ { name: 'Value', value: aiValue }, { name: 'Remainder', value: 100 - aiValue }];
    const traditionalPieData = [ { name: 'Value', value: traditionalValue }, { name: 'Remainder', value: 100 - traditionalValue }];

    return (
        <div className="flex justify-around items-center h-full">
            <div className="w-1/2 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                        <Pie data={aiPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={45}>
                            {aiPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_AI[index % COLORS_AI.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-sm font-semibold text-cyan-300">AI: {aiValue.toFixed(1)}%</p>
            </div>
            <div className="w-1/2 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                        <Pie data={traditionalPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={45}>
                            {traditionalPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_TRADITIONAL[index % COLORS_TRADITIONAL.length]} />)}
                        </Pie>
                         <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                 <p className="text-center text-sm font-semibold text-orange-400">Traditional: {traditionalValue.toFixed(1)}%</p>
            </div>
        </div>
    );
};

const LineComparisonChart: React.FC<{ data: any }> = ({ data }) => {
    const chartData = [
        { name: 'Traditional', value: data['Traditional'] },
        { name: 'AI-Based', value: data['AI-Based'] }
    ];
    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#37415180'}} />
                <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} name="Performance Score" dot={{ r: 6, fill: '#facc15' }} activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};

const KeyStatDisplay: React.FC<{ data: any }> = ({ data }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="mb-4">
            <p className="text-4xl lg:text-5xl font-bold text-cyan-300">{data['AI-Based']}</p>
            <p className="text-sm font-medium text-cyan-500">AI-Based</p>
        </div>
        <div>
            <p className="text-2xl font-semibold text-orange-400">{data['Traditional']}</p>
            <p className="text-xs font-medium text-orange-600">Traditional</p>
        </div>
    </div>
);

const IndexProgress: React.FC<{ data: any }> = ({ data }) => {
    const aiValue = data['AI-Based'] * 100;
    const traditionalValue = data['Traditional'] * 100;
    return (
        <div className="flex flex-col justify-center h-full space-y-4 px-4">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-cyan-300">AI-Based</span>
                    <span className="text-xs font-semibold text-cyan-300">{aiValue.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-cyan-400 h-2.5 rounded-full" style={{ width: `${aiValue}%` }}></div>
                </div>
            </div>
            <div>
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-orange-400">Traditional</span>
                    <span className="text-xs font-semibold text-orange-400">{traditionalValue.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${traditionalValue}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const BarComparisonChart: React.FC<{ data: any }> = ({ data }) => (
     <ResponsiveContainer width="100%" height={250}>
        <BarChart data={[data]} layout="vertical" margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="name" type="category" tick={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #38bdf8' }} formatter={(value: number) => value.toPrecision(3)} />
            <Legend />
            <Bar dataKey="AI-Based" fill="#22d3ee" />
            <Bar dataKey="Traditional" fill="#f97316" />
        </BarChart>
    </ResponsiveContainer>
);


const UnifiedChart: React.FC<{ data: any; type: ChartType }> = ({ data, type }) => {
    switch (type) {
        case 'pie': return <PieChartComponent data={data} />;
        case 'line': return <LineComparisonChart data={data} />;
        case 'stat': return <KeyStatDisplay data={data} />;
        case 'progress': return <IndexProgress data={data} />;
        case 'bar': return <BarComparisonChart data={data} />;
        default: return null;
    }
};

const ReportDashboard: React.FC<ReportDashboardProps> = ({ simulationData, nodes, weakNodes, onReconstruct, onUpdateNodeIp }) => {
  const reportRef = useRef(null);
  
  const processedData = PARAMETER_CONFIG.map(config => {
    const aiValue = simulationData['AI-Based'][config.key as keyof SimulationParameters];
    const traditionalValue = simulationData['Traditional'][config.key as keyof SimulationParameters];

    let displayAiValue, displayTraditionalValue;

    if (config.higherIsBetter) {
      displayAiValue = aiValue;
      displayTraditionalValue = traditionalValue;
    } else {
      // Create an inverted "score" where higher is better for intuitive visualization
      displayAiValue = aiValue !== 0 ? 100 / aiValue : Infinity;
      displayTraditionalValue = traditionalValue !== 0 ? 100 / traditionalValue : Infinity;
    }
    
    return {
      name: config.displayName || config.key,
      unit: config.unit,
      chartType: config.chartType,
      'AI-Based': displayAiValue,
      'Traditional': displayTraditionalValue,
    };
  });


  const handleDownload = async () => {
    if (!reportRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const canvas = await html2canvas(reportRef.current, { backgroundColor: '#111827' }); // Match dark theme
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    let widthInPdf = pdfWidth - 40;
    let heightInPdf = widthInPdf / ratio;

    if (heightInPdf > pdfHeight - 40) {
        heightInPdf = pdfHeight - 40;
        widthInPdf = heightInPdf * ratio;
    }

    pdf.addImage(imgData, 'PNG', (pdfWidth-widthInPdf)/2, 20, widthInPdf, heightInPdf);
    pdf.save("network-simulation-report.pdf");
  };

  return (
    <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-6 mt-4 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-cyan-300">Detailed Performance Report</h2>
          <p className="text-sm text-gray-400 mt-1">Analysis based on the current network topology and node health.</p>
        </div>
        <button 
          onClick={handleDownload}
          className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all duration-300 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>Download Report</span>
        </button>
      </div>
      <div ref={reportRef} className="p-4 bg-gray-900 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {processedData.map((paramData) => (
                 <div key={paramData.name} className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg h-full flex flex-col min-h-[320px]">
                    <h3 className="text-md font-semibold text-center text-cyan-200 mb-1">{paramData.name}</h3>
                    <p className="text-xs text-center text-gray-400 mb-3 h-4">{paramData.unit}</p>
                    <div className="flex-grow">
                        <UnifiedChart data={paramData} type={paramData.chartType} />
                    </div>
                </div>
            ))}
        </div>
      </div>

       <div className="mt-8">
        <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Node Health & Details</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg">
                <h3 className="text-lg font-semibold text-cyan-200 mb-3">Node Energy Status</h3>
                <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-cyan-300 uppercase bg-gray-700/50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-4 py-2">Node ID</th>
                                <th scope="col" className="px-4 py-2">Type</th>
                                <th scope="col" className="px-4 py-2">Efficiency (%)</th>
                                <th scope="col" className="px-4 py-2">Spent (J)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nodes.map((node, index) => (
                                <tr key={node.id} className="border-b border-gray-700 hover:bg-gray-700/30">
                                    <td className="px-4 py-2 font-medium">Node {index + 1}</td>
                                    <td className="px-4 py-2 capitalize">{node.type.replace('_', ' ').toLowerCase()}</td>
                                    <td className={`px-4 py-2 ${node.type === NetworkComponentType.NODE && node.energyEfficiency < 85 ? 'text-red-400 font-bold' : 'text-green-400'}`}>{node.energyEfficiency}</td>
                                    <td className="px-4 py-2">{node.energySpent}</td>
                                </tr>
                            ))}
                            {nodes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-4 text-gray-500">No nodes in the network.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg border border-cyan-500/10 shadow-lg flex flex-col">
                <h3 className="text-lg font-semibold text-cyan-200 mb-3">Network Self-Healing</h3>
                {weakNodes.length > 0 ? (
                    <div className="flex-grow flex flex-col justify-between">
                        <div>
                            <p className="text-red-400 font-semibold mb-2">{weakNodes.length} weaker node(s) detected (efficiency &lt; 85%).</p>
                            <p className="text-sm text-gray-400 mb-4">Removing these nodes can improve overall network lifetime and performance. The network will attempt to reconstruct connections.</p>
                            <ul className="text-xs list-disc list-inside text-gray-400">
                                {weakNodes.map((node) => <li key={node.id}>Node {nodes.findIndex(n => n.id === node.id) + 1} (End device)</li>)}
                            </ul>
                        </div>
                        <button
                            onClick={onReconstruct}
                            className="mt-4 w-full px-5 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-all duration-300 flex items-center justify-center space-x-2"
                        >
                            <span>Remove Weaker Nodes & Reconstruct</span>
                        </button>
                    </div>
                ) : (
                      <div className="flex-grow flex items-center justify-center">
                        <p className="text-green-400 text-center">Network is healthy. No weak nodes detected.</p>
                      </div>
                )}
            </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-cyan-300 mb-4">Network Configuration</h2>
        <IPConfigurationPanel nodes={nodes} onUpdateNodeIp={onUpdateNodeIp} />
      </div>
    </div>
  );
};

export default ReportDashboard;