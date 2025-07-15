import React, { memo, useMemo } from 'react';

// Optimized agent card with memoization
const OptimizedAgentCard = memo(({ agent, onAction }) => {
  const statusColor = useMemo(() => {
    switch (agent.status) {
      case 'idle': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, [agent.status]);

  const lastActiveTime = useMemo(() => {
    if (!agent.lastActive) return 'Never';
    const diff = Date.now() - new Date(agent.lastActive).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }, [agent.lastActive]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{agent.type}</h3>
          <p className="text-sm text-gray-500">ID: {agent.id}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {agent.status}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tasks Completed:</span>
          <span className="font-medium">{agent.tasksCompleted || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last Active:</span>
          <span className="font-medium">{lastActiveTime}</span>
        </div>
        {agent.currentTask && (
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-600">Current Task:</p>
            <p className="text-sm font-medium truncate">{agent.currentTask}</p>
          </div>
        )}
      </div>
      
      {onAction && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onAction('restart', agent.id)}
            className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Restart
          </button>
          <button
            onClick={() => onAction('logs', agent.id)}
            className="flex-1 px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Logs
          </button>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.agent.id === nextProps.agent.id &&
    prevProps.agent.status === nextProps.agent.status &&
    prevProps.agent.lastActive === nextProps.agent.lastActive &&
    prevProps.agent.currentTask === nextProps.agent.currentTask &&
    prevProps.agent.tasksCompleted === nextProps.agent.tasksCompleted
  );
});

OptimizedAgentCard.displayName = 'OptimizedAgentCard';

export default OptimizedAgentCard;