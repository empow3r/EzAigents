import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

const PriorityQueueController = () => {
  const [queueStats, setQueueStats] = useState(null);
  const [controlStatus, setControlStatus] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isReprioritizing, setIsReprioritizing] = useState(false);
  const [isAddingContext, setIsAddingContext] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const priorityLevels = [
    { value: 'critical', label: 'Critical', color: 'bg-red-500', weight: 10 },
    { value: 'high', label: 'High', color: 'bg-orange-500', weight: 5 },
    { value: 'normal', label: 'Normal', color: 'bg-green-500', weight: 1 },
    { value: 'low', label: 'Low', color: 'bg-blue-500', weight: 0.5 },
    { value: 'deferred', label: 'Deferred', color: 'bg-gray-500', weight: 0.1 }
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, controlRes] = await Promise.all([
        fetch('/api/queue-stats'),
        fetch('/api/queue-control')
      ]);
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setQueueStats(statsData);
      }
      
      if (controlRes.ok) {
        const controlData = await controlRes.json();
        setControlStatus(controlData.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleQueueControl = async (action, queue) => {
    setLoading(true);
    try {
      const response = await fetch('/api/queue-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, queue }),
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleReprioritize = async (taskId, queue, newPriority, reason) => {
    setLoading(true);
    try {
      const response = await fetch('/api/queue-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reprioritize',
          taskId,
          queue,
          newPriority,
          reason
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setIsReprioritizing(false);
        setSelectedTask(null);
        await fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleAddContext = async (taskId, queue, additionalContext, additionalPrompt) => {
    setLoading(true);
    try {
      const response = await fetch('/api/queue-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_context',
          taskId,
          queue,
          additionalContext,
          additionalPrompt
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setIsAddingContext(false);
        setSelectedTask(null);
        await fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const emergencyStop = async () => {
    if (!confirm('Are you sure you want to activate emergency stop? This will halt all queue processing.')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/queue-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'emergency_stop',
          reason: 'Manual emergency stop from dashboard'
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const getPriorityColor = (priority) => {
    const level = priorityLevels.find(p => p.value === priority);
    return level ? level.color : 'bg-gray-400';
  };

  const getPriorityWeight = (priority) => {
    const level = priorityLevels.find(p => p.value === priority);
    return level ? level.weight : 0;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Priority Queue Controller</h2>
        
        {/* Emergency Controls */}
        <div className="flex space-x-2">
          {controlStatus?.emergencyStop && (
            <div className="flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-lg">
              <Icons.AlertTriangle className="w-4 h-4 mr-2" />
              EMERGENCY STOP ACTIVE
            </div>
          )}
          
          <button
            onClick={emergencyStop}
            disabled={loading || controlStatus?.emergencyStop}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            <Icons.Square className="w-4 h-4 mr-2" />
            Emergency Stop
          </button>
        </div>
      </div>

      {/* Queue Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {queueStats?.queues?.map((queue) => (
          <div key={queue.model} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">{queue.model}</h3>
              <div className="flex space-x-2">
                {controlStatus?.queues?.[queue.model]?.paused ? (
                  <button
                    onClick={() => handleQueueControl('resume', `queue:${queue.model}`)}
                    disabled={loading}
                    className="flex items-center px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    <Icons.Play className="w-3 h-3 mr-1" />
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={() => handleQueueControl('pause', `queue:${queue.model}`)}
                    disabled={loading}
                    className="flex items-center px-2 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                  >
                    <Icons.Pause className="w-3 h-3 mr-1" />
                    Pause
                  </button>
                )}
                
                <button
                  onClick={() => handleQueueControl('requeue_failed', `queue:${queue.model}`)}
                  disabled={loading}
                  className="flex items-center px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  <Icons.RefreshCw className="w-3 h-3 mr-1" />
                  Retry Failed
                </button>
              </div>
            </div>

            {/* Queue Status */}
            <div className="text-sm text-gray-600 mb-2">
              <div>Total: {queue.pendingCount} pending, {queue.processingCount} processing</div>
              {queue.failedCount > 0 && (
                <div className="text-red-600">Failed: {queue.failedCount}</div>
              )}
              {controlStatus?.queues?.[queue.model]?.paused && (
                <div className="text-yellow-600">
                  ⏸️ Paused {Math.round(controlStatus.queues[queue.model].pausedDuration / 1000)}s ago
                </div>
              )}
            </div>

            {/* Priority Breakdown */}
            {queue.enhanced && queue.byPriority && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500">Priority Breakdown:</div>
                {Object.entries(queue.byPriority).map(([priority, stats]) => (
                  stats.pending > 0 && (
                    <div key={priority} className="flex items-center justify-between text-xs">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${getPriorityColor(priority)}`}></div>
                        <span className="capitalize">{priority}</span>
                      </div>
                      <span className="font-medium">{stats.pending}</span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Task List with Actions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-4">Active Tasks</h3>
        
        {queueStats?.queues?.map((queue) => (
          queue.pending?.length > 0 && (
            <div key={queue.model} className="mb-4">
              <h4 className="font-medium text-gray-600 mb-2">{queue.model}</h4>
              <div className="space-y-2">
                {queue.pending.slice(0, 5).map((task, index) => (
                  <div key={task.id || index} className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <div className={`w-2 h-2 rounded-full mr-2 ${getPriorityColor(task.priority)}`}></div>
                          <span className="font-medium text-sm">{task.file || 'Unknown file'}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            Priority: {task.priority} (Weight: {getPriorityWeight(task.priority)})
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {task.prompt || 'No prompt available'}
                        </div>
                        {task.additionalContext && (
                          <div className="text-xs text-blue-600 mt-1">
                            ✓ Additional context added
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedTask({ ...task, queue: `queue:${queue.model}` });
                            setIsReprioritizing(true);
                          }}
                          className="flex items-center px-2 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600"
                        >
                          <Icons.Settings className="w-3 h-3 mr-1" />
                          Reprioritize
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedTask({ ...task, queue: `queue:${queue.model}` });
                            setIsAddingContext(true);
                          }}
                          className="flex items-center px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
                        >
                          <Icons.Plus className="w-3 h-3 mr-1" />
                          Add Context
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {queue.pending.length > 5 && (
                  <div className="text-xs text-gray-500 text-center">
                    ... and {queue.pending.length - 5} more tasks
                  </div>
                )}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Reprioritization Modal */}
      {isReprioritizing && selectedTask && (
        <ReprioritizeModal
          task={selectedTask}
          onSave={handleReprioritize}
          onCancel={() => {
            setIsReprioritizing(false);
            setSelectedTask(null);
          }}
          priorityLevels={priorityLevels}
        />
      )}

      {/* Add Context Modal */}
      {isAddingContext && selectedTask && (
        <AddContextModal
          task={selectedTask}
          onSave={handleAddContext}
          onCancel={() => {
            setIsAddingContext(false);
            setSelectedTask(null);
          }}
        />
      )}

      {/* Recent Actions */}
      {controlStatus?.recentActions && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-4">Recent Control Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Reprioritizations */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Reprioritizations</h4>
              <div className="space-y-1">
                {controlStatus.recentActions.reprioritizations.slice(0, 3).map((action, index) => (
                  <div key={index} className="text-xs text-gray-600">
                    {action.taskId?.substring(-8)} - {action.oldPriority} → {action.newPriority}
                    <span className="text-gray-400 ml-2">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Recent Context Additions */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Context Additions</h4>
              <div className="space-y-1">
                {controlStatus.recentActions.contextAdditions.slice(0, 3).map((action, index) => (
                  <div key={index} className="text-xs text-gray-600">
                    {action.taskId?.substring(-8)} - Context added
                    <span className="text-gray-400 ml-2">
                      {new Date(action.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reprioritization Modal Component
const ReprioritizeModal = ({ task, onSave, onCancel, priorityLevels }) => {
  const [newPriority, setNewPriority] = useState(task.priority);
  const [reason, setReason] = useState('');

  const handleSave = () => {
    if (newPriority !== task.priority) {
      onSave(task.id, task.queue, newPriority, reason);
    } else {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Reprioritize Task</h3>
        
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">
            File: {task.file}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Current Priority: <span className="capitalize font-medium">{task.priority}</span>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Priority
          </label>
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            {priorityLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label} (Weight: {level.weight})
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows="3"
            placeholder="Why is this reprioritization needed?"
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-indigo-500 text-white py-2 rounded-md hover:bg-indigo-600"
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Context Modal Component
const AddContextModal = ({ task, onSave, onCancel }) => {
  const [additionalContext, setAdditionalContext] = useState('');
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  const handleSave = () => {
    if (additionalContext.trim() || additionalPrompt.trim()) {
      onSave(task.id, task.queue, additionalContext, additionalPrompt);
    } else {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <h3 className="text-lg font-semibold mb-4">Add Additional Context</h3>
        
        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">
            File: {task.file}
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Current Prompt: {task.prompt}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Context/Information
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows="3"
            placeholder="Add any additional context or information for this task..."
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Prompt Instructions
          </label>
          <textarea
            value={additionalPrompt}
            onChange={(e) => setAdditionalPrompt(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows="3"
            placeholder="Add specific instructions or prompts to append to the task..."
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-purple-500 text-white py-2 rounded-md hover:bg-purple-600"
          >
            Add Context
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriorityQueueController;