'use client';
import React, { useState, useEffect } from 'react';

const SimpleWorkingDashboard = () => {
  const [agents, setAgents] = useState([]);
  const [taskText, setTaskText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch agent status
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agent-stats');
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || [
            { id: 'claude', name: 'Claude', status: 'active', tasks: 3 },
            { id: 'gpt', name: 'GPT-4o', status: 'idle', tasks: 0 },
            { id: 'deepseek', name: 'DeepSeek', status: 'active', tasks: 1 },
            { id: 'mistral', name: 'Mistral', status: 'idle', tasks: 0 },
            { id: 'gemini', name: 'Gemini', status: 'active', tasks: 2 }
          ]);
        }
      } catch (error) {
        // Fallback data if API fails
        setAgents([
          { id: 'claude', name: 'Claude', status: 'active', tasks: 3 },
          { id: 'gpt', name: 'GPT-4o', status: 'idle', tasks: 0 },
          { id: 'deepseek', name: 'DeepSeek', status: 'active', tasks: 1 },
          { id: 'mistral', name: 'Mistral', status: 'idle', tasks: 0 },
          { id: 'gemini', name: 'Gemini', status: 'active', tasks: 2 }
        ]);
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Submit task
  const handleSubmitTask = async () => {
    if (!taskText.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: 'user-input.txt',
          prompt: taskText,
          priority: 'normal'
        })
      });
      
      if (response.ok) {
        setTaskText('');
        alert('Task submitted successfully!');
      } else {
        alert('Failed to submit task');
      }
    } catch (error) {
      alert('Error submitting task: ' + error.message);
    }
    setIsSubmitting(false);
  };

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalTasks = agents.reduce((sum, a) => sum + a.tasks, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Ez Aigents Dashboard</h1>
        <p className="text-gray-400">Simple agent monitoring and task submission</p>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400">{activeAgents}</div>
            <div className="text-gray-400">Active Agents</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-400">{totalTasks}</div>
            <div className="text-gray-400">Total Tasks</div>
          </div>
        </div>

        {/* Agent List */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Agent Status</h2>
          <div className="space-y-3">
            {agents.map(agent => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    agent.status === 'active' ? 'bg-green-400' : 'bg-gray-500'
                  }`} />
                  <span className="font-medium">{agent.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">{agent.tasks} tasks</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    agent.status === 'active' 
                      ? 'bg-green-900 text-green-400' 
                      : 'bg-gray-600 text-gray-400'
                  }`}>
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Input */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Submit New Task</h2>
          <div className="space-y-4">
            <textarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Enter your task description here..."
              className="w-full h-32 p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSubmitTask}
              disabled={isSubmitting || !taskText.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleWorkingDashboard;