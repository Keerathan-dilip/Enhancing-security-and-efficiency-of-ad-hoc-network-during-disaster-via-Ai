import React from 'react';

interface CodeDisplayProps {
  code: string;
  highlightedLine: number | null;
}

const CodeDisplay: React.FC<CodeDisplayProps> = ({ code, highlightedLine }) => {
  const lines = code.split('\n');

  return (
    <div className="w-full h-full bg-transparent text-white resize-none focus:outline-none p-6 overflow-auto">
      <pre className="m-0">
        <code>
          {lines.map((line, index) => (
            <div
              key={index}
              className={`transition-colors duration-200 rounded-sm ${
                highlightedLine === index + 1 ? 'bg-cyan-500/20' : ''
              }`}
            >
              {/* Render a non-breaking space for empty lines to maintain height */}
              {line || '\u00A0'}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
};

export default CodeDisplay;
