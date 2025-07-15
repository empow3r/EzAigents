'use client';
import React from 'react';

const QueueStatistics = ({ queues = [], mode = 'default' }) => {
  const getQueueHealthColor = (pendingCount, failedCount) => {
    if (failedCount > 10) return 'text-red-600';
    if (pendingCount > 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const totalPending = queues.reduce((sum, q) => sum + (q.pendingCount || 0), 0);
  const totalProcessing = queues.reduce((sum, q) => sum + (q.processingCount || 0), 0);
  const totalFailed = queues.reduce((sum, q) => sum + (q.failedCount || 0), 0);

  if (mode === 'summary') {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Queue Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Pending</span>
            <span className="font-medium">{totalPending}</span>
          </div>
          <div className="flex justify-between">
            <span>Processing</span>
            <span className="font-medium">{totalProcessing}</span>
          </div>
          <div className="flex justify-between">
            <span>Failed</span>
            <span className="font-medium text-red-600">{totalFailed}</span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'compact') {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3">Queues</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{totalPending}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{totalProcessing}</div>
            <div className="text-xs text-gray-600">Processing</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
            <div className="text-xs text-gray-600">Failed</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Queue Statistics</h2>
        <div className="text-sm text-gray-500">
          {queues.length} queue{queues.length !== 1 ? 's' : ''} monitored
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{totalPending}</div>
          <div className="text-sm text-blue-800">Total Pending</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{totalProcessing}</div>
          <div className="text-sm text-green-800">Processing</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
          <div className="text-sm text-red-800">Failed</div>
        </div>
      </div>

      {/* Individual Queue Details */}
      <div className="space-y-3">
        {queues.map(queue => (
          <div key={queue.model} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getQueueHealthColor(queue.pendingCount, queue.failedCount)}`}></div>
              <div>
                <div className="font-medium capitalize">{queue.model.replace('-', ' ')}</div>
                <div className="text-sm text-gray-600">
                  {queue.enhanced ? 'Enhanced Queuing' : 'Legacy Mode'}
                </div>
              </div>
            </div>
            <div className="flex space-x-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-blue-600">{queue.pendingCount}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{queue.processingCount}</div>
                <div className="text-xs text-gray-500">Processing</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-red-600">{queue.failedCount}</div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueueStatistics;