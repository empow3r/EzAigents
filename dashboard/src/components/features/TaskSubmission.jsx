'use client';
import React, { useState } from 'react';

const TaskSubmission = () => {
  const [task, setTask] = useState({
    prompt: '',
    file: '',
    model: 'claude-3-opus',
    priority: 'normal',
    context: '',
    workflow: '',
    collaborative: false,
    agents: []
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const models = [
    { value: 'claude-3-opus', label: 'Claude (Architecture)', icon: '🧠' },
    { value: 'gpt-4o', label: 'GPT-4o (Backend)', icon: '⚡' },
    { value: 'deepseek-coder', label: 'DeepSeek (Testing)', icon: '🔍' },
    { value: 'mistral-large', label: 'Mistral (Docs)', icon: '📝' },
    { value: 'gemini-pro', label: 'Gemini (Analysis)', icon: '💎' },
    { value: 'kimi-2', label: 'Kimi (Long Context)', icon: '📚' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-gray-600' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task.prompt.trim()) {
      setMessage('Please enter a task prompt');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`✅ Task queued successfully! Queue position: ${result.position || 'N/A'}`);
        setTask({ ...task, prompt: '', file: '' });
      } else {
        const error = await response.json();
        setMessage(`❌ Failed to queue task: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Submit Task</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Task Description
          </label>
          <textarea
            value={task.prompt}
            onChange={(e) => setTask({ ...task, prompt: e.target.value })}
            placeholder="Describe what you want the agent to do..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            disabled={loading}
          />
        </div>

        {/* File Path (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Path (Optional)
          </label>
          <input
            type="text"
            value={task.file}
            onChange={(e) => setTask({ ...task, file: e.target.value })}
            placeholder="e.g., src/components/Button.jsx"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <select
              value={task.model}
              onChange={(e) => setTask({ ...task, model: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {models.map(model => (
                <option key={model.value} value={model.value}>
                  {model.icon} {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={task.priority}
              onChange={(e) => setTask({ ...task, priority: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-sm">Advanced Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context Template
              </label>
              <select
                value={task.context}
                onChange={(e) => setTask({ ...task, context: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">No context</option>
                <option value="project">Project Context</option>
                <option value="codebase">Codebase Analysis</option>
                <option value="requirements">Requirements Doc</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Template
              </label>
              <select
                value={task.workflow}
                onChange={(e) => setTask({ ...task, workflow: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Single agent task</option>
                <option value="code-review">Code Review Workflow</option>
                <option value="feature-development">Feature Development</option>
                <option value="bug-fix">Bug Fix Workflow</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="collaborative"
              checked={task.collaborative}
              onChange={(e) => setTask({ ...task, collaborative: e.target.checked })}
              disabled={loading}
            />
            <label htmlFor="collaborative" className="text-sm text-gray-700">
              Enable multi-agent collaboration
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !task.prompt.trim()}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            loading || !task.prompt.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting...
            </div>
          ) : (
            task.collaborative ? 'Start Collaborative Task' : 'Submit Task'
          )}
        </button>
      </form>

      {/* Status Message */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.startsWith('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default TaskSubmission;