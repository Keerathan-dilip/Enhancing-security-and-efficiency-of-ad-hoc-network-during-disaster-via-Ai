
import React from 'react';
import { Workspace } from '../types';

interface WorkspaceSwitcherProps {
  activeWorkspace: Workspace;
  setActiveWorkspace: (workspace: Workspace) => void;
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ activeWorkspace, setActiveWorkspace }) => {
  const buttonStyle = "px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800";
  const activeStyle = "bg-cyan-500 text-white shadow-lg";
  const inactiveStyle = "bg-gray-700 text-gray-300 hover:bg-gray-600";

  return (
    <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
      <button
        onClick={() => setActiveWorkspace(Workspace.VISUAL)}
        className={`${buttonStyle} ${activeWorkspace === Workspace.VISUAL ? activeStyle : inactiveStyle}`}
      >
        Visual Builder
      </button>
      <button
        onClick={() => setActiveWorkspace(Workspace.CODE)}
        className={`${buttonStyle} ${activeWorkspace === Workspace.CODE ? activeStyle : inactiveStyle}`}
      >
        Code Editor
      </button>
    </div>
  );
};

export default WorkspaceSwitcher;
