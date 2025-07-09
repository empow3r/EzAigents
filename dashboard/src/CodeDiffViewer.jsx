'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  FileText, 
  GitBranch, 
  Plus, 
  Minus, 
  Eye, 
  Download,
  RefreshCw,
  Clock,
  User,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CodeDiffViewer() {
  const [diffs, setDiffs] = useState([]);
  const [selectedDiff, setSelectedDiff] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchDiffs = async () => {
      try {
        // Mock data for demonstration - in real app, this would fetch from agent outputs
        const mockDiffs = [
          {
            id: '1',
            filename: 'src/components/Dashboard.jsx',
            agent: 'claude',
            timestamp: Date.now() - 30000,
            additions: 15,
            deletions: 3,
            oldCode: `export default function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Old Dashboard</h1>
      <p>Basic content</p>
    </div>
  );
}`,
            newCode: `export default function Dashboard() {
  return (
    <div className="dashboard enhanced">
      <motion.h1 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Enhanced Dashboard
      </motion.h1>
      <p>Advanced content with animations</p>
      <div className="stats-grid">
        {/* New stats component */}
      </div>
    </div>
  );
}`,
            language: 'jsx',
            status: 'completed'
          },
          {
            id: '2',
            filename: 'api/agents.js',
            agent: 'gpt',
            timestamp: Date.now() - 120000,
            additions: 8,
            deletions: 2,
            oldCode: `app.get('/api/agents', (req, res) => {
  res.json({ agents: [] });
});`,
            newCode: `app.get('/api/agents', async (req, res) => {
  try {
    const agents = await getActiveAgents();
    res.json({ 
      agents,
      timestamp: Date.now(),
      count: agents.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});`,
            language: 'javascript',
            status: 'completed'
          },
          {
            id: '3',
            filename: 'test/agent.spec.js',
            agent: 'deepseek',
            timestamp: Date.now() - 60000,
            additions: 12,
            deletions: 0,
            oldCode: '',
            newCode: `describe('Agent System', () => {
  it('should initialize agents correctly', async () => {
    const agents = await initializeAgents();
    expect(agents).toHaveLength(5);
    expect(agents[0]).toHaveProperty('id');
    expect(agents[0]).toHaveProperty('status');
  });

  it('should handle agent failures gracefully', async () => {
    const failingAgent = new Agent({ shouldFail: true });
    await expect(failingAgent.process()).rejects.toThrow();
  });
});`,
            language: 'javascript',
            status: 'processing'
          }
        ];
        
        setDiffs(mockDiffs);
        if (!selectedDiff && mockDiffs.length > 0) {
          setSelectedDiff(mockDiffs[0]);
        }
      } catch (error) {
        console.error('Failed to fetch diffs:', error);
      }
    };

    fetchDiffs();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDiffs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedDiff]);

  const getAgentColor = (agent) => {
    const colors = {
      claude: 'text-purple-500',
      gpt: 'text-green-500',
      deepseek: 'text-yellow-500',
      mistral: 'text-blue-500',
      gemini: 'text-red-500'
    };
    return colors[agent] || 'text-gray-500';
  };

  const getAgentIcon = (agent) => {
    return agent === 'deepseek' ? Zap : FileText;
  };

  const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  const generateUnifiedDiff = (oldCode, newCode) => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    const diff = [];
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine !== newLine) {
        if (oldLine && !newLine) {
          diff.push({ type: 'removed', content: oldLine, lineNumber: i + 1 });
        } else if (!oldLine && newLine) {
          diff.push({ type: 'added', content: newLine, lineNumber: i + 1 });
        } else {
          diff.push({ type: 'removed', content: oldLine, lineNumber: i + 1 });
          diff.push({ type: 'added', content: newLine, lineNumber: i + 1 });
        }
      } else if (oldLine) {
        diff.push({ type: 'unchanged', content: oldLine, lineNumber: i + 1 });
      }
    }
    
    return diff;
  };

  const filteredDiffs = diffs.filter(diff => {
    if (filter === 'all') return true;
    return diff.agent === filter;
  });

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🔍 Real-time Code Diff Viewer
            </h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Live agent code changes and modifications
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Agent Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Agents</option>
              <option value="claude">Claude</option>
              <option value="gpt">GPT</option>
              <option value="deepseek">DeepSeek</option>
              <option value="mistral">Mistral</option>
              <option value="gemini">Gemini</option>
            </select>

            {/* Auto-refresh toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg ${
                autoRefresh 
                  ? 'bg-green-500 text-white' 
                  : darkMode 
                    ? 'bg-gray-700 text-gray-300' 
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              <RefreshCw size={20} className={autoRefresh ? 'animate-spin' : ''} />
            </motion.button>

            {/* Theme toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${
                darkMode 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-gray-800 text-white'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Diff List Sidebar */}
        <div className={`w-1/3 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-y-auto`}>
          <div className="p-4">
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Changes ({filteredDiffs.length})
            </h2>
            
            <div className="space-y-3">
              <AnimatePresence>
                {filteredDiffs.map((diff, index) => {
                  const AgentIcon = getAgentIcon(diff.agent);
                  
                  return (
                    <motion.div
                      key={diff.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedDiff(diff)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedDiff?.id === diff.id
                          ? darkMode
                            ? 'bg-blue-900 border-blue-600'
                            : 'bg-blue-50 border-blue-300'
                          : darkMode
                            ? 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          <AgentIcon size={16} className={getAgentColor(diff.agent)} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {diff.filename}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              by {diff.agent.toUpperCase()}
                            </div>
                          </div>
                        </div>
                        
                        <div className={`px-2 py-1 rounded text-xs ${
                          diff.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {diff.status}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-4 text-xs">
                          <span className="flex items-center text-green-500">
                            <Plus size={12} className="mr-1" />
                            {diff.additions}
                          </span>
                          <span className="flex items-center text-red-500">
                            <Minus size={12} className="mr-1" />
                            {diff.deletions}
                          </span>
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatTimestamp(diff.timestamp)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Diff Viewer */}
        <div className="flex-1 overflow-hidden">
          {selectedDiff ? (
            <div className="h-full flex flex-col">
              {/* File header */}
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className={getAgentColor(selectedDiff.agent)} size={20} />
                    <div>
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedDiff.filename}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Modified by {selectedDiff.agent.toUpperCase()} • {formatTimestamp(selectedDiff.timestamp)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center text-green-500">
                        <Plus size={16} className="mr-1" />
                        {selectedDiff.additions} additions
                      </span>
                      <span className="flex items-center text-red-500">
                        <Minus size={16} className="mr-1" />
                        {selectedDiff.deletions} deletions
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code diff */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 h-full">
                  {/* Before */}
                  <div className={`${darkMode ? 'bg-gray-900' : 'bg-red-50'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className={`px-4 py-2 text-sm font-medium ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      Before
                    </div>
                    <SyntaxHighlighter
                      language={selectedDiff.language}
                      style={darkMode ? oneDark : oneLight}
                      showLineNumbers
                      wrapLines
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: 'transparent',
                        fontSize: '14px'
                      }}
                    >
                      {selectedDiff.oldCode}
                    </SyntaxHighlighter>
                  </div>

                  {/* After */}
                  <div className={darkMode ? 'bg-gray-900' : 'bg-green-50'}>
                    <div className={`px-4 py-2 text-sm font-medium ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      After
                    </div>
                    <SyntaxHighlighter
                      language={selectedDiff.language}
                      style={darkMode ? oneDark : oneLight}
                      showLineNumbers
                      wrapLines
                      customStyle={{
                        margin: 0,
                        padding: '1rem',
                        background: 'transparent',
                        fontSize: '14px'
                      }}
                    >
                      {selectedDiff.newCode}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`h-full flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="text-center">
                <FileText size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a diff to view changes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}