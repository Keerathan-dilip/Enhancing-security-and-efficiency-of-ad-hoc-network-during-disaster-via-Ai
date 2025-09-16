import React from 'react';

interface CodeAnalysisPanelProps {
  isLoading: boolean;
  analysis: string | null;
  language: string;
}

const Section: React.FC<{ title: string; content: string[] }> = ({ title, content }) => (
  <div>
    <h4 className="font-semibold text-cyan-300 mb-2">{title}</h4>
    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
      {content.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  </div>
);

const CodeAnalysisPanel: React.FC<CodeAnalysisPanelProps> = ({ isLoading, analysis, language }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 mt-6 flex items-center justify-center h-48">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-cyan-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-cyan-200">Analyzing Code with Gemini...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const sections: { [key: string]: string[] } = {};
  let currentSection = '';

  analysis.split('\n').forEach(line => {
    line = line.trim();
    if (line.startsWith('**') && line.endsWith('**')) {
      currentSection = line.substring(2, line.length - 2);
      sections[currentSection] = [];
    } else if (currentSection && line) {
      const content = line.startsWith('*') ? line.substring(1).trim() : line;
      if (content) sections[currentSection].push(content);
    }
  });

  const hasError = analysis.toLowerCase().includes('error');

  return (
    <div className="bg-gray-800/60 rounded-lg shadow-xl border border-cyan-500/20 p-4 mt-6 animate-fadeIn">
      <h3 className={`text-xl font-bold mb-4 ${hasError ? 'text-red-400' : 'text-cyan-300'}`}>
        AI Code Analysis: <span className="font-mono text-base bg-gray-900 px-2 py-1 rounded">{language.toUpperCase()}</span>
      </h3>
      {hasError && !Object.keys(sections).length ? <p className="text-red-300">{analysis}</p> : null}
      <div className="space-y-4">
        {Object.entries(sections).map(([title, content]) => (
          content.length > 0 && <Section key={title} title={title} content={content} />
        ))}
      </div>
    </div>
  );
};

export default CodeAnalysisPanel;
