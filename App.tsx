
import React, { useState } from 'react';
import { Workspace } from './types';
import CodeEditorWorkspace from './components/CodeEditorWorkspace';
import VisualBuilderWorkspace from './components/VisualBuilderWorkspace';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';

const App: React.FC = () => {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(Workspace.VISUAL);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-cyan-500/20 p-4 shadow-lg flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.5 12h17"></path></svg>
          <h1 className="text-2xl font-bold text-cyan-300 tracking-wider">Ad Hoc Network Simulator</h1>
        </div>
        <WorkspaceSwitcher activeWorkspace={activeWorkspace} setActiveWorkspace={setActiveWorkspace} />
      </header>

      <main className="flex-grow p-4 lg:p-6">
        {activeWorkspace === Workspace.CODE && <CodeEditorWorkspace />}
        {activeWorkspace === Workspace.VISUAL && <VisualBuilderWorkspace />}
      </main>
    </div>
  );
};

export default App;
