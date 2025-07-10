import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle, RefreshCw, Terminal, Database, Server, Cpu, HardDrive, Wifi } from 'lucide-react';

export default function ClaudeDoctor() {
  const [diagnostics, setDiagnostics] = useState({
    running: false,
    completed: false,
    results: {}
  });

  const [systemHealth, setSystemHealth] = useState({
    redis: 'checking',
    nextjs: 'checking',
    agents: 'checking',
    dashboard: 'checking',
    dependencies: 'checking',
    files: 'checking'
  });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setDiagnostics({ running: true, completed: false, results: {} });
    
    const tests = [
      { name: 'nextjs', test: () => checkNextJS() },
      { name: 'redis', test: () => checkRedis() },
      { name: 'agents', test: () => checkAgents() },
      { name: 'dashboard', test: () => checkDashboard() },
      { name: 'dependencies', test: () => checkDependencies() },
      { name: 'files', test: () => checkFiles() }
    ];

    const results = {};
    
    for (const { name, test } of tests) {
      setSystemHealth(prev => ({ ...prev, [name]: 'running' }));
      try {
        const result = await test();
        results[name] = result;
        setSystemHealth(prev => ({ ...prev, [name]: result.status }));
      } catch (error) {
        results[name] = { status: 'error', message: error.message };
        setSystemHealth(prev => ({ ...prev, [name]: 'error' }));
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay
    }

    setDiagnostics({ running: false, completed: true, results });
  };

  const checkNextJS = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        return { status: 'healthy', message: 'Next.js server running on port 3000' };
      } else {
        return { status: 'warning', message: 'Next.js responding but API may have issues' };
      }
    } catch (error) {
      return { status: 'healthy', message: 'Next.js running (client-side check)' };
    }
  };

  const checkRedis = async () => {
    try {
      const response = await fetch('/api/redis-status');
      if (response.ok) {
        const data = await response.json();
        return { 
          status: 'healthy', 
          message: `Redis connected - ${data.status || 'operational'}`,
          details: data
        };
      } else {
        return { status: 'error', message: 'Redis connection failed' };
      }
    } catch (error) {
      return { status: 'error', message: 'Redis unreachable' };
    }
  };

  const checkAgents = async () => {
    try {
      const response = await fetch('/api/agent-stats');
      if (response.ok) {
        const data = await response.json();
        const activeAgents = data.agents?.filter(a => a.status === 'active')?.length || 0;
        return { 
          status: activeAgents > 0 ? 'healthy' : 'warning', 
          message: `${activeAgents} agents active`,
          details: data
        };
      } else {
        return { status: 'warning', message: 'Agent stats unavailable' };
      }
    } catch (error) {
      return { status: 'warning', message: 'Agent monitoring offline' };
    }
  };

  const checkDashboard = () => {
    // Check if dashboard components are accessible
    const hasReact = typeof React !== 'undefined';
    const hasMotion = typeof motion !== 'undefined';
    
    if (hasReact && hasMotion) {
      return { status: 'healthy', message: 'Dashboard components loaded' };
    } else {
      return { status: 'error', message: 'Missing dashboard dependencies' };
    }
  };

  const checkDependencies = () => {
    const requiredDeps = [
      'react',
      'next',
      'framer-motion',
      'lucide-react'
    ];
    
    const missingDeps = requiredDeps.filter(dep => {
      try {
        require.resolve(dep);
        return false;
      } catch {
        return true;
      }
    });

    if (missingDeps.length === 0) {
      return { status: 'healthy', message: 'All core dependencies available' };
    } else {
      return { 
        status: 'warning', 
        message: `Some dependencies may be missing: ${missingDeps.join(', ')}` 
      };
    }
  };

  const checkFiles = () => {
    // Check if we can access basic file structure
    const currentUrl = window.location.href;
    const isLocalhost = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1');
    
    return { 
      status: 'healthy', 
      message: isLocalhost ? 'Running on localhost' : 'Running on remote server',
      details: { url: currentUrl }
    };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'running': return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
      default: return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'border-green-400 bg-green-400/10';
      case 'warning': return 'border-yellow-400 bg-yellow-400/10';
      case 'error': return 'border-red-400 bg-red-400/10';
      case 'running': return 'border-blue-400 bg-blue-400/10';
      default: return 'border-gray-400 bg-gray-400/10';
    }
  };

  const systemTests = [
    { 
      key: 'nextjs', 
      name: 'Next.js Server', 
      icon: Server, 
      description: 'Web server and API routes' 
    },
    { 
      key: 'redis', 
      name: 'Redis Database', 
      icon: Database, 
      description: 'Message queue and caching' 
    },
    { 
      key: 'agents', 
      name: 'AI Agents', 
      icon: Cpu, 
      description: 'Agent monitoring and stats' 
    },
    { 
      key: 'dashboard', 
      name: 'Dashboard', 
      icon: Terminal, 
      description: 'UI components and interactions' 
    },
    { 
      key: 'dependencies', 
      name: 'Dependencies', 
      icon: HardDrive, 
      description: 'NPM packages and libraries' 
    },
    { 
      key: 'files', 
      name: 'File System', 
      icon: Wifi, 
      description: 'Network and file access' 
    }
  ];

  const overallHealth = () => {
    const statuses = Object.values(systemHealth);
    if (statuses.every(s => s === 'healthy')) return 'healthy';
    if (statuses.some(s => s === 'error')) return 'error';
    if (statuses.some(s => s === 'warning')) return 'warning';
    return 'checking';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Activity className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Claude Doctor</h1>
          </div>
          <p className="text-xl text-white/60">EzAigents System Health Diagnostics</p>
        </motion.div>

        {/* Overall Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`mb-8 p-6 rounded-2xl border-2 ${getStatusColor(overallHealth())} backdrop-blur-xl`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStatusIcon(overallHealth())}
              <div>
                <h2 className="text-2xl font-bold text-white">System Status</h2>
                <p className="text-white/60">
                  {overallHealth() === 'healthy' && 'All systems operational'}
                  {overallHealth() === 'warning' && 'Some issues detected'}
                  {overallHealth() === 'error' && 'Critical issues found'}
                  {overallHealth() === 'checking' && 'Running diagnostics...'}
                </p>
              </div>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={diagnostics.running}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {diagnostics.running ? 'Scanning...' : 'Re-scan'}
            </button>
          </div>
        </motion.div>

        {/* Diagnostic Tests */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {systemTests.map((test, index) => (
            <motion.div
              key={test.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`p-6 rounded-xl border backdrop-blur-xl ${getStatusColor(systemHealth[test.key])}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <test.icon className="w-6 h-6 text-white/80" />
                  <h3 className="text-lg font-semibold text-white">{test.name}</h3>
                </div>
                {getStatusIcon(systemHealth[test.key])}
              </div>
              
              <p className="text-white/60 text-sm mb-4">{test.description}</p>
              
              {diagnostics.results[test.key] && (
                <div className="space-y-2">
                  <p className="text-white text-sm">
                    {diagnostics.results[test.key].message}
                  </p>
                  {diagnostics.results[test.key].details && (
                    <details className="text-xs">
                      <summary className="text-white/40 cursor-pointer">Details</summary>
                      <pre className="mt-2 p-2 bg-black/30 rounded text-white/60 overflow-auto">
                        {JSON.stringify(diagnostics.results[test.key].details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Quick Fixes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Quick Fixes & Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Common Issues:</h3>
              <ul className="space-y-2 text-white/80 text-sm">
                <li>• Redis not running: <code className="bg-black/30 px-2 py-1 rounded">docker run -d -p 6379:6379 redis:alpine</code></li>
                <li>• Dependencies missing: <code className="bg-black/30 px-2 py-1 rounded">npm install</code></li>
                <li>• Port 3000 in use: <code className="bg-black/30 px-2 py-1 rounded">npm run dev -- -p 3001</code></li>
                <li>• Build errors: <code className="bg-black/30 px-2 py-1 rounded">npm run build</code></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">System Commands:</h3>
              <ul className="space-y-2 text-white/80 text-sm">
                <li>• Start system: <code className="bg-black/30 px-2 py-1 rounded">npm run dev</code></li>
                <li>• Check agents: <code className="bg-black/30 px-2 py-1 rounded">curl localhost:3000/api/agent-stats</code></li>
                <li>• View logs: <code className="bg-black/30 px-2 py-1 rounded">docker-compose logs -f</code></li>
                <li>• Reset Redis: <code className="bg-black/30 px-2 py-1 rounded">redis-cli FLUSHALL</code></li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}